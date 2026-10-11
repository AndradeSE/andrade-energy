BEGIN;
ALTER TABLE public.unidades_consumidoras
  ADD COLUMN IF NOT EXISTS plano_contrato text NOT NULL DEFAULT 'COM_FIDELIDADE';
ALTER TABLE public.unidades_consumidoras
  ADD CONSTRAINT unidades_consumidoras_plano_contrato_check
  CHECK (plano_contrato IN ('COM_FIDELIDADE', 'SEM_FIDELIDADE'));
COMMENT ON COLUMN public.unidades_consumidoras.plano_contrato IS
  'Plano proposto da UC. Condições assinadas permanecem no snapshot imutável do contrato.';
ALTER TABLE public.solicitacoes_cancelamento_contrato
  ADD COLUMN IF NOT EXISTS aceito_em timestamptz,
  ADD COLUMN IF NOT EXISTS aceito_por uuid REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS desligamento_confirmado_em timestamptz,
  ADD COLUMN IF NOT EXISTS desligamento_confirmado_por uuid REFERENCES public.usuarios(id),
  ADD COLUMN IF NOT EXISTS desligamento_efetivo_em date,
  ADD COLUMN IF NOT EXISTS protocolo_desligamento text;
NOTIFY pgrst, 'reload schema';
COMMIT;
