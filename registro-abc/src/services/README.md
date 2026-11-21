# services/

Comunicação com o servidor (Supabase). As telas não devem falar com o banco
diretamente: passam por aqui.

- `supabaseClient.js`: cria o cliente com a URL e a chave PÚBLICA (`.env.local`).
- `seguranca.js`: recusa chaves secretas (secret/service_role) no frontend.
- `familiaApi.js`: funções RPC do app das famílias
  (`validarAcesso`, `criarRegistro`, `listarRegistros`).

Usadas por `features/acesso` (validação do link) e `features/registros` (salvamento).
`listarRegistros` ainda não é usada por nenhuma tela. O painel do psicólogo
(funções `admin_*`) será adicionado em etapa futura.
