-- =============================================================================
-- REGISTRO ABC | Testes de segurança e isolamento entre famílias
-- Usa apenas dados FICTÍCIOS e desfaz tudo no final (ROLLBACK).
-- Execute DEPOIS das 5 migrações, o arquivo INTEIRO de uma vez.
-- Se algum teste falhar, o script para com a mensagem "FALHA ..." e a transação é
-- desfeita (se mesmo assim a sessão ficar com erro, execute:  rollback;).
-- Se tudo passar, a última linha exibe "OK: todos os testes passaram".
-- OBS.: contagens em links_acesso usam count(id) (coluna com permissão de leitura),
-- pois o administrador não tem permissão para ler token_hash.
-- =============================================================================
begin;

-- ---------------------------------------------------------------- preparação
-- Dois usuários fictícios: um administrador e um usuário comum.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000a001', 'admin.teste@exemplo.invalid'),
  ('00000000-0000-0000-0000-00000000a002', 'comum.teste@exemplo.invalid');
insert into public.admins (user_id) values ('00000000-0000-0000-0000-00000000a001');

-- ------------------------------------------------- 1. administrador cria famílias
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare r jsonb;
begin
  r := public.admin_criar_familia('Família Teste A');
  assert length(r->>'codigo') = 43, 'FALHA 1: o código deve ter 43 caracteres (256 bits)';
  perform set_config('teste.familia_a', r->>'familia_id', true);
  perform set_config('teste.codigo_a',  r->>'codigo',     true);

  r := public.admin_criar_familia('Família Teste B');
  perform set_config('teste.familia_b', r->>'familia_id', true);
  perform set_config('teste.codigo_b',  r->>'codigo',     true);

  assert current_setting('teste.codigo_a') <> current_setting('teste.codigo_b'),
    'FALHA 1: códigos iguais';
  raise notice 'OK 1: administrador criou duas famílias e recebeu os códigos';
end $$;

-- -------------------------------------- 2. usuário logado que NÃO é administrador
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a002","role":"authenticated"}', true);

do $$
declare n integer;
begin
  begin
    perform public.admin_criar_familia('Intrusa');
    raise exception 'FALHA 2a: usuário comum conseguiu criar família';
  exception when insufficient_privilege then null;
  end;

  select count(*) into n from public.familias;     assert n = 0, 'FALHA 2b: usuário comum viu famílias';
  select count(id) into n from public.links_acesso; assert n = 0, 'FALHA 2c: usuário comum viu links';
  select count(*) into n from public.registros;    assert n = 0, 'FALHA 2d: usuário comum viu registros';

  begin
    perform 1 from public.admins;
    raise exception 'FALHA 2e: usuário comum leu a tabela admins';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK 2: usuário comum não vê nem administra nada';
end $$;

-- ----------------------------------------------- 3. visitante (anon) sem acesso direto
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
declare t text;
begin
  foreach t in array array['public.familias','public.links_acesso','public.registros','public.admins']
  loop
    begin
      execute format('select 1 from %s limit 1', t);
      raise exception 'FALHA 3a: visitante leu %', t;
    exception when insufficient_privilege then null;
    end;
  end loop;

  begin
    insert into public.registros (familia_id, ocorrido_em) values (gen_random_uuid(), now());
    raise exception 'FALHA 3b: visitante inseriu registro diretamente';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.registros set antecedente = 'x';
    raise exception 'FALHA 3c: visitante alterou registros';
  exception when insufficient_privilege then null;
  end;
  begin
    delete from public.registros;
    raise exception 'FALHA 3d: visitante apagou registros';
  exception when insufficient_privilege then null;
  end;
  begin
    perform abc_interno.resolver_codigo('x');
    raise exception 'FALHA 3e: visitante chamou função interna';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.admin_criar_familia('Intrusa');
    raise exception 'FALHA 3f: visitante chamou função de administrador';
  exception when insufficient_privilege then null;
  end;
  begin
    perform public.eh_admin();
    raise exception 'FALHA 3g: visitante chamou eh_admin';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK 3: visitante não acessa tabelas nem funções restritas';
end $$;

-- ------------------------------------------------ 4. limites do próprio administrador
reset role;
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  n  integer;
  fa uuid := current_setting('teste.familia_a')::uuid;
  fb uuid := current_setting('teste.familia_b')::uuid;
