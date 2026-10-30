-- Garante uma única sessão ativa por conta, inclusive quando dois logins
-- acontecem quase ao mesmo tempo em aparelhos diferentes.
with sessoes_duplicadas as (
  select id,
         row_number() over (partition by usuario_id order by created_at desc, id desc) as ordem
  from public.sessoes_usuarios
  where revogada_em is null
)
update public.sessoes_usuarios as sessao
set revogada_em = now()
from sessoes_duplicadas
where sessao.id = sessoes_duplicadas.id
  and sessoes_duplicadas.ordem > 1;

create unique index if not exists sessoes_usuarios_uma_ativa_por_usuario_idx
  on public.sessoes_usuarios (usuario_id)
  where revogada_em is null;
