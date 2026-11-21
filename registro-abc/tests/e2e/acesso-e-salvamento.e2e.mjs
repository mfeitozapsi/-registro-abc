// Testes de interface (navegador real) do acesso por link e do salvamento.
// Usam um Supabase FALSO e códigos FICTÍCIOS: nenhum dado real de famílias.
// Executar:  npm run test:e2e   (requer: npm install  e  npx playwright install chromium)
import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import {
  CODIGO, RESP_OK, SALVO, FALHA_REDE, resp, TEXTOS,
  iniciarAmbiente, irAteARevisao, botao, chamadasDe,
} from "./harness.mjs";

let amb;
before(async () => { amb = await iniciarAmbiente(); });
after(async () => { await amb.encerrar(); });

const esperarAte = async (condicao, ms = 5000) => {
  const limite = Date.now() + ms;
  while (Date.now() < limite) { if (condicao()) return; await new Promise((r) => setTimeout(r, 25)); }
  throw new Error("tempo esgotado esperando a condição");
};
const pausa = (ms) => new Promise((r) => setTimeout(r, ms));
const titulo = (pagina, nome) => pagina.getByRole("heading", { name: nome });

async function comAparelho(rpc, corpo) {
  const ap = await amb.novoAparelho(rpc);
  try { await corpo(ap); } finally { await ap.contexto.close(); }
}
const abrirComLink = async (pagina, codigo = CODIGO) => {
  await pagina.goto(`${amb.base}/#/f/${codigo}`);
};

/** O código de acesso não pode aparecer em console, erros de página nem no conteúdo da tela. */
async function semVazamento({ pagina, registro }) {
  const tudo = [...registro.console, ...registro.erros].join("\n");
  assert.ok(!tudo.includes(CODIGO), "código vazou para o console");
  assert.ok(!(await pagina.content()).includes(CODIGO), "código apareceu no HTML da tela");
  assert.ok(!pagina.url().includes(CODIGO), "código permaneceu na barra de endereço");
  assert.deepEqual(registro.erros, [], "erros de JavaScript na página");
}

// ------------------------------------------------------------------ ACESSO
test("código VÁLIDO: libera o formulário e remove o código da barra de endereço", async () => {
  await comAparelho(async () => RESP_OK, async (ap) => {
    await abrirComLink(ap.pagina);
    await botao(ap.pagina, "Novo registro").waitFor();
    assert.equal(await botao(ap.pagina, "Novo registro").isEnabled(), true);
    assert.equal(await botao(ap.pagina, "Consultar histórico").isDisabled(), true, "tela inicial deve ficar como antes");
    assert.equal(await ap.pagina.evaluate(() => location.hash), "");
    const validacoes = chamadasDe(ap.registro, "familia_validar_acesso");
    assert.equal(validacoes.length, 1, "uma única validação (mesmo com StrictMode)");
    assert.deepEqual(validacoes[0].params, { p_codigo: CODIGO });
    await semVazamento(ap);
  });
});

test("código INVÁLIDO: bloqueia o formulário e esquece o código", async () => {
  await comAparelho(async () => resp("link_invalido"), async (ap) => {
    await abrirComLink(ap.pagina);
    await titulo(ap.pagina, "Link de acesso inválido").waitFor();
    assert.equal(await botao(ap.pagina, "Novo registro").count(), 0);
    assert.equal(await ap.pagina.evaluate(() => localStorage.getItem("registro-abc:acesso")), null);
    await semVazamento(ap);
  });
});

test("código REVOGADO depois de já ter funcionado: o app deixa de dar acesso", async () => {
  let revogado = false;
  await comAparelho(async () => (revogado ? resp("link_invalido") : RESP_OK), async (ap) => {
    await abrirComLink(ap.pagina);
    await botao(ap.pagina, "Novo registro").waitFor();
    revogado = true; // o psicólogo revoga o link
    await ap.pagina.reload();                      // a família reabre o app, sem o link no endereço
    await titulo(ap.pagina, "Link de acesso inválido").waitFor();
    assert.equal(await botao(ap.pagina, "Novo registro").count(), 0);
    assert.equal(await ap.pagina.evaluate(() => localStorage.getItem("registro-abc:acesso")), null);
    const v = chamadasDe(ap.registro, "familia_validar_acesso");
    assert.equal(v.length, 2);
    assert.deepEqual(v[1].params, { p_codigo: CODIGO }, "usou o código guardado");
    await semVazamento(ap);
  });
});

test("família que volta ao app sem o link usa o código guardado", async () => {
  await comAparelho(async () => RESP_OK, async (ap) => {
    await abrirComLink(ap.pagina);
    await botao(ap.pagina, "Novo registro").waitFor();
    await ap.pagina.goto(`${amb.base}/`);
    await botao(ap.pagina, "Novo registro").waitFor();
  });
});

