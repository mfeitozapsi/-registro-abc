import { createClient } from "@supabase/supabase-js";
import { validarChavePublica } from "./seguranca.js";

// Somente a URL e a chave PÚBLICA do projeto (ver .env.example).
const url = import.meta.env.VITE_SUPABASE_URL;
const chave = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** false quando as variáveis de ambiente não foram preenchidas. */
export const supabaseConfigurado = Boolean(url && chave);

function criarCliente() {
  if (!supabaseConfigurado) return null;
  validarChavePublica(chave); // lança erro se for chave secreta

  return createClient(url, chave, {
    auth: {
      // As famílias não têm login: o acesso é feito pelo código do link.
      // Ajustar quando o painel do psicólogo (login) for implementado.
      persistSession: false,
      autoRefreshToken: false,
      // O link da família usa o "#" da URL; não deixar a biblioteca interpretá-lo.
      detectSessionInUrl: false,
    },
  });
}

/** Cliente Supabase, ou null se o projeto ainda não foi configurado. */
export const supabase = criarCliente();
