// Traduz a resposta de familia_validar_acesso (via validarAcesso) em um estado de tela.
//   valido      -> pode usar o formulário
//   invalido    -> código inexistente, revogado, família inativa ou link malformado
//                  (o servidor não diferencia esses casos, de propósito)
//   bloqueado   -> muitas tentativas (erro "muitas_tentativas")
//   indisponivel-> app sem configuração (erro "nao_configurado")
//   erro        -> falha de comunicação ou resposta inesperada (pode tentar de novo)
export function estadoPelaResposta(resposta) {
  if (resposta && resposta.ok === true) return "valido";
  switch (resposta && resposta.erro) {
    case "link_invalido":
      return "invalido";
    case "muitas_tentativas":
      return "bloqueado";
    case "nao_configurado":
      return "indisponivel";
    default:
      return "erro";
  }
}
