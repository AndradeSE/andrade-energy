-- Retain historical readings/audits; disable further manual registrations.
revoke execute on function public.registrar_cota_manual_adm(uuid,text,text,text,timestamptz,text,numeric,numeric) from service_role;
