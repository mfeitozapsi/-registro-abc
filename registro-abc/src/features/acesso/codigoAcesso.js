// Leitura, guarda e limpeza do código de acesso da família.
// O código é uma CREDENCIAL PRIVADA: nunca deve ir para console, logs, mensagens
// de erro ou para a tela. Este arquivo não usa console em nenhum caso.
//
// Formato do link:  https://SEU-SITE/#/f/<código de 43 caracteres>
// (o código fica depois do "#", que o navegador não envia ao servidor do site).

const CHAVE_ARMAZENAMENTO = "registro-abc:acesso";
const PREFIXO_LINK = "#/f/";
const FORMATO_CODIGO = /^[A-Za-z0-9_-]{43}$/;

/** { presente, codigo }: presente = o endereço traz um link de acesso (mesmo malformado). */
export function extrairCodigoDoHash(hash) {
  const texto = typeof hash === "string" ? hash : "";
  if (!texto.startsWith(PREFIXO_LINK)) return { presente: false, codigo: null };
  const candidato = texto.slice(PREFIXO_LINK.length);
  return { presente: true, codigo: FORMATO_CODIGO.test(candidato) ? candidato : null };
}

function armazenamento(storage) {
  try {
    return storage ?? globalThis.localStorage ?? null;
  } catch {
    return null; // acesso bloqueado pelo navegador
  }
}

export function lerCodigoArmazenado(storage) {
  try {
    const valor = armazenamento(storage)?.getItem(CHAVE_ARMAZENAMENTO);
    return typeof valor === "string" && FORMATO_CODIGO.test(valor) ? valor : null;
  } catch {
    return null;
  }
}

export function guardarCodigo(codigo, storage) {
  try {
    armazenamento(storage)?.setItem(CHAVE_ARMAZENAMENTO, codigo);
  } catch {
    /* sem armazenamento: o acesso vale apenas enquanto a página estiver aberta */
  }
}

export function limparCodigoArmazenado(storage) {
  try {
    armazenamento(storage)?.removeItem(CHAVE_ARMAZENAMENTO);
  } catch {
    /* nada a fazer */
  }
}

/** Remove o "#/f/código" da barra de endereço (sem recarregar a página). */
export function removerCodigoDaUrl() {
  try {
    window.history.replaceState(null, "", window.location.pathname + window.location.search);
  } catch {
    /* nada a fazer */
  }
}

/**
 * Descobre o código ao abrir o app.
 *  - Link no endereço: usa o do link, guarda no aparelho e apaga da barra de endereço.
 *  - Sem link: usa o código guardado (família que volta ao app).
 * Retorna { origem: "link" | "armazenado" | "nenhum", codigo: string | null }.
 * (origem "link" com codigo null = link malformado.)
 */
export function obterCodigoDeEntrada({
  hash = typeof window !== "undefined" ? window.location.hash : "",
  storage,
  aoLimparUrl = removerCodigoDaUrl,
} = {}) {
  const doLink = extrairCodigoDoHash(hash);
  if (doLink.presente) {
    aoLimparUrl();
    if (doLink.codigo) guardarCodigo(doLink.codigo, storage);
    return { origem: "link", codigo: doLink.codigo };
  }
  const guardado = lerCodigoArmazenado(storage);
  return guardado ? { origem: "armazenado", codigo: guardado } : { origem: "nenhum", codigo: null };
}
