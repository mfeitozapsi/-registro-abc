import { supabase } from "./supabaseClient.js";

// Funções RPC usadas pelo app das FAMÍLIAS (ver supabase/migrations/..0003).
// Nenhuma recebe identificador de família: o servidor a descobre pelo código do link.
//
// Todas devolvem { ok: true, ... } ou { ok: false, erro: "<código>" }.
// Códigos de erro vindos do servidor:
//   link_invalido, muitas_tentativas, data_invalida, texto_muito_longo,
//   registro_vazio, limite_diario
// Códigos gerados aqui (nunca chegam ao servidor):
//   nao_configurado       (.env sem URL/chave)
//   falha_de_comunicacao  (sem internet, erro do servidor, resposta inesperada)
//   data_invalida         (data/horário do formulário ilegíveis)

async function chamar(nome, parametros) {
  if (!supabase) return { ok: false, erro: "nao_configurado" };
  try {
    const { data, error } = await supabase.rpc(nome, parametros);
    if (error || !data || typeof data.ok !== "boolean") {
      return { ok: false, erro: "falha_de_comunicacao" };
    }
    return data;
  } catch {
    return { ok: false, erro: "falha_de_comunicacao" };
  }
}

// "2026-11-20" + "14:35" (horário local do aparelho) -> "2026-11-20T17:35:00.000Z"
function paraTimestamp(data, hora) {
  if (!data || !hora) return null;
  const d = new Date(`${data}T${hora}`);
  return Number.isNaN(d.getTime()) ? null : d.toISOString();
}

/** familia_validar_acesso(p_codigo) -> { ok } */
export function validarAcesso(codigo) {
  return chamar("familia_validar_acesso", { p_codigo: codigo });
}

/**
 * familia_criar_registro(...) -> { ok, id, criado_em }
 * "registro" tem o mesmo formato do estado do formulário:
 * { data, hora, antecedente, comportamento, intervencao, consequencia }
 */
export async function criarRegistro(codigo, registro) {
  const ocorrido = paraTimestamp(registro?.data, registro?.hora);
  if (!ocorrido) return { ok: false, erro: "data_invalida" };

  return chamar("familia_criar_registro", {
    p_codigo: codigo,
    p_ocorrido_em: ocorrido,
    p_antecedente: registro.antecedente,
    p_comportamento: registro.comportamento,
    p_intervencao: registro.intervencao,
    p_consequencia: registro.consequencia,
  });
}

/**
 * familia_listar_registros(p_codigo, p_limite, p_deslocamento)
 *   -> { ok, registros: [{ id, ocorrido_em, antecedente, comportamento,
 *                          intervencao, consequencia, criado_em }] }
 * (Ainda não usada por nenhuma tela.)
 */
export function listarRegistros(codigo, { limite = 50, deslocamento = 0 } = {}) {
  return chamar("familia_listar_registros", {
    p_codigo: codigo,
    p_limite: limite,
    p_deslocamento: deslocamento,
  });
}
