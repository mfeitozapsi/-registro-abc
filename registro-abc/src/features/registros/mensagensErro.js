// Mensagens para a família quando o salvamento não é concluído.
// Sem detalhes técnicos e sem o código de acesso.
const SUFIXO = " Suas informações continuam preenchidas.";

const MENSAGENS = {
  falha_de_comunicacao:
    "Não foi possível salvar agora. Verifique sua conexão com a internet e tente novamente.",
  nao_configurado: "O aplicativo não está disponível no momento. Tente novamente mais tarde.",
  link_invalido:
    "Seu link de acesso não está mais ativo. Peça um novo link ao seu psicólogo.",
  muitas_tentativas:
    "Houve muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.",
  data_invalida:
    "A data ou o horário não são válidos. Toque em “Editar” no cartão “Data e horário” e confira.",
  texto_muito_longo:
    "Um dos campos está muito longo. Use “Editar” para reduzir o texto.",
  registro_vazio:
    "Preencha ao menos um dos campos (antecedente, comportamento, intervenção ou consequência) antes de salvar.",
  limite_diario:
    "O limite de registros por dia foi atingido. Tente novamente amanhã ou fale com seu psicólogo.",
};

const PADRAO = "Não foi possível salvar o registro. Tente novamente.";

export function mensagemDeErroAoSalvar(erro) {
  return (MENSAGENS[erro] ?? PADRAO) + SUFIXO;
}
