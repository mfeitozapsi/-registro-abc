// Verifica a conexão com o Supabase SEM usar dados de famílias.
// Uso:  npm run verificar:supabase
//
// O que faz: lê o .env.local (ou .env), confere que a chave NÃO é secreta e chama
// familia_validar_acesso com um código falso. O resultado esperado é "link_invalido".
// Efeito colateral: grava 1 tentativa falha em abc_interno.tentativas_falhas
// (inofensivo; pode ser apagada, ver README).
import { existsSync, readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";
import { chaveEhSecreta } from "../src/services/seguranca.js";

function lerEnv() {
  const valores = {};
  for (const arquivo of [".env", ".env.local"]) {   // .env.local tem prioridade
    if (!existsSync(arquivo)) continue;
    for (const linha of readFileSync(arquivo, "utf8").split(/\r?\n/)) {
      const m = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (m && !linha.trim().startsWith("#")) valores[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return valores;
}

const falhar = (mensagem) => { console.error(`✗ ${mensagem}`); process.exit(1); };

const env = lerEnv();
const url = env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL;
const chave = env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!url || !chave) falhar("Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY em .env.local (modelo: .env.example).");
if (chaveEhSecreta(chave)) falhar("A chave informada é SECRETA (secret/service_role). Use apenas a chave pública e revogue a chave exposta.");
console.log("✓ Variáveis encontradas e a chave não é secreta.");

const supabase = createClient(url, chave, { auth: { persistSession: false, autoRefreshToken: false } });
const { data, error } = await supabase.rpc("familia_validar_acesso", { p_codigo: "codigo-falso-de-verificacao" });

if (error) {
  falhar(`Falha ao chamar o Supabase: ${error.message}` +
    "\n  Verifique: URL correta? chave correta? migrações aplicadas (função familia_validar_acesso)?");
}
if (data?.ok === false && (data.erro === "link_invalido" || data.erro === "muitas_tentativas")) {
  console.log(`✓ Conexão OK. O servidor respondeu "${data.erro}" ao código falso, como esperado.`);
  process.exit(0);
}
falhar(`Resposta inesperada do servidor: ${JSON.stringify(data)}`);
