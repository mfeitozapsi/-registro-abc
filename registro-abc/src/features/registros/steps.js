// As cinco etapas do formulário, na ordem em que aparecem.
// "campos" lista os campos de cada etapa (as chaves do objeto "registro").
export const STEPS = [
  { id: "dataHora", title: "Data e horário", campos: ["data", "hora"] },
  { id: "antecedente", title: "Antecedente", campos: ["antecedente"] },
  { id: "comportamento", title: "Comportamento", campos: ["comportamento"] },
  { id: "intervencao", title: "Intervenção utilizada", campos: ["intervencao"] },
  { id: "consequencia", title: "Consequência imediata", campos: ["consequencia"] },
];
