#Requires -Version 7.0
param(
    [Parameter(Mandatory)][string]$Archive,
    [switch]$RequireData
)

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
$dataChecks = [Collections.Generic.List[string]]::new()
$totalRows = 0
foreach ($block in [regex]::Matches($sql, '(?ms)^COPY (public\.[a-z_][a-z0-9_]*) \([^\r\n]+\) FROM stdin;\r?\n(.*?)^\\\.$')) {
    $table = $block.Groups[1].Value
    $body = $block.Groups[2].Value.TrimEnd("`r", "`n")
    $rows = if ($body.Length -eq 0) { 0 } else { ($body -split '\r?\n').Count }
    $totalRows += $rows
    $dataChecks.Add("IF (SELECT count(*) FROM $table) <> $rows THEN RAISE EXCEPTION 'Contagem divergente em $table'; END IF;")
}
if ($RequireData -and $totalRows -eq 0) {
    throw 'O backup precisa conter registros para validar a recuperação dos dados.'
}
$verifyData = if ($dataChecks.Count) {
    'DO $counts$ BEGIN ' + ($dataChecks -join "`n") + ' END $counts$;'
} else { '' }
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
DO $verify$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public')
       OR EXISTS (
           SELECT FROM pg_class
           WHERE relnamespace = 'public'::regnamespace
             AND relkind IN ('r', 'p') AND NOT relrowsecurity
       ) THEN
        RAISE EXCEPTION 'Estrutura pública vazia ou com tabelas sem RLS';
    END IF;
END
$verify$;
SELECT count(*) AS tabelas_restauradas FROM pg_tables WHERE schemaname = 'public';
'@
($guard + "`n" + $sql + "`n" + $finish + "`n" + $verifyData) | & psql -X -w --single-transaction --set=ON_ERROR_STOP=1 --file=- 2>$null
if ($LASTEXITCODE -ne 0) { throw 'Restauração revertida. Confira a conexão e a compatibilidade do backup.' }