begin
  select count(*) into n from public.familias where id in (fa, fb);
  assert n = 2, 'FALHA 4a: administrador não enxergou as famílias';
  select count(id) into n from public.links_acesso where familia_id in (fa, fb);
  assert n = 2, 'FALHA 4b: administrador não enxergou os links';

  begin
    perform token_hash from public.links_acesso;
    raise exception 'FALHA 4c: administrador leu o hash do código';
  exception when insufficient_privilege then null;
  end;
  begin
    insert into public.registros (familia_id, ocorrido_em) values (fa, now());
    raise exception 'FALHA 4d: administrador inseriu registro diretamente';
  exception when insufficient_privilege then null;
  end;
  begin
    update public.familias set criada_em = now();
    raise exception 'FALHA 4e: administrador alterou coluna não permitida';
  exception when insufficient_privilege then null;
  end;
  raise notice 'OK 4: administrador vê famílias e links (sem hash) e não altera registros';
end $$;

-- ----------------------------------------------------- 5. isolamento entre famílias
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
declare
  ca text := current_setting('teste.codigo_a');
  cb text := current_setting('teste.codigo_b');
  r  jsonb;
begin
  r := public.familia_validar_acesso(ca);
  assert (r->>'ok')::boolean, 'FALHA 5a: código A deveria ser válido';
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 5b: código B deveria ser válido';

  r := public.familia_criar_registro(ca, now(), 'FAMILIA-A antecedente 1', 'comportamento', 'intervenção', 'consequência');
  assert (r->>'ok')::boolean, 'FALHA 5c: família A não conseguiu criar registro';
  r := public.familia_criar_registro(ca, now() - interval '1 hour', 'FAMILIA-A antecedente 2', 'comportamento', '', '');
  assert (r->>'ok')::boolean, 'FALHA 5d: família A não conseguiu criar o segundo registro';
  r := public.familia_criar_registro(cb, now(), 'FAMILIA-B antecedente 1', 'comportamento', 'intervenção', 'consequência');
  assert (r->>'ok')::boolean, 'FALHA 5e: família B não conseguiu criar registro';

  r := public.familia_listar_registros(ca);
  assert jsonb_array_length(r->'registros') = 2,    'FALHA 5f: família A deveria ver exatamente 2 registros';
  assert position('FAMILIA-B' in r::text) = 0,      'FALHA 5g: família A viu dados da família B';

  r := public.familia_listar_registros(cb);
  assert jsonb_array_length(r->'registros') = 1,    'FALHA 5h: família B deveria ver exatamente 1 registro';
  assert position('FAMILIA-A' in r::text) = 0,      'FALHA 5i: família B viu dados da família A';

  raise notice 'OK 5: cada família vê somente os próprios registros';
end $$;

-- --------------------------------- 6. validações e códigos inválidos (visitante)
do $$
declare
  ca text := current_setting('teste.codigo_a');
  r  jsonb;
begin
  r := public.familia_validar_acesso('codigo-invalido');
  assert not (r->>'ok')::boolean and r->>'erro' = 'link_invalido', 'FALHA 6a: código inválido aceito';
  r := public.familia_validar_acesso(repeat('A', 43));
  assert not (r->>'ok')::boolean and r->>'erro' = 'link_invalido', 'FALHA 6b: código inexistente aceito';
  r := public.familia_validar_acesso(null);
  assert not (r->>'ok')::boolean and r->>'erro' = 'link_invalido', 'FALHA 6c: código nulo aceito';

  r := public.familia_criar_registro(ca, now() + interval '3 days', 'x', '', '', '');
  assert r->>'erro' = 'data_invalida', 'FALHA 6d: data futura aceita';
  r := public.familia_criar_registro(ca, now(), '', '', '', '   ');
  assert r->>'erro' = 'registro_vazio', 'FALHA 6e: registro vazio aceito';
  r := public.familia_criar_registro(ca, now(), repeat('x', 5001), '', '', '');
  assert r->>'erro' = 'texto_muito_longo', 'FALHA 6f: texto acima do limite aceito';

  r := public.familia_listar_registros(ca);
  assert jsonb_array_length(r->'registros') = 2, 'FALHA 6g: registros inválidos foram gravados';
  raise notice 'OK 6: códigos inválidos e dados inválidos são recusados';
