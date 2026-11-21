-- =============================================================================
-- REGISTRO ABC | Migração 3: funções chamadas pelo app das famílias
-- Nenhuma delas recebe o identificador da família: ele é descoberto no servidor
-- a partir do código validado. O navegador não escolhe a família.
-- Retornam sempre jsonb: {"ok": true, ...} ou {"ok": false, "erro": "..."}.
-- =============================================================================

-- Verifica se o código é válido (usado ao abrir o link).
create or replace function public.familia_validar_acesso(p_codigo text)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  r record;
begin
  select * into r from abc_interno.resolver_codigo(p_codigo);
  if r.o_erro is not null then
    return jsonb_build_object('ok', false, 'erro', r.o_erro);
  end if;
  return jsonb_build_object('ok', true);
end;
$$;

-- Cria um registro para a família dona do código. Não há função de editar
-- nem de apagar: os responsáveis só criam e consultam.
-- Erros possíveis: link_invalido, muitas_tentativas, data_invalida,
-- texto_muito_longo, registro_vazio, limite_diario.
create or replace function public.familia_criar_registro(
  p_codigo        text,
  p_ocorrido_em   timestamptz,
  p_antecedente   text,
  p_comportamento text,
  p_intervencao   text,
  p_consequencia  text
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  r       record;
  v_ant   text := coalesce(p_antecedente, '');
  v_comp  text := coalesce(p_comportamento, '');
  v_int   text := coalesce(p_intervencao, '');
  v_cons  text := coalesce(p_consequencia, '');
  v_total integer;
  v_id    uuid;
  v_criado timestamptz;
begin
  select * into r from abc_interno.resolver_codigo(p_codigo);
  if r.o_erro is not null then
    return jsonb_build_object('ok', false, 'erro', r.o_erro);
  end if;

  if p_ocorrido_em is null
     or p_ocorrido_em > now() + interval '1 day'
     or p_ocorrido_em < timestamptz '2000-01-01' then
    return jsonb_build_object('ok', false, 'erro', 'data_invalida');
  end if;

  if greatest(char_length(v_ant), char_length(v_comp), char_length(v_int), char_length(v_cons)) > 5000 then
    return jsonb_build_object('ok', false, 'erro', 'texto_muito_longo');
  end if;

  if btrim(v_ant) = '' and btrim(v_comp) = '' and btrim(v_int) = '' and btrim(v_cons) = '' then
    return jsonb_build_object('ok', false, 'erro', 'registro_vazio');
  end if;

  -- Proteção contra uso abusivo: no máximo 100 registros por família a cada 24 h.
  select count(*) into v_total
    from public.registros g
   where g.familia_id = r.o_familia_id
     and g.criado_em > now() - interval '24 hours';
  if v_total >= 100 then
    return jsonb_build_object('ok', false, 'erro', 'limite_diario');
  end if;

  insert into public.registros
    (familia_id, ocorrido_em, antecedente, comportamento, intervencao, consequencia)
  values
    (r.o_familia_id, p_ocorrido_em, v_ant, v_comp, v_int, v_cons)
  returning id, criado_em into v_id, v_criado;

  return jsonb_build_object('ok', true, 'id', v_id, 'criado_em', v_criado);
end;
$$;

-- Lista os registros da família dona do código (mais recentes primeiro).
create or replace function public.familia_listar_registros(
  p_codigo       text,
  p_limite       integer default 50,
  p_deslocamento integer default 0
)
returns jsonb
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  r        record;
  v_limite integer := least(greatest(coalesce(p_limite, 50), 1), 100);
  v_desloc integer := greatest(coalesce(p_deslocamento, 0), 0);
  v_lista  jsonb;
begin
  select * into r from abc_interno.resolver_codigo(p_codigo);
  if r.o_erro is not null then
    return jsonb_build_object('ok', false, 'erro', r.o_erro);
  end if;

  select coalesce(jsonb_agg(to_jsonb(x) order by x.ocorrido_em desc, x.id desc), '[]'::jsonb)
    into v_lista
    from (
      select g.id, g.ocorrido_em, g.antecedente, g.comportamento,
             g.intervencao, g.consequencia, g.criado_em
        from public.registros g
       where g.familia_id = r.o_familia_id
       order by g.ocorrido_em desc, g.id desc
       limit v_limite offset v_desloc
    ) x;

  return jsonb_build_object('ok', true, 'registros', v_lista);
end;
$$;

-- Permissões: somente estas três funções ficam disponíveis, para visitantes (anon)
-- e para usuários logados (authenticated).
revoke all on function public.familia_validar_acesso(text)
  from public, anon, authenticated;
revoke all on function public.familia_criar_registro(text, timestamptz, text, text, text, text)
  from public, anon, authenticated;
revoke all on function public.familia_listar_registros(text, integer, integer)
  from public, anon, authenticated;

grant execute on function public.familia_validar_acesso(text)                                  to anon, authenticated;
grant execute on function public.familia_criar_registro(text, timestamptz, text, text, text, text) to anon, authenticated;
grant execute on function public.familia_listar_registros(text, integer, integer)              to anon, authenticated;
