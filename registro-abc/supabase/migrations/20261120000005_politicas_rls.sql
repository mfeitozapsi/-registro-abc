-- =============================================================================
-- REGISTRO ABC | Migração 5: políticas RLS e permissões das tabelas
-- Somente o administrador (usuário autenticado presente em public.admins) acessa
-- as tabelas diretamente. Visitantes (anon) não têm acesso algum às tabelas:
-- as famílias usam apenas as funções da migração 3.
-- Tabelas admins e abc_interno.tentativas_falhas: sem políticas e sem permissões
-- (ninguém as acessa pela API).
-- =============================================================================

-- ------------------------------------------------------------------ famílias
create policy familias_admin_leitura on public.familias
  for select to authenticated using ((select public.eh_admin()));
create policy familias_admin_alteracao on public.familias
  for update to authenticated
  using ((select public.eh_admin())) with check ((select public.eh_admin()));
create policy familias_admin_exclusao on public.familias
  for delete to authenticated using ((select public.eh_admin()));

grant select, delete on public.familias to authenticated;
grant update (apelido, ativa) on public.familias to authenticated;   -- só estas colunas

-- ------------------------------------------------------------ links de acesso
-- O administrador vê os links, mas NUNCA a coluna token_hash.
-- Criar/revogar links: somente pelas funções admin_*.
create policy links_admin_leitura on public.links_acesso
  for select to authenticated using ((select public.eh_admin()));

grant select (id, familia_id, criado_em, revogado_em, ultimo_uso_em)
  on public.links_acesso to authenticated;

-- ----------------------------------------------------------------- registros
-- Somente leitura, mesmo para o administrador: registros não são editados
-- nem apagados diretamente (a exclusão ocorre apenas ao excluir a família).
create policy registros_admin_leitura on public.registros
  for select to authenticated using ((select public.eh_admin()));

grant select on public.registros to authenticated;
