import test from "node:test";
import assert from "node:assert/strict";
import { criarSalvador } from "../../src/features/registros/salvador.js";

const esperar = () => { let liberar; const p = new Promise((r) => (liberar = r)); return { p, liberar }; };

test("salvamento bem-sucedido devolve a resposta do servidor", async () => {
  const s = criarSalvador(async () => ({ ok: true, id: "x" }));
  assert.deepEqual(await s.salvar({}), { ok: true, id: "x" });
});

test("envio duplicado: chamadas durante o salvamento são ignoradas", async () => {
  const gate = esperar();
  let chamadas = 0;
  const s = criarSalvador(async () => { chamadas++; await gate.p; return { ok: true }; });

  const primeira = s.salvar({});
  assert.equal(s.ocupado, true);
  const segunda = await s.salvar({});
  const terceira = await s.salvar({});
  assert.deepEqual(segunda, { ignorado: true });
  assert.deepEqual(terceira, { ignorado: true });
  assert.equal(chamadas, 1, "o servidor deve receber uma única chamada");

  gate.liberar();
  assert.deepEqual(await primeira, { ok: true });
  assert.equal(s.ocupado, false);
});

test("depois de uma falha, é possível tentar de novo", async () => {
  let n = 0;
  const s = criarSalvador(async () => (++n === 1 ? { ok: false, erro: "falha_de_comunicacao" } : { ok: true }));
  assert.equal((await s.salvar({})).ok, false);
  assert.equal(s.ocupado, false);
  assert.equal((await s.salvar({})).ok, true);
  assert.equal(n, 2);
});

test("exceção inesperada vira falha de comunicação e libera nova tentativa", async () => {
  const s = criarSalvador(async () => { throw new Error("detalhe técnico"); });
  const r = await s.salvar({});
  assert.deepEqual(r, { ok: false, erro: "falha_de_comunicacao" });
  assert.equal(s.ocupado, false);
});

test("repassa os argumentos ao executor", async () => {
  let recebido;
  const s = criarSalvador(async (...a) => { recebido = a; return { ok: true }; });
  await s.salvar({ antecedente: "a" }, 2);
  assert.deepEqual(recebido, [{ antecedente: "a" }, 2]);
});
