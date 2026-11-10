-- Only the private staging bucket accepts originals in image format.
-- Business document buckets continue receiving canonical PDFs after validation/OCR.
update storage.buckets
set allowed_mime_types = array['application/pdf', 'image/jpeg', 'image/png']
where id = 'contingency-uploads' and public = false;
