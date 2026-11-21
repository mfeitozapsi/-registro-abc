-- =============================================================================
-- REGISTRO ABC | Migração 2: funções internas
-- As funções de abc_interno NÃO são acessíveis pela API: só são chamadas por
-- outras funções (SECURITY DEFINER) deste projeto.
-- Todas usam search_path vazio e nomes totalmente qualificados.
-- =============================================================================

-- Endereço IP do cliente, ou NULL quando não for possível identificá-lo.
-- Ordem de preferência (conforme a documentação do Supabase):
--   1) cf-connecting-ip : definido pela plataforma Supabase em cada requisição;
--   2) x-forwarded-for  : primeiro endereço da lista (recomendado pelo Supabase).
-- Valores que não pareçam um endereço IP são ignorados. NULL significa "cliente
-- não identificado": nesse caso NÃO existe limite individual (ver resolver_codigo),
-- para que usuários sem IP identificável nunca compartilhem um mesmo limite.
create or replace function abc_interno.ip_cliente()
returns text
language sql stable
set search_path = ''
as $$
  select t.ip
    from (
      select nullif(btrim(h.j ->> 'cf-connecting-ip'), '') as ip, 1 as ordem
        from (select nullif(current_setting('request.headers', true), '')::json as j) h
      union all
      select nullif(btrim(split_part(coalesce(h.j ->> 'x-forwarded-for', ''), ',', 1)), ''), 2
        from (select nullif(current_setting('request.headers', true), '')::json as j) h
    ) t
   where t.ip ~ '^[0-9A-Fa-f:.]{3,45}$'
   order by t.ordem
   limit 1;
$$;

-- Código de acesso: 32 bytes aleatórios (256 bits) em base64 seguro para URL.
-- Resultado: 43 caracteres [A-Za-z0-9_-].
create or replace function abc_interno.gerar_codigo()
returns text
language sql volatile
set search_path = ''
as $$
  select translate(encode(extensions.gen_random_bytes(32), 'base64'), '+/=', '-_');
$$;

-- Valida o código recebido e descobre a família a partir dele.
-- Nunca lança exceção para código inválido (para que o registro da tentativa
-- falha não seja desfeito pelo rollback); devolve o motivo em o_erro.
--   o_erro = null                 -> válido
--   o_erro = 'link_invalido'      -> inexistente, revogado ou família inativa
--   o_erro = 'muitas_tentativas'  -> bloqueio temporário
--
-- Limitação de tentativas:
--  * Cliente IDENTIFICADO: 20 falhas em 15 min => bloqueio de 15 min, verificado
--    ANTES de olhar o código (vale também para código válido, desse IP).
--  * Cliente NÃO identificado: não há limite individual e um código VÁLIDO nunca
--    é bloqueado. Existe apenas um teto global de 300 falhas em 15 min, aplicado
--    somente a códigos inválidos, para evitar crescimento da tabela de falhas.
create or replace function abc_interno.resolver_codigo(
  p_codigo text,
  out o_familia_id uuid,
  out o_link_id    uuid,
  out o_erro       text
)
language plpgsql volatile security definer
set search_path = ''
as $$
declare
  v_ip     text  := abc_interno.ip_cliente();
  v_chave  bytea := case when v_ip is null then null
                         else extensions.digest(v_ip, 'sha256') end;
  v_falhas integer;
begin
  if v_chave is not null then
    select count(*) into v_falhas
      from abc_interno.tentativas_falhas
     where chave = v_chave and criada_em > now() - interval '15 minutes';

    if v_falhas >= 20 then
      o_erro := 'muitas_tentativas';
      return;
    end if;
  end if;

  -- O formato é verificado antes de consultar o banco.
  if p_codigo is not null and p_codigo ~ '^[A-Za-z0-9_-]{43}$' then
    select l.id, l.familia_id
      into o_link_id, o_familia_id
      from public.links_acesso l
      join public.familias f on f.id = l.familia_id
     where l.token_hash = extensions.digest(p_codigo, 'sha256')
       and l.revogado_em is null
       and f.ativa;
  end if;

  if o_familia_id is null then
    o_link_id := null;

    if v_chave is null then
      select count(*) into v_falhas
        from abc_interno.tentativas_falhas
       where chave is null and criada_em > now() - interval '15 minutes';

      if v_falhas >= 300 then
        o_erro := 'muitas_tentativas';
        return;
      end if;
    end if;

    insert into abc_interno.tentativas_falhas (chave) values (v_chave);
    delete from abc_interno.tentativas_falhas where criada_em < now() - interval '1 day';
    o_erro := 'link_invalido';
    return;
  end if;

  -- Atualiza "último uso" no máximo a cada 10 minutos.
  update public.links_acesso
     set ultimo_uso_em = now()
   where id = o_link_id
     and (ultimo_uso_em is null or ultimo_uso_em < now() - interval '10 minutes');
end;
$$;

-- O usuário autenticado atual é administrador?
create or replace function public.eh_admin()
returns boolean
language sql stable security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins a where a.user_id = (select auth.uid()));
$$;

-- Interrompe a execução se o usuário atual não for administrador.
create or replace function abc_interno.exigir_admin()
returns void
language plpgsql security definer
set search_path = ''
as $$
begin
  if not public.eh_admin() then
    raise exception 'acesso_negado' using errcode = '42501';
  end if;
end;
$$;

-- Permissões: funções internas nunca para a API.
revoke all on all functions in schema abc_interno from public, anon, authenticated;
revoke all on function public.eh_admin() from public, anon, authenticated;
grant execute on function public.eh_admin() to authenticated;  -- usada nas políticas RLS
