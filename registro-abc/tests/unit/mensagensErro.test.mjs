import test from "node:test";
import assert from "node:assert/strict";
import { mensagemDeErroAoSalvar } from "../../src/features/registros/mensagensErro.js";

const ERROS = ["falha_de_comunicacao", "nao_configurado", "link_invalido", "muitas_tentativas",
  "data_invalida", "texto_muito_longo", "registro_vazio", "limite_diario"];
const TERMOS_TECNICOS = /supabase|rpc|p_codigo|sql|postgres|exception|undefined|null|erro_|_invalid|http|\b4\d\d\b|\b5\d\d\b/i;

test("todo erro conhecido tem mensagem em português, sem termos técnicos", () => {
  for (const e of ERROS) {
    const m = mensagemDeErroAoSalvar(e);
    assert.ok(m.length > 20, e);
    assert.doesNotMatch(m, TERMOS_TECNICOS, e);
    assert.match(m, /[a-zà-ú]/i);
  }
});

test("erros que preservam os dados avisam que as informações continuam preenchidas", () => {
  for (const e of ERROS) assert.match(mensagemDeErroAoSalvar(e), /continuam preenchidas/);
});

test("erro desconhecido recebe mensagem padrão, sem repetir o texto recebido", () => {
  const m = mensagemDeErroAoSalvar("QUALQUER_COISA_INESPERADA_123");
  assert.doesNotMatch(m, /QUALQUER_COISA/);
  assert.match(m, /Não foi possível salvar/);
  assert.ok(mensagemDeErroAoSalvar(undefined).length > 0);
});

test("a mensagem nunca contém o código de acesso (a função nem o recebe)", () => {
  assert.equal(mensagemDeErroAoSalvar.length, 1);
});