test("BLOQUEADO por excesso de tentativas: mensagem clara e sem formulário", async () => {
  await comAparelho(async () => resp("muitas_tentativas"), async (ap) => {
    await abrirComLink(ap.pagina);
    await titulo(ap.pagina, "Acesso temporariamente bloqueado").waitFor();
    assert.equal(await botao(ap.pagina, "Novo registro").count(), 0);
    assert.equal(await ap.pagina.evaluate(() => localStorage.getItem("registro-abc:acesso")), CODIGO,
      "um bloqueio temporário não deve apagar o código");
    await semVazamento(ap);
  });
});

test("FALHA DE COMUNICAÇÃO na validação: permite tentar novamente", async () => {
  let n = 0;
  await comAparelho(async () => (++n === 1 ? FALHA_REDE : RESP_OK), async (ap) => {
    await abrirComLink(ap.pagina);
    await titulo(ap.pagina, "Não foi possível conectar").waitFor();
    assert.equal(await botao(ap.pagina, "Novo registro").count(), 0);
    const texto = await ap.pagina.locator("body").innerText();
    assert.ok(!/detalhe técnico|supabase|rpc/i.test(texto), "não deve expor detalhes técnicos");
    await botao(ap.pagina, "Tentar novamente").click();
    await botao(ap.pagina, "Novo registro").waitFor();
    assert.deepEqual(chamadasDe(ap.registro, "familia_validar_acesso")[1].params, { p_codigo: CODIGO });
    await semVazamento(ap);
  });
});

test("SEM link e sem código guardado: orienta a abrir o link e não consulta o servidor", async () => {
  await comAparelho(async () => RESP_OK, async (ap) => {
    await ap.pagina.goto(`${amb.base}/`);
    await titulo(ap.pagina, "Acesso por link").waitFor();
    assert.equal(ap.registro.chamadas.length, 0);
    assert.equal(await botao(ap.pagina, "Novo registro").count(), 0);
  });
});

test("link MALFORMADO: acesso negado sem consultar o servidor", async () => {
  await comAparelho(async () => RESP_OK, async (ap) => {
    await ap.pagina.goto(`${amb.base}/#/f/abc`);
    await titulo(ap.pagina, "Link de acesso inválido").waitFor();
    assert.equal(ap.registro.chamadas.length, 0);
  });
});

test("abrir um link novo com o app já aberto valida o novo código", async () => {
  const NOVO = "ZyXwVuTsRqPoNmLkJiHgFeDcBa9876543210-_AbCdE"; // FICTÍCIO, 43 caracteres
  await comAparelho(async () => RESP_OK, async (ap) => {
    await abrirComLink(ap.pagina);
    await botao(ap.pagina, "Novo registro").waitFor();
    await ap.pagina.evaluate((c) => { location.hash = `#/f/${c}`; }, NOVO);
    await esperarAte(() => chamadasDe(ap.registro, "familia_validar_acesso").length === 2);
    assert.deepEqual(chamadasDe(ap.registro, "familia_validar_acesso")[1].params, { p_codigo: NOVO });
  });
});

// --------------------------------------------------------------- SALVAMENTO
test("salvamento BEM-SUCEDIDO: mostra carregamento e só conclui após a confirmação", async () => {
  let liberar; const portao = new Promise((r) => (liberar = r));
  await comAparelho(async (nome) => (nome === "familia_validar_acesso" ? RESP_OK : (await portao, SALVO)), async (ap) => {
    await abrirComLink(ap.pagina);
    await irAteARevisao(ap.pagina);
    await botao(ap.pagina, "Salvar registro").click();

    // enquanto o servidor não responde:
    await botao(ap.pagina, "Salvando…").waitFor();
    assert.equal(await botao(ap.pagina, "Salvando…").isDisabled(), true);
    assert.equal(await botao(ap.pagina, "Voltar").isDisabled(), true);
    for (const b of await ap.pagina.getByRole("button", { name: /^Editar/ }).all()) assert.equal(await b.isDisabled(), true);
    assert.equal(await titulo(ap.pagina, "Registro finalizado").count(), 0, "não pode concluir antes da confirmação");
    await esperarAte(() => chamadasDe(ap.registro, "familia_criar_registro").length === 1);

    liberar();
    await titulo(ap.pagina, "Registro finalizado").waitFor();
    await ap.pagina.getByText("Seu registro foi salvo com sucesso.").waitFor();
    assert.equal(await botao(ap.pagina, "Voltar à revisão").count(), 0, "não deve permitir salvar de novo o mesmo registro");

    const [envio] = chamadasDe(ap.registro, "familia_criar_registro");
    assert.equal(envio.params.p_codigo, CODIGO);
    assert.equal(envio.params.p_antecedente, TEXTOS.antecedente);
    assert.equal(envio.params.p_comportamento, TEXTOS.comportamento);
    assert.equal(envio.params.p_intervencao, TEXTOS.intervencao);
    assert.equal(envio.params.p_consequencia, TEXTOS.consequencia);
    assert.ok(!Number.isNaN(Date.parse(envio.params.p_ocorrido_em)));

    await botao(ap.pagina, "Voltar ao início").click();
    await botao(ap.pagina, "Novo registro").waitFor();
    await semVazamento(ap);
  });
});

