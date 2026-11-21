-- =============================================================================
-- REGISTRO ABC | Migração 1: tabelas, relacionamentos e bloqueio padrão
-- Todas as tabelas nascem com RLS ativada e SEM nenhuma permissão para os
-- papéis da API (anon e authenticated). Os acessos permitidos são concedidos
-- explicitamente na migração 5.
-- =============================================================================

create extension if not exists pgcrypto with schema extensions;

-- Esquema INTERNO: não é exposto pela Data API (apenas "public" é).
-- Guarda funções auxiliares e o registro de tentativas falhas.
create schema if not exists abc_interno;
revoke all on schema abc_interno from public, anon, authenticated;

-- ------------------------------------------------------------------ famílias
create table public.familias (
  id        uuid primary key default gen_random_uuid(),
  apelido   text not null,                       -- apelido interno; nunca o nome completo da criança
  ativa     boolean not null default true,
  criada_em timestamptz not null default now(),
  constraint familias_apelido_tamanho check (char_length(btrim(apelido)) between 1 and 80)
);
create unique index familias_apelido_unico on public.familias (lower(btrim(apelido)));

-- ------------------------------------------------------------ links de acesso
-- Guarda SOMENTE o hash (SHA-256) do código. O código original nunca é gravado.
create table public.links_acesso (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references public.familias (id) on delete cascade,
  token_hash    bytea not null,
  criado_em     timestamptz not null default now(),
  revogado_em   timestamptz,
  ultimo_uso_em timestamptz,
  constraint links_acesso_hash_tamanho check (octet_length(token_hash) = 32),
  constraint links_acesso_hash_unico unique (token_hash)
);
-- No máximo UM link ativo (não revogado) por família.
create unique index links_acesso_um_ativo_por_familia
  on public.links_acesso (familia_id) where revogado_em is null;

-- ----------------------------------------------------------------- registros
create table public.registros (
  id            uuid primary key default gen_random_uuid(),
  familia_id    uuid not null references public.familias (id) on delete cascade,
  ocorrido_em   timestamptz not null,            -- data e horário informados no formulário
  antecedente   text not null default '',
  comportamento text not null default '',
  intervencao   text not null default '',
  consequencia  text not null default '',
  criado_em     timestamptz not null default now(),
  constraint registros_tamanho_textos check (
    char_length(antecedente)   <= 5000 and
    char_length(comportamento) <= 5000 and
    char_length(intervencao)   <= 5000 and
    char_length(consequencia)  <= 5000
  )
);
create index registros_por_familia on public.registros (familia_id, ocorrido_em desc, id desc);

-- ------------------------------------------------------------ administradores
create table public.admins (
  user_id   uuid primary key references auth.users (id) on delete cascade,
  criado_em timestamptz not null default now()
);

-- ------------------------------------------- tentativas falhas (limitação)
-- "chave" é o hash do IP do cliente (o IP em si não é gravado).
-- chave NULA = cliente cuja origem não pôde ser identificada: essas falhas nunca
-- entram no limite individual de ninguém (só em um teto global, ver migração 2).
create table abc_interno.tentativas_falhas (
  id        bigint generated always as identity primary key,
  chave     bytea,
  criada_em timestamptz not null default now()
);
create index tentativas_falhas_chave on abc_interno.tentativas_falhas (chave, criada_em);
create index tentativas_falhas_data  on abc_interno.tentativas_falhas (criada_em);

-- ------------------------------------------------ RLS ativada + nenhum acesso
alter table public.familias               enable row level security;
alter table public.links_acesso           enable row level security;
alter table public.registros              enable row level security;
alter table public.admins                 enable row level security;
alter table abc_interno.tentativas_falhas enable row level security;

revoke all on table public.familias, public.links_acesso, public.registros, public.admins
  from public, anon, authenticated;
revoke all on table abc_interno.tentativas_falhas from public, anon, authenticated;
