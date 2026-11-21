-- =============================================================================
-- Cadastro do administrador (executar UMA vez, no SQL Editor do Supabase)
-- Antes: em Authentication > Users > "Add user", crie o usuário com o seu
-- e-mail e uma senha forte. Depois troque o e-mail abaixo e execute.
-- =============================================================================
insert into public.admins (user_id)
select id from auth.users where email = 'TROQUE_PELO_SEU_EMAIL@exemplo.com';

-- Conferência: deve listar exatamente UMA linha (o seu usuário).
select a.user_id, u.email from public.admins a join auth.users u on u.id = a.user_id;