test("ENVIO DUPLICADO: toques repetidos geram uma única chamada", async () => {
  let liberar; const portao = new Promise((r) => (liberar = r));
  await comAparelho(async (nome) => (nome === "familia_validar_acesso" ? RESP_OK : (await portao, SALVO)), async (ap) => {
    await abrirComLink(ap.pagina);
    await irAteARevisao(ap.pagina);
    // três cliques síncronos, antes de a tela ter tempo de atualizar
    await ap.pagina.evaluate(() => {
      const b = [...document.querySelectorAll("button")].find((x) => x.textContent.trim() === "Salvar registro");
      b.click(); b.click(); b.click();
    });
    await botao(ap.pagina, "Salvando…").waitFor();
    await botao(ap.pagina, "Salvando…").click({ force: true, timeout: 1000 }).catch(() => {}); // botão desativado
    await pausa(400);
    assert.equal(chamadasDe(ap.registro, "familia_criar_registro").length, 1);
    liberar();
    await titulo(ap.pagina, "Registro finalizado").waitFor();
    await pausa(200);
    assert.equal(chamadasDe(ap.registro, "familia_criar_registro").length, 1);
  });
});

test("FALHA no salvamento: preserva os dados, informa o erro e permite nova tentativa", async () => {
  let tentativas = 0;
  await comAparelho(
    async (nome) => (nome === "familia_validar_acesso" ? RESP_OK : (++tentativas === 1 ? FALHA_REDE : SALVO)),
    async (ap) => {
      await abrirComLink(ap.pagina);
      await irAteARevisao(ap.pagina);
      await botao(ap.pagina, "Salvar registro").click();

      const aviso = ap.pagina.getByRole("alert");
      await aviso.waitFor();
      const msg = await aviso.innerText();
      assert.match(msg, /Não foi possível salvar agora/);
      assert.match(msg, /continuam preenchidas/);
      assert.ok(!/detalhe técnico|supabase|rpc|p_codigo/i.test(msg), "sem detalhes técnicos");
      assert.equal(await titulo(ap.pagina, "Registro finalizado").count(), 0, "não pode concluir com falha");

      // tudo continua na tela de revisão e o botão volta a funcionar
      await titulo(ap.pagina, "Revise seu registro").waitFor();
      for (const t of Object.values(TEXTOS)) await ap.pagina.getByText(t).waitFor();
      assert.equal(await botao(ap.pagina, "Salvar registro").isEnabled(), true);

      // os dados também estão nos campos do formulário
      await botao(ap.pagina, "Voltar").click();
      assert.equal(await ap.pagina.getByRole("textbox").inputValue(), TEXTOS.consequencia);
      await botao(ap.pagina, "Revisar").click();
      assert.equal(await ap.pagina.getByRole("alert").count(), 0, "aviso antigo não deve reaparecer");

      await botao(ap.pagina, "Salvar registro").click();
      await titulo(ap.pagina, "Registro finalizado").waitFor();

      const envios = chamadasDe(ap.registro, "familia_criar_registro");
      assert.equal(envios.length, 2);
      assert.deepEqual(envios[1].params, envios[0].params, "a nova tentativa envia os mesmos dados");
      await semVazamento(ap);
    });
});

for (const [erro, trecho] of [
  ["link_invalido", /link de acesso não está mais ativo/],
  ["registro_vazio", /Preencha ao menos um dos campos/],
  ["data_invalida", /data ou o horário não são válidos/],
  ["texto_muito_longo", /campos está muito longo/],
  ["limite_diario", /limite de registros por dia/],
  ["muitas_tentativas", /muitas tentativas/],
]) {
  test(`erro do servidor "${erro}": mensagem compreensível e dados preservados`, async () => {
    await comAparelho(async (nome) => (nome === "familia_validar_acesso" ? RESP_OK : resp(erro)), async (ap) => {
      await abrirComLink(ap.pagina);
      await irAteARevisao(ap.pagina);
      await botao(ap.pagina, "Salvar registro").click();
      const aviso = ap.pagina.getByRole("alert");
      await aviso.waitFor();
      const msg = await aviso.innerText();
      assert.match(msg, trecho);
      assert.ok(!msg.includes(erro) && !msg.includes(CODIGO), "não deve mostrar o código do erro nem o acesso");
      await titulo(ap.pagina, "Revise seu registro").waitFor();
      for (const t of Object.values(TEXTOS)) await ap.pagina.getByText(t).waitFor();
      await semVazamento(ap);
    });
  });
}
