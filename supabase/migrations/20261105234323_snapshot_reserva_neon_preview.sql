BEGIN;
CREATE OR REPLACE FUNCTION public.exportar_snapshot_reserva_preview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = pg_catalog
AS $snapshot$
DECLARE
    table_info record;
    sequence_info record;
    table_rows jsonb;
    next_sequence_value numeric;
    was_called boolean;
    catalog jsonb;
    table_data jsonb := '[]'::jsonb;
    sequence_data jsonb := '[]'::jsonb;
BEGIN
    IF EXISTS (SELECT FROM public.usuarios WHERE auth_user_id IS NOT NULL) THEN
        RAISE EXCEPTION 'O snapshot depende do Supabase Auth';
    END IF;
    SELECT jsonb_build_object(
  'tables', (SELECT jsonb_agg(jsonb_build_object(
    'name', c.relname, 'rls', c.relrowsecurity, 'kind', c.relkind,
    'columns', (SELECT jsonb_agg(jsonb_build_object(
      'name', a.attname, 'type', format_type(a.atttypid,a.atttypmod),
      'generated', a.attgenerated, 'identity', a.attidentity,
      'not_null', a.attnotnull, 'default', pg_get_expr(d.adbin,d.adrelid)
    ) ORDER BY a.attnum) FROM pg_attribute a LEFT JOIN pg_attrdef d
      ON d.adrelid=a.attrelid AND d.adnum=a.attnum
      WHERE a.attrelid=c.oid AND a.attnum>0 AND NOT a.attisdropped),
    'constraints', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', con.conname, 'definition', replace(pg_get_constraintdef(con.oid),
        'reserve_auth.users','auth.users')) ORDER BY con.conname),'[]'::jsonb)
      FROM pg_constraint con WHERE con.conrelid=c.oid AND con.contype<>'n'),
    'triggers', (SELECT coalesce(jsonb_agg(jsonb_build_object(
      'name', t.tgname, 'enabled', t.tgenabled, 'definition', pg_get_triggerdef(t.oid)
    ) ORDER BY t.tgname),'[]'::jsonb) FROM pg_trigger t
      WHERE t.tgrelid=c.oid AND NOT t.tgisinternal)
  ) ORDER BY c.relname) FROM pg_class c WHERE c.relnamespace='public'::regnamespace
      AND c.relkind IN ('r','p')),
  'routines', (SELECT coalesce(jsonb_agg(pg_get_functiondef(p.oid)
    ORDER BY p.oid::regprocedure::text),'[]'::jsonb)
    FROM pg_proc p WHERE p.pronamespace='public'::regnamespace
      AND p.prokind IN ('f','p') AND p.proname<>'exportar_snapshot_reserva_preview')
) AS catalog INTO catalog;
    FOR table_info IN
        SELECT c.relname FROM pg_class c
        WHERE c.relnamespace='public'::regnamespace AND c.relkind='r'
        ORDER BY c.relname
    LOOP
        EXECUTE format('SELECT coalesce(jsonb_agg(row_to_json(t)::text),''[]''::jsonb) FROM public.%I t', table_info.relname)
        INTO table_rows;
        table_data := table_data || jsonb_build_array(jsonb_build_object('name',table_info.relname,'rows',table_rows));
    END LOOP;
    FOR sequence_info IN
        SELECT c.relname, s.seqincrement FROM pg_class c JOIN pg_sequence s ON s.seqrelid=c.oid
        WHERE c.relnamespace='public'::regnamespace ORDER BY c.relname
    LOOP
        EXECUTE format('SELECT last_value,is_called FROM public.%I',sequence_info.relname)
        INTO next_sequence_value,was_called;
        IF was_called THEN next_sequence_value := next_sequence_value + sequence_info.seqincrement; END IF;
        sequence_data := sequence_data || jsonb_build_array(jsonb_build_object(
            'name',sequence_info.relname,'next_value',next_sequence_value::text));
    END LOOP;
    RETURN jsonb_build_object('source','qqhcjieymypowunkixmk',
        'captured_at',statement_timestamp(),'catalog',catalog,'tables',table_data,'sequences',sequence_data,
        'objects',(SELECT coalesce(jsonb_agg(jsonb_build_object(
            'bucket',o.bucket_id,'path',o.name,'id',o.id,'version',to_jsonb(o)->>'version',
            'size',(o.metadata->>'size')::bigint,'content_type',o.metadata->>'mimetype'
        ) ORDER BY o.bucket_id,o.name),'[]'::jsonb) FROM storage.objects o));
END;
$snapshot$;
REVOKE ALL ON FUNCTION public.exportar_snapshot_reserva_preview() FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.exportar_snapshot_reserva_preview() TO service_role;
COMMIT;
