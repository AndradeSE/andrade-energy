import { GoogleGenAI } from '@google/genai';

const ai = new GoogleGenAI({
  apiKey: process.env.EXPO_PUBLIC_GEMINI_API_KEY!,
});

export async function analisarFatura(
  pdfUrl: string
) {
  const response =
    await ai.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: `
Você está analisando uma fatura da CEMIG.

URL do PDF:
${pdfUrl}

Retorne APENAS JSON válido.

{
  "referencia": "MM/AAAA",
  "consumo_kwh": 0,
  "valor_total": 0,
  "valor_energia": 0,
  "numero_cliente": "",
  "numero_instalacao": ""
}
`,
    });

  console.log(response.text);

  return response.text;
}