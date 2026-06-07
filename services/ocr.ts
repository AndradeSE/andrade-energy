export async function lerFaturaOCR(
  pdfUrl: string
) {
  const response = await fetch(
    'https://api.ocr.space/parse/image',
    {
      method: 'POST',
      headers: {
        apikey:
          process.env.EXPO_PUBLIC_OCR_API_KEY!,
        'Content-Type':
          'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        url: pdfUrl,
        language: 'por',
        isOverlayRequired: 'false',
      }).toString(),
    }
  );

  const json = await response.json();

  return json;
}