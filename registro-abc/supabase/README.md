# Banco de dados do Registro ABC (Supabase)

> **Situação:** arquivos preparados, **ainda não executados** no Supabase e
> **não conectados** ao app. Nenhum dado real deve ser usado.

## O que há aqui

```
supabase/
├── migrations/   5 arquivos SQL, para executar NESTA ordem
│   ├── ..0001_tabelas.sql            tabelas, relações, RLS ativada, tudo bloqueado
│   ├── ..0002_funcoes_internas.sql   código aleatório, validação, limite de tentativas
│   ├── ..0003_funcoes_familia.sql    funções usadas pelo app das famílias
│   ├── ..0004_funcoes_admin.sql      funções do painel do psicólogo
│   └── ..0005_politicas_rls.sql      políticas RLS e permissões das tabelas
├── manual/criar_admin.sql      cadastra o administrador (uma vez)
├── opcional/exigir_mfa_admin.sql   exige verificação em dois passos (depois de configurar)
└── tests/isolamento.sql        testes de segurança com famílias fictícias
```

## Como o acesso funciona

- **Famílias** (sem login): o app envia o código do link a uma destas funções.
  O servidor calcula o hash, descobre a família e só então lê ou grava.
  O navegador **nunca** informa o identificador da família.
- **Psicólogo**: entra com e-mail e senha (Supabase Auth). Só quem está na tabela
  `admins` tem acesso. Cria famílias e links por funções `admin_*`.
- **Tabelas**: sem acesso público. Só o administrador as lê (e nunca a coluna
  `token_hash`). Ninguém edita ou apaga registros diretamente.
- **Código**: 256 bits aleatórios, mostrado **uma única vez** ao criar ou
  substituir o link. No banco fica só o hash (SHA-256).

### Funções que o app poderá chamar (`supabase.rpc(...)`)

| Função | Quem | Retorno |
|---|---|---|
| `familia_validar_acesso(p_codigo)` | família | `{ok}` ou `{ok:false, erro}` |
| `familia_criar_registro(p_codigo, p_ocorrido_em, p_antecedente, p_comportamento, p_intervencao, p_consequencia)` | família | `{ok, id, criado_em}` ou `{ok:false, erro}` |
| `familia_listar_registros(p_codigo, p_limite, p_deslocamento)` | família | `{ok, registros:[...]}` |
| `admin_criar_familia(p_apelido)` | admin | `{familia_id, link_id, codigo}` |
| `admin_substituir_link(p_familia_id)` | admin | `{familia_id, link_id, codigo}` |
| `admin_revogar_link(p_link_id)` | admin | nada |

Erros possíveis para famílias: `link_invalido`, `muitas_tentativas`,
`data_invalida`, `texto_muito_longo`, `registro_vazio`, `limite_diario`.

## Como executar (somente após autorização)

### Opção A: SQL Editor (mais simples)
1. No painel do Supabase, abra **SQL Editor**.
2. Para cada arquivo de `migrations/`, **em ordem (1 a 5)**: abra uma nova consulta,
   cole o conteúdo, clique **Run** e confirme "Success".
3. **Authentication → Users → Add user**: crie o usuário administrador
   (seu e-mail, senha forte).
4. Em **Authentication**, desative o cadastro público de novos usuários
   (opção "Allow new users to sign up").
5. Edite o e-mail em `manual/criar_admin.sql` e execute. Deve listar 1 linha.
6. Execute `tests/isolamento.sql` inteiro, de uma vez. O resultado final deve ser
   "OK: todos os testes passaram...". Se aparecer "FALHA ...", a transação é
   desfeita (se a sessão ficar com erro, execute `rollback;`); me envie a mensagem.
7. Confira **Database → Advisors → Security** e me envie os avisos, se houver.

### Opção B: Supabase CLI
```bash
supabase login
supabase link --project-ref SEU_PROJECT_REF
supabase db push          # aplica as migrações em ordem
```
Depois, siga os passos 3 a 7 acima.

## Cuidados importantes
- No app (frontend) use **somente a chave pública** (anon/publishable). A chave
  `service_role` (secret) **nunca** vai para o código do app.
- Em **Settings → API → Exposed schemas**, mantenha apenas `public`.
  Não adicione `abc_interno`.
- **Antes de dados reais:** use o plano Pro (backups diários e sem pausa por
  inatividade) e conclua os itens de LGPD (ciência dos responsáveis, política
  de privacidade, prazo de guarda).
- Verificação em dois passos do administrador: cadastre-a e só depois execute
  `opcional/exigir_mfa_admin.sql`.

## Verificações no ambiente real (depois de executar, com sua autorização)
1. **Identificação do cliente (IP).** Chame uma vez a função com um código
   inválido, por exemplo:
   ```bash
   curl -X POST 'https://SEU_PROJETO.supabase.co/rest/v1/rpc/familia_validar_acesso' \
     -H 'apikey: SUA_CHAVE_PUBLICA' -H 'Content-Type: application/json' \
     -d '{"p_codigo":"teste"}'
   ```
   Depois, no SQL Editor:
   ```sql
   select chave is not null as ip_identificado, count(*)
   from abc_interno.tentativas_falhas group by 1;
   ```
   `true` = o IP foi identificado pelos cabeçalhos. `false` = não foi (o sistema
   continua seguro, mas sem limite individual). Depois apague o teste:
   `delete from abc_interno.tentativas_falhas;`
2. **Avisos do Security Advisor.** Esperados: funções `familia_*` e `admin_*`
   acessíveis pela API (é intencional; as `admin_*` exigem administrador).

## Limitações conhecidas
- **Limite de tentativas = melhor esforço.** O IP vem de `cf-connecting-ip`
  (definido pela plataforma Supabase) ou, se ausente, do primeiro endereço de
  `x-forwarded-for`. O Supabase não garante que este segundo não possa ser forjado
  por quem chama a API diretamente. Consequências possíveis: um atacante evitar o
  limite trocando de IP, ou provocar bloqueio de 15 min de um IP que ele conheça.
  Nenhum dos dois dá acesso a dados: o código tem 256 bits.
- **Cliente sem IP identificável** não tem limite individual (nunca compartilha
  limite com outros) e um código válido dele nunca é bloqueado. Só há um teto
  global de 300 falhas em 15 min para códigos inválidos.
- Excluir uma família apaga também seus links e registros (direito de exclusão).
  Não há tela para isso ainda.
- Máximo de 100 registros por família a cada 24 h e 5.000 caracteres por campo.
- A tabela `links_acesso` tem permissão de leitura por colunas: no painel futuro,
  liste as colunas (não use `select *`, que falha por incluir `token_hash`).
- Mesmo que o cadastro público de usuários fique ativo por engano, uma conta
  comum não enxerga nenhum dado (só o administrador cadastrado em `admins`).