end $$;

-- ------------------------- 7. o navegador não escolhe a família + só hash no banco
reset role;

do $$
declare
  n  integer;
  ca text := current_setting('teste.codigo_a');
begin
  select count(*) into n
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname like 'familia\_%';
  assert n = 3, 'FALHA 7a: esperadas 3 funções de família';

  select count(*) into n
    from pg_proc p join pg_namespace s on s.oid = p.pronamespace
   where s.nspname = 'public' and p.proname like 'familia\_%'
     and exists (select 1 from unnest(p.proargnames) a where a ilike '%familia%');
  assert n = 0, 'FALHA 7b: alguma função de família aceita identificador de família';

  select count(*) into n from public.links_acesso l
   where l.token_hash = extensions.digest(ca, 'sha256');
  assert n = 1, 'FALHA 7c: hash do código não encontrado';

  select count(*) into n from public.links_acesso l where position(ca in l::text) > 0;
  assert n = 0, 'FALHA 7d: o código original aparece na tabela';

  raise notice 'OK 7: família é descoberta pelo servidor e só o hash é armazenado';
end $$;

-- ----------------------------------------- 8. revogar e substituir link (administrador)
select set_config('request.jwt.claims',
  '{"sub":"00000000-0000-0000-0000-00000000a001","role":"authenticated"}', true);
set local role authenticated;

do $$
declare
  fa     uuid := current_setting('teste.familia_a')::uuid;
  antigo text := current_setting('teste.codigo_a');
  cb     text := current_setting('teste.codigo_b');
  v_link uuid;
  novo   text;
  n      integer;
  r      jsonb;
begin
  -- revogar
  select id into v_link from public.links_acesso where familia_id = fa and revogado_em is null;
  perform public.admin_revogar_link(v_link);

  r := public.familia_validar_acesso(antigo);
  assert not (r->>'ok')::boolean, 'FALHA 8a: link revogado ainda funciona';
  r := public.familia_criar_registro(antigo, now(), 'x', '', '', '');
  assert not (r->>'ok')::boolean, 'FALHA 8b: link revogado ainda cria registro';
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 8c: revogar a família A afetou a família B';

  -- substituir
  r := public.admin_substituir_link(fa);
  novo := r->>'codigo';
  assert length(novo) = 43 and novo <> antigo, 'FALHA 8d: novo código inválido';

  r := public.familia_validar_acesso(novo);
  assert (r->>'ok')::boolean, 'FALHA 8e: novo link não funciona';
  r := public.familia_validar_acesso(antigo);
  assert not (r->>'ok')::boolean, 'FALHA 8f: link antigo voltou a funcionar';

  r := public.familia_listar_registros(novo);
  assert jsonb_array_length(r->'registros') = 2, 'FALHA 8g: registros não foram preservados';

  select count(id) into n from public.links_acesso where familia_id = fa and revogado_em is null;
  assert n = 1, 'FALHA 8h: deve existir exatamente um link ativo por família';

  perform set_config('teste.codigo_a', novo, true);
  raise notice 'OK 8: revogação e substituição de links funcionam';
end $$;

-- ------------------------------------------------ 9. família inativa e exclusão total
do $$
declare
  fb uuid := current_setting('teste.familia_b')::uuid;
  cb text := current_setting('teste.codigo_b');
  fc uuid;
  cc text;
  n  integer;
  r  jsonb;
begin
  -- inativar bloqueia o link; reativar restabelece
  update public.familias set ativa = false where id = fb;
  r := public.familia_validar_acesso(cb);
  assert not (r->>'ok')::boolean, 'FALHA 9a: família inativa ainda acessa';
  update public.familias set ativa = true where id = fb;
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 9b: família reativada não acessa';

  -- excluir família remove links e registros (direito de exclusão - LGPD)
  r := public.admin_criar_familia('Família Teste C');
  fc := (r->>'familia_id')::uuid;
  cc := r->>'codigo';
  r := public.familia_criar_registro(cc, now(), 'FAMILIA-C', '', '', '');
  assert (r->>'ok')::boolean, 'FALHA 9c: não criou registro da família C';

  delete from public.familias where id = fc;
  select count(*) into n from public.registros where familia_id = fc;
  assert n = 0, 'FALHA 9d: registros da família excluída permaneceram';
  select count(id) into n from public.links_acesso where familia_id = fc;
  assert n = 0, 'FALHA 9e: links da família excluída permaneceram';
  r := public.familia_validar_acesso(cc);
  assert not (r->>'ok')::boolean, 'FALHA 9f: código da família excluída ainda funciona';

  raise notice 'OK 9: inativação e exclusão total funcionam';
