-- =============================================================================
-- REGISTRO ABC | Migração 4: funções do painel administrativo
-- Só funcionam para um usuário autenticado (Supabase Auth) que esteja na tabela
-- admins. O código em texto puro é devolvido UMA vez, ao criar/substituir o link;
-- no banco fica apenas o hash.
-- =============================================================================

-- Cria uma família e seu primeiro link de acesso.
create or replace function public.admin_criar_familia(p_apelido text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_familia uuid;
  v_link    uuid;
  v_codigo  text;
begin
  perform abc_interno.exigir_admin();

  insert into public.familias (apelido) values (btrim(p_apelido)) returning id into v_familia;

  v_codigo := abc_interno.gerar_codigo();
  insert into public.links_acesso (familia_id, token_hash)
  values (v_familia, extensions.digest(v_codigo, 'sha256'))
  returning id into v_link;

  return jsonb_build_object('familia_id', v_familia, 'link_id', v_link, 'codigo', v_codigo);
end;
$$;

-- Revoga o link ativo da família (se houver) e cria um novo.
create or replace function public.admin_substituir_link(p_familia_id uuid)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_link   uuid;
  v_codigo text;
begin
  perform abc_interno.exigir_admin();

  if not exists (select 1 from public.familias where id = p_familia_id) then
    raise exception 'familia_nao_encontrada' using errcode = 'P0002';
  end if;

  update public.links_acesso
     set revogado_em = now()
   where familia_id = p_familia_id and revogado_em is null;

  v_codigo := abc_interno.gerar_codigo();
  insert into public.links_acesso (familia_id, token_hash)
  values (p_familia_id, extensions.digest(v_codigo, 'sha256'))
  returning id into v_link;

  return jsonb_build_object('familia_id', p_familia_id, 'link_id', v_link, 'codigo', v_codigo);
end;
$$;

-- Revoga um link específico (sem criar outro).
create or replace function public.admin_revogar_link(p_link_id uuid)
returns void
language plpgsql volatile security definer
set search_path = ''
as $$
begin
  perform abc_interno.exigir_admin();

  if not exists (select 1 from public.links_acesso where id = p_link_id) then
    raise exception 'link_nao_encontrado' using errcode = 'P0002';
  end if;

  update public.links_acesso
     set revogado_em = now()
   where id = p_link_id and revogado_em is null;
end;
$$;

-- Permissões: apenas usuários logados podem chamar (e cada função confere admin).
revoke all on function public.admin_criar_familia(text)       from public, anon, authenticated;
revoke all on function public.admin_substituir_link(uuid)     from public, anon, authenticated;
revoke all on function public.admin_revogar_link(uuid)        from public, anon, authenticated;

grant execute on function public.admin_criar_familia(text)    to authenticated;
grant execute on function public.admin_substituir_link(uuid)  to authenticated;
grant execute on function public.admin_revogar_link(uuid)     to authenticated;
