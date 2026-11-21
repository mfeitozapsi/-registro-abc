// Impede envios duplicados: enquanto um salvamento está em andamento, novas
// chamadas são ignoradas (não chegam ao servidor). Funciona mesmo que o usuário
// toque várias vezes antes de a tela atualizar.
export function criarSalvador(executar) {
  let ocupado = false;
  return {
    get ocupado() {
      return ocupado;
    },
    async salvar(...argumentos) {
      if (ocupado) return { ignorado: true };
      ocupado = true;
      try {
        return await executar(...argumentos);
      } catch {
        return { ok: false, erro: "falha_de_comunicacao" };
      } finally {
        ocupado = false;
      }
    },
  };
}
