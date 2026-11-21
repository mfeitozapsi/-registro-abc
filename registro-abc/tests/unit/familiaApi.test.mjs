// Testa familiaApi.js com um Supabase FALSO (sem rede). Usa o esbuild que já vem com o Vite.
import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const chamadas = [];
let resposta = { data: { ok: true }, error: null };
globalThis.__falso = { rpc: async (n, p) => { chamadas.push([n, p]); if (resposta instanceof Error) throw resposta; return resposta; } };

const substituirCliente = {
  name: "cliente-falso",
  setup(b) {
    b.onResolve({ filter: /supabaseClient\.js$/ }, () => ({ path: "falso", namespace: "f" }));
    b.onLoad({ filter: /.*/, namespace: "f" }, () => ({ contents: "export const supabase = globalThis.__falso;", loader: "js" }));
  },
};
const saida = (await build({ entryPoints: [join(raiz, "src/services/familiaApi.js")], bundle: true, format: "esm", write: false, plugins: [substituirCliente] })).outputFiles[0].text;
const arquivo = join(mkdtempSync(join(tmpdir(), "abc-api-")), "api.mjs");
writeFileSync(arquivo, saida);
const api = await import(pathToFileURL(arquivo).href);

const REGISTRO = { data: "2026-11-20", hora: "14:35", antecedente: "a", comportamento: "b", intervencao: "c", consequencia: "d" };
const reiniciar = (r = { data: { ok: true }, error: null }) => { chamadas.length = 0; resposta = r; };

test("validarAcesso usa familia_validar_acesso e apenas p_codigo", async () => {
  reiniciar();
  assert.deepEqual(await api.validarAcesso("CODIGO-FALSO"), { ok: true });
  assert.deepEqual(chamadas[0], ["familia_validar_acesso", { p_codigo: "CODIGO-FALSO" }]);
});

test("criarRegistro envia exatamente os parâmetros da função SQL", async () => {
  reiniciar({ data: { ok: true, id: "1", criado_em: "x" }, error: null });
  const r = await api.criarRegistro("CODIGO-FALSO", REGISTRO);
  assert.equal(r.ok, true);
  const [nome, p] = chamadas[0];
  assert.equal(nome, "familia_criar_registro");
  assert.deepEqual(Object.keys(p), ["p_codigo", "p_ocorrido_em", "p_antecedente", "p_comportamento", "p_intervencao", "p_consequencia"]);
  assert.equal(p.p_ocorrido_em, new Date("2026-11-20T14:35").toISOString());
  assert.equal(p.p_antecedente, "a");
});

test("nenhuma chamada envia identificador de família", async () => {
  reiniciar();
  await api.validarAcesso("x"); await api.criarRegistro("x", REGISTRO); await api.listarRegistros("x");
  for (const [, p] of chamadas) assert.ok(!Object.keys(p).some((k) => /famil/i.test(k)));
});

test("data ou horário ilegíveis não chegam ao servidor", async () => {
  reiniciar();
  for (const r of [{ ...REGISTRO, data: "" }, { ...REGISTRO, hora: "" }, { ...REGISTRO, data: "lixo" }, undefined]) {
    assert.deepEqual(await api.criarRegistro("x", r), { ok: false, erro: "data_invalida" });
  }
  assert.equal(chamadas.length, 0);
});

test("falha de comunicação: erro da biblioteca, exceção de rede e resposta inesperada", async () => {
  for (const r of [{ data: null, error: { message: "detalhe técnico" } }, new Error("rede"), { data: null, error: null }, { data: { sem_ok: 1 }, error: null }]) {
    reiniciar(r);
    assert.deepEqual(await api.validarAcesso("x"), { ok: false, erro: "falha_de_comunicacao" });
  }
});

test("repassa os erros do servidor", async () => {
  reiniciar({ data: { ok: false, erro: "link_invalido" }, error: null });
  assert.deepEqual(await api.criarRegistro("x", REGISTRO), { ok: false, erro: "link_invalido" });
});

test("nada é escrito no console, mesmo em falhas", async () => {
  const original = { log: console.log, error: console.error, warn: console.warn, info: console.info };
  let escritas = 0;
  for (const k of Object.keys(original)) console[k] = () => { escritas++; };
  try {
    reiniciar(new Error("rede")); await api.criarRegistro("CODIGO-SECRETO", REGISTRO);
    reiniciar({ data: null, error: { message: "x" } }); await api.validarAcesso("CODIGO-SECRETO");
  } finally { Object.assign(console, original); }
  assert.equal(escritas, 0);
});
