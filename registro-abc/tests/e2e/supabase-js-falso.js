// Substitui @supabase/supabase-js nos testes de interface: nenhuma chamada de rede.
// As respostas são fornecidas pelo teste, através de window.__rpc (ver harness.mjs).
export function createClient() {
  return { rpc: (nome, parametros) => globalThis.__rpc(nome, parametros) };
}
