import test from "node:test";
import assert from "node:assert/strict";
import { estadoPelaResposta } from "../../src/features/acesso/estadoAcesso.js";

test("código válido libera o formulário", () => {
  assert.equal(estadoPelaResposta({ ok: true }), "valido");
});
test("código inválido ou revogado (o servidor responde igual)", () => {
  assert.equal(estadoPelaResposta({ ok: false, erro: "link_invalido" }), "invalido");
});
test("excesso de tentativas", () => {
  assert.equal(estadoPelaResposta({ ok: false, erro: "muitas_tentativas" }), "bloqueado");
});
test("app sem configuração", () => {
  assert.equal(estadoPelaResposta({ ok: false, erro: "nao_configurado" }), "indisponivel");
});
test("falha de comunicação e respostas inesperadas permitem tentar de novo", () => {
  for (const r of [{ ok: false, erro: "falha_de_comunicacao" }, { ok: false }, {}, null, undefined, "x", { ok: "true" }]) {
    assert.equal(estadoPelaResposta(r), "erro", JSON.stringify(r));
  }
});
test("nenhuma resposta duvidosa libera o acesso", () => {
  for (const r of [{ ok: "true" }, { ok: 1 }, { ok: false, erro: "link_invalido" }, { erro: "x" }]) {
    assert.notEqual(estadoPelaResposta(r), "valido");
  }
});
