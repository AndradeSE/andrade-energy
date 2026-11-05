#Requires -Version 7.0
param([Parameter(Mandatory)][string]$Archive)

$ErrorActionPreference = 'Stop'
$dump = Get-Item -LiteralPath $Archive
if ($dump.PSIsContainer) { throw 'Informe o arquivo de backup PostgreSQL.' }
if ($env:PGHOST -notmatch '^ep-misty-star-beg2irkr(?:-pooler)?\.[a-z0-9.-]+\.neon\.tech$' -or
    $env:PGDATABASE -notmatch '^andrade_preview_restore_[a-z0-9_]+$' -or
    $env:PGSSLMODE -ne 'verify-full' -or $env:PGSERVICE -or $env:PGHOSTADDR -or !$env:PGUSER) {
    throw 'Use uma conexão TLS verificada com o Neon Preview e um banco isolado andrade_preview_restore_*.'
}

# Render the archive into memory so inspection and import use the same SQL.
$sql = & pg_restore --no-owner --no-privileges --schema=public --file=- $dump.FullName
if ($LASTEXITCODE -ne 0 -or !$sql) { throw 'Não foi possível preparar o backup.' }
$sql = ($sql -join "`n")
$sql = $sql -creplace '(?m)^(    ADD CONSTRAINT usuarios_auth_user_id_fkey FOREIGN KEY \(auth_user_id\) REFERENCES )auth\.users\(id\)', '${1}reserve_auth.users(id)'
$guard = @'
SELECT pg_advisory_xact_lock(7071189);
DO $guard$
BEGIN
    IF current_database() !~ '^andrade_preview_restore_[a-z0-9_]+$'
       OR EXISTS (SELECT FROM pg_class WHERE relnamespace = 'public'::regnamespace)
       OR to_regnamespace('reserve_auth') IS NOT NULL THEN
        RAISE EXCEPTION 'O destino deve ser um banco isolado e vazio';
    END IF;
END
$guard$;
CREATE SCHEMA reserve_auth;
CREATE TABLE reserve_auth.users (id uuid PRIMARY KEY);
REVOKE ALL ON SCHEMA reserve_auth FROM PUBLIC;
'@
$sql = $sql -creplace '(?m)^CREATE SCHEMA public;$', 'CREATE SCHEMA IF NOT EXISTS public;'
$finish = @'
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM PUBLIC;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC;
ALTER DEFAULT PRIVILEGES REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;
SELECT count(*) AS tabelas_restauradas FROM pg_tables WHERE schemaname = 'public';
'@
($guard + "`n" + $sql + "`n" + $finish) | & psql -X -w --single-transaction --set=ON_ERROR_STOP=1 --file=- 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Restauração revertida. Confira a conexão e a compatibilidade do backup.' }
