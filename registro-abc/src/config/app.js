// Informações gerais do aplicativo, em um só lugar.
export const APP_NAME = "Registro ABC";

export const APP_TAGLINE =
  "Registre situações do dia a dia para apoiar a orientação parental e o acompanhamento psicológico.";

// Os quatro componentes de cada registro (modelo ABC ampliado).
// Fonte única: formulários, histórico e exportação usarão esta mesma lista.
export const ABC_COMPONENTS = [
  { id: "antecedente", title: "Antecedente", description: "O que aconteceu antes do comportamento." },
  { id: "comportamento", title: "Comportamento", description: "O que a criança fez." },
  { id: "intervencao", title: "Intervenção", description: "O que o adulto fez diante da situação." },
  { id: "consequencia", title: "Consequência imediata", description: "O que aconteceu logo depois." },
];

export const PROFESSIONAL = {
  name: "Matheus Feitoza",
  role: "Psicólogo",
};
