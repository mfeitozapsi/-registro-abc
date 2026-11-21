// Ambiente dos testes de interface: compila o app real (src/), serve em http local
// e abre no Chromium (via Playwright) com um Supabase FALSO. Nenhum dado real é usado.
import { build } from "esbuild";
import { createServer } from "node:http";
import { mkdtempSync, readFileSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), "../..");

// Código FICTÍCIO (43 caracteres), usado apenas nos testes.
export const CODIGO = "AbCdEfGhIjKlMnOpQrStUvWxYz0123456789_-aBcDe";

export const RESP_OK = { data: { ok: true }, error: null };
export const resp = (erro) => ({ data: { ok: false, erro }, error: null });
export const FALHA_REDE = { data: null, error: { message: "detalhe técnico" } };
export const SALVO = { data: { ok: true, id: "id-falso", criado_em: "2026-11-20T00:00:00Z" }, error: null };

const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<link rel="stylesheet" href="/main.css"></head><body><div id="root"></div><script src="/main.js"></script></body></html>`;
const tipos = { ".js": "text/javascript", ".css": "text/css" };

export async function iniciarAmbiente() {
  const pasta = mkdtempSync(join(tmpdir(), "abc-e2e-"));
  await build({
    entryPoints: [join(raiz, "src/main.jsx")],
    bundle: true, outdir: pasta, format: "iife", jsx: "automatic", logLevel: "error",
    loader: { ".png": "dataurl" },
    alias: { "@supabase/supabase-js": join(raiz, "tests/e2e/supabase-js-falso.js") },
    define: {
      "import.meta.env.VITE_SUPABASE_URL": JSON.stringify("https://projeto-de-teste.invalid"),
      "import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY": JSON.stringify("sb_publishable_chave_de_teste"),
    },
  });
  const servidor = createServer((req, res) => {
    const caminho = req.url.split("?")[0].split("#")[0];
    const arquivo = join(pasta, caminho);
    if (caminho !== "/" && existsSync(arquivo)) {
      res.writeHead(200, { "content-type": tipos[extname(arquivo)] ?? "application/octet-stream" });
      res.end(readFileSync(arquivo));
    } else {
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
      res.end(html);
    }
  });
  await new Promise((ok) => servidor.listen(0, "127.0.0.1", ok));
  const base = `http://127.0.0.1:${servidor.address().port}`;
  const navegador = await chromium.launch();

  /** Abre um aparelho novo (armazenamento limpo). "rpc(nome, params)" devolve { data, error }. */
  async function novoAparelho(rpc) {
    const contexto = await navegador.newContext({ viewport: { width: 390, height: 844 } });
    const pagina = await contexto.newPage();
    const registro = { chamadas: [], console: [], erros: [] };
    pagina.on("console", (m) => registro.console.push(m.text()));
    pagina.on("pageerror", (e) => registro.erros.push(String(e)));
    await pagina.exposeFunction("__rpc", async (nome, params) => {
      registro.chamadas.push({ nome, params });
      return rpc(nome, params);
    });
    return { pagina, registro, contexto };
  }

  return {
    base, novoAparelho,
    async encerrar() { await navegador.close(); servidor.close(); },
  };
}

// ---- passos reutilizáveis do formulário ----
export const TEXTOS = {
  antecedente: "TESTE antecedente: pedido para guardar o brinquedo",
  comportamento: "TESTE comportamento: gritou e jogou o lápis",
  intervencao: "TESTE intervenção: voz calma e pausa de dois minutos",
  consequencia: "TESTE consequência: retomou a atividade",
};

/** Da tela inicial até a tela de revisão, preenchendo os quatro campos de texto. */
export async function irAteARevisao(pagina) {
  await pagina.getByRole("button", { name: "Novo registro" }).click();
  await pagina.getByRole("button", { name: "Próximo" }).click(); // data e horário (já preenchidos)
  const ordem = ["antecedente", "comportamento", "intervencao", "consequencia"];
  for (let i = 0; i < ordem.length; i++) {
    await pagina.getByRole("textbox").fill(TEXTOS[ordem[i]]);
    await pagina.getByRole("button", { name: i === ordem.length - 1 ? "Revisar" : "Próximo" }).click();
  }
  await pagina.getByRole("heading", { name: "Revise seu registro" }).waitFor();
}

export const botao = (pagina, nome) => pagina.getByRole("button", { name: nome, exact: true });
export const chamadasDe = (registro, nome) => registro.chamadas.filter((c) => c.nome === nome);
