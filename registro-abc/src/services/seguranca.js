// Proteção contra um erro grave e fácil de cometer: colocar uma chave SECRETA
// do Supabase no frontend. Qualquer variável VITE_* fica visível a todos.
// Este arquivo não depende de nada do Vite, para poder ser usado também em scripts.

/** Retorna true se a chave parece ser secreta (secret key ou service_role). */
export function chaveEhSecreta(chave) {
  if (typeof chave !== "string") return false;
  if (chave.startsWith("sb_secret_")) return true;

  // Chaves antigas são JWT (três partes); a função fica no campo "role".
  const partes = chave.split(".");
  if (partes.length === 3) {
    try {
      const b64 = partes[1].replace(/-/g, "+").replace(/_/g, "/");
      const json = JSON.parse(atob(b64 + "=".repeat((4 - (b64.length % 4)) % 4)));
      return json.role === "service_role";
    } catch {
      return false;
    }
  }
  return false;
}

/** Interrompe a execução se a chave informada for secreta. */
export function validarChavePublica(chave) {
  if (chaveEhSecreta(chave)) {
    throw new Error(
      "Chave SECRETA do Supabase detectada no frontend. Use somente a chave pública " +
        "(publishable/anon) em VITE_SUPABASE_PUBLISHABLE_KEY e revogue a chave exposta."
    );
  }
}
