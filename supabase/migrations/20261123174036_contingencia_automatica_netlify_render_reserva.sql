create extension if not exists http with schema extensions;
create schema if not exists contingencia_privada;
revoke all on schema contingencia_privada from public, anon, authenticated;

create table contingencia_privada.sonda_netlify (
  id boolean primary key default true check (id),
  revisao bigint not null,
  observado_em timestamptz not null,
  falhas integer not null check (falhas >= 0),
  resultado text not null
);

create function contingencia_privada.registrar_sonda_netlify(p_sonda jsonb)
returns text language plpgsql set search_path = '' as $$
declare
  controle public.contingencia_controle;
  anterior contingencia_privada.sonda_netlify;
  agora timestamptz := clock_timestamp();
  falhas integer := 0;
  resultado text := 'SEM_EVIDENCIA';
begin
  select * into controle from public.contingencia_controle where id for update;
  if controle.executor is distinct from 'NETLIFY' then return 'NETLIFY_INATIVO'; end if;
  if not exists(select 1 from public.contingencia_automacao where id and ativa) then return 'DESATIVADA'; end if;
  select * into anterior from contingencia_privada.sonda_netlify where id;
  if anterior.observado_em > agora - interval '45 seconds' and anterior.revisao = controle.revisao then
    return 'AGUARDANDO_INTERVALO';
  end if;

  if p_sonda->>'environment' = 'production'
     and p_sonda#>>'{netlify,status}' in ('0','402','429','500','502','503','504','509')
     and p_sonda#>>'{render,status}' = '200'
     and p_sonda#>>'{render,executor}' = 'RENDER_RESERVA'
     and p_sonda#>>'{render,ready}' = 'true'
     and controle.render_reserva_validado_em is not null
     and controle.render_reserva_commit_validado ~ '^[0-9a-f]{40}$'
     and p_sonda#>>'{render,commit}' = left(controle.render_reserva_commit_validado,7) then
    falhas := 1;
    if anterior.revisao = controle.revisao and anterior.observado_em >= agora - interval '3 minutes' then
      falhas := least(anterior.falhas + 1, 2);
    end if;
    resultado := 'CONFIRMANDO_FALHA';
    if falhas >= 2 then
      if exists(select 1 from public.contingencia_requisicoes) or exists (
        select 1 from public.contingencia_trabalhos where estado='EXECUTANDO' and lease_ate>agora
      ) then
        resultado := 'AGUARDANDO_OPERACOES';
      else
        update public.contingencia_trabalhos set estado='REVISAO',atualizado_em=agora
          where estado='EXECUTANDO' and lease_ate<=agora;
        update public.contingencia_controle set executor='RENDER_RESERVA', revisao=revisao+1, atualizado_em=agora
          where id returning * into controle;
        resultado := 'RENDER_RESERVA_ATIVADA';
        insert into public.auditoria_seguranca(empresa_id,usuario_id,acao,recurso,detalhes)
          values('00000000-0000-4000-8000-000000000001',null,'CONTINGENCIA_TROCA_AUTOMATICA','contingencia_controle',
          jsonb_build_object('executor',controle.executor,'revisao',controle.revisao,'motivo','netlify_indisponivel',
            'fonte','sonda_portal','status_netlify',p_sonda#>>'{netlify,status}',
            'trabalhos_em_revisao',(select coalesce(jsonb_agg(nome),'[]'::jsonb) from public.contingencia_trabalhos where estado='REVISAO')));
        perform public.avisar_contingencia_automatica('Render reserva ativado automaticamente',
          'O portal confirmou falhas consecutivas no Netlify e acesso ao Render reserva. Tarefas interrompidas permanecem em revisão.',
          'contingencia-netlify-reserva:'||controle.revisao);
      end if;
    end if;
  elsif p_sonda->>'environment' = 'production' and p_sonda#>>'{netlify,status}' = '200' then
    resultado := 'NETLIFY_ONLINE';
  end if;
  insert into contingencia_privada.sonda_netlify(id,revisao,observado_em,falhas,resultado)
    values(true,controle.revisao,agora,falhas,resultado)
    on conflict(id) do update set revisao=excluded.revisao,observado_em=excluded.observado_em,
      falhas=excluded.falhas,resultado=excluded.resultado;
  return resultado;
end $$;

create function contingencia_privada.monitorar_netlify()
returns text language plpgsql set search_path = '' as $$
declare resposta extensions.http_response; sonda jsonb;
begin
  if not exists(select 1 from public.contingencia_controle where id and executor='NETLIFY')
     or not exists(select 1 from public.contingencia_automacao where id and ativa) then
    return 'MONITOR_INATIVO';
  end if;
  perform set_config('http.curlopt_connecttimeout_msec','3000',true);
  perform set_config('http.curlopt_timeout_msec','12000',true);
  begin
    select * into resposta from extensions.http_get('https://www.andradeenergy.com.br/api/contingencia/sonda');
    if resposta.status=200 then sonda := resposta.content::jsonb; end if;
  exception when others then
    sonda := null;
  end;
  return contingencia_privada.registrar_sonda_netlify(sonda);
end $$;

revoke execute on function contingencia_privada.registrar_sonda_netlify(jsonb) from public, anon, authenticated;
revoke execute on function contingencia_privada.monitorar_netlify() from public, anon, authenticated;

create extension if not exists pg_cron;
select cron.schedule('andrade-contingencia-netlify', '* * * * *', $cron$select contingencia_privada.monitorar_netlify();$cron$);
