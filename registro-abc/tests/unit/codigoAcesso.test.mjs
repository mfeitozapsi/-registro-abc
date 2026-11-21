import test from "node:test";
import assert from "node:assert/strict";
import {
  extrairCodigoDoHash, obterCodigoDeEntrada, lerCodigoArmazenado,
  guardarCodigo, limparCodigoArmazenado,
} from "../../src/features/acesso/codigoAcesso.js";

const CODIGO = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-aBcDe"; // FICTÍCIO (43 caracteres)
const OUTRO  = "ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210-_AbCdE"; // FICTÍCIO (43 caracteres)

function armazenamentoFalso(inicial = {}) {
  const dados = { ...inicial };
  return {
    dados,
    getItem: (k) => (k in dados ? dados[k] : null),
    setItem: (k, v) => { dados[k] = String(v); },
    removeItem: (k) => { delete dados[k]; },
  };
}
const armazenamentoQuebrado = () => ({
  getItem() { throw new Error("bloqueado"); },
  setItem() { throw new Error("bloqueado"); },
  removeItem() { throw new Error("bloqueado"); },
});

test("link válido: extrai o código", () => {
  assert.deepEqual(extrairCodigoDoHash(`#/f/${CODIGO}`), { presente: true, codigo: CODIGO });
});

test("link malformado: presente, mas sem código", () => {
  for (const hash of ["#/f/abc", "#/f/", `#/f/${CODIGO}x`, `#/f/${CODIGO.slice(1)}`, "#/f/código com espaço e acentuação 123456789012"]) {
    assert.deepEqual(extrairCodigoDoHash(hash), { presente: true, codigo: null }, hash);
  }
});

test("endereço sem link de acesso", () => {
  for (const hash of ["", "#", "#/outra/rota", undefined, null]) {
    assert.deepEqual(extrairCodigoDoHash(hash), { presente: false, codigo: null });
  }
});

test("entrada por link: usa o código, guarda no aparelho e limpa a barra de endereço", () => {
  const storage = armazenamentoFalso();
  let urlLimpa = 0;
  const r = obterCodigoDeEntrada({ hash: `#/f/${CODIGO}`, storage, aoLimparUrl: () => urlLimpa++ });
  assert.deepEqual(r, { origem: "link", codigo: CODIGO });
  assert.equal(urlLimpa, 1);
  assert.equal(lerCodigoArmazenado(storage), CODIGO);
});

test("link novo substitui o código guardado", () => {
  const storage = armazenamentoFalso();
  guardarCodigo(OUTRO, storage);
  obterCodigoDeEntrada({ hash: `#/f/${CODIGO}`, storage, aoLimparUrl: () => {} });
  assert.equal(lerCodigoArmazenado(storage), CODIGO);
});

test("sem link no endereço: usa o código guardado (família que volta ao app)", () => {
  const storage = armazenamentoFalso();
  guardarCodigo(CODIGO, storage);
  let urlLimpa = 0;
  const r = obterCodigoDeEntrada({ hash: "", storage, aoLimparUrl: () => urlLimpa++ });
  assert.deepEqual(r, { origem: "armazenado", codigo: CODIGO });
  assert.equal(urlLimpa, 0);
});

test("sem link e sem código guardado", () => {
  const r = obterCodigoDeEntrada({ hash: "", storage: armazenamentoFalso(), aoLimparUrl: () => {} });
  assert.deepEqual(r, { origem: "nenhum", codigo: null });
});

test("link malformado não é guardado e a barra de endereço é limpa", () => {
  const storage = armazenamentoFalso();
  let urlLimpa = 0;
  const r = obterCodigoDeEntrada({ hash: "#/f/abc", storage, aoLimparUrl: () => urlLimpa++ });
  assert.deepEqual(r, { origem: "link", codigo: null });
  assert.equal(urlLimpa, 1);
  assert.equal(Object.keys(storage.dados).length, 0);
});

test("valor corrompido no armazenamento é ignorado", () => {
  const storage = armazenamentoFalso({ "registro-abc:acesso": "lixo" });
  assert.equal(lerCodigoArmazenado(storage), null);
});

test("os códigos fictícios dos testes têm 43 caracteres", () => {
  assert.equal(CODIGO.length, 43);
  assert.equal(OUTRO.length, 43);
});

test("limpar remove o código guardado", () => {
  const storage = armazenamentoFalso();
  guardarCodigo(CODIGO, storage);
  limparCodigoArmazenado(storage);
  assert.equal(lerCodigoArmazenado(storage), null);
});

test("armazenamento bloqueado pelo navegador não derruba o app", () => {
  const storage = armazenamentoQuebrado();
  const r = obterCodigoDeEntrada({ hash: `#/f/${CODIGO}`, storage, aoLimparUrl: () => {} });
  assert.deepEqual(r, { origem: "link", codigo: CODIGO });
  assert.equal(lerCodigoArmazenado(storage), null);
  assert.doesNotThrow(() => limparCodigoArmazenado(storage));
});
