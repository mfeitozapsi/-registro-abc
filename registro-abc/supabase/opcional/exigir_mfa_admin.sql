-- =============================================================================
-- OPCIONAL: exigir verificação em dois passos (MFA) para o administrador.
-- Execute SOMENTE depois de cadastrar o MFA (TOTP) na conta do administrador;
-- caso contrário você perde o acesso ao painel até desfazer (ver final).
-- =============================================================================
create or replace function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()))
     and coalesce((select auth.jwt() ->> 'aal'), '') = 'aal2';
$$;

-- Para desfazer: execute novamente a definição original de public.eh_admin()
-- que está em supabase/migrations/20261120000002_funcoes_internas.sql.