end $$;

-- ------------------------------------------------ 10. limitação de tentativas
reset role;
select set_config('request.jwt.claims', '', true);
set local role anon;

do $$
declare
  cb text := current_setting('teste.codigo_b');
  r  jsonb;
  i  integer;
begin
  -- (a) cliente SEM IP identificável: não há limite individual; um código válido
  --     nunca é bloqueado; só existe um teto global para códigos inválidos.
  perform set_config('request.headers', '', true);
  for i in 1..310 loop
    r := public.familia_validar_acesso('invalida-sem-ip-' || i);
  end loop;
  assert r->>'erro' = 'muitas_tentativas', 'FALHA 10a: teto global não foi aplicado';
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 10b: código válido foi bloqueado por falhas de clientes sem IP';

  -- (b) cliente COM IP: bloqueio individual, inclusive para código válido
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.7"}', true);
  for i in 1..25 loop
    r := public.familia_validar_acesso('invalida-com-ip-' || i);
  end loop;
  assert r->>'erro' = 'muitas_tentativas', 'FALHA 10c: não houve bloqueio após muitas falhas';
  r := public.familia_validar_acesso(cb);
  assert r->>'erro' = 'muitas_tentativas', 'FALHA 10d: o bloqueio deveria valer para o mesmo IP';

  -- (c) outros clientes não são afetados
  perform set_config('request.headers', '{"cf-connecting-ip":"203.0.113.8"}', true);
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 10e: outro IP foi bloqueado indevidamente';
  perform set_config('request.headers', '', true);
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 10f: cliente sem IP foi bloqueado pelo bloqueio de outro IP';

  -- (d) cabeçalho que não parece um IP é tratado como "sem IP"
  perform set_config('request.headers', '{"cf-connecting-ip":"lixo qualquer"}', true);
  r := public.familia_validar_acesso(cb);
  assert (r->>'ok')::boolean, 'FALHA 10g: cabeçalho inválido causou bloqueio';

  raise notice 'OK 10: limitação de tentativas funciona e não faz clientes compartilharem limite';
end $$;

-- (e) extração do IP a partir dos cabeçalhos (como postgres, função interna)
reset role;

do $$
begin
  perform set_config('request.headers',
    '{"cf-connecting-ip":"203.0.113.7","x-forwarded-for":"198.51.100.1, 10.0.0.1"}', true);
  assert abc_interno.ip_cliente() = '203.0.113.7', 'FALHA 10h: cf-connecting-ip deveria ter prioridade';

  perform set_config('request.headers', '{"x-forwarded-for":"198.51.100.1, 10.0.0.1"}', true);
  assert abc_interno.ip_cliente() = '198.51.100.1', 'FALHA 10i: deveria usar o primeiro IP de x-forwarded-for';

  perform set_config('request.headers', '{"x-forwarded-for":"2001:db8::1"}', true);
  assert abc_interno.ip_cliente() = '2001:db8::1', 'FALHA 10j: IPv6 não reconhecido';

  perform set_config('request.headers', '{"cf-connecting-ip":"lixo","x-forwarded-for":"198.51.100.1"}', true);
  assert abc_interno.ip_cliente() = '198.51.100.1', 'FALHA 10k: valor inválido deveria ser ignorado';

  perform set_config('request.headers', '{}', true);
  assert abc_interno.ip_cliente() is null, 'FALHA 10l: sem cabeçalhos deveria retornar NULL';

  perform set_config('request.headers', '', true);
  assert abc_interno.ip_cliente() is null, 'FALHA 10m: cabeçalhos vazios deveriam retornar NULL';

  raise notice 'OK 10 (IP): extração do IP dos cabeçalhos está correta';
end $$;

-- -------------------------------------------------------------------- fim
reset role;
rollback;   -- descarta TODOS os dados de teste

select 'OK: todos os testes passaram. Dados de teste descartados (rollback).' as resultado;
