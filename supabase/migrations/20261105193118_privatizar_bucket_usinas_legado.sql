-- Bucket legado com PDFs de teste, sem referências nos registros atuais.
-- Não apagar os arquivos: mantê-los acessíveis somente por autorização/URL assinada.
update storage.buckets
set public = false,
    file_size_limit = 10485760,
    allowed_mime_types = array['application/pdf']::text[]
where id = 'usinas';
