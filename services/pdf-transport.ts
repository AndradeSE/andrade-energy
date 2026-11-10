import api,{contingencyRoutingEnabled} from '../config/api';
import {Platform} from 'react-native';
import {isPreviewEnvironment} from '../config/environment';
import {pdfUploadMetadata,validatePreviewPdfUpload} from './pdf-upload-policy';

/** Upload bytes once; the final business operation is never replayed automatically. */
export async function sendPdf(uri:string,endpoint:string,name='documento.pdf',fields:Record<string,unknown>={},field='arquivo') {
  if(Platform.OS!=='web' && (isPreviewEnvironment || contingencyRoutingEnabled)) {
    const {File}=await import('expo-file-system');
    const {fetch:nativeFetch}=await import('expo/fetch');
    const file=new File(uri);
    if(!file.exists)throw new Error('Selecione uma fatura PDF ou foto disponível no aparelho.');
    const metadata=pdfUploadMetadata(name,file.size);
    const {data:prepared}=await api.post('/uploads/preparar',metadata,{timeout:20_000});
    const ticket=validatePreviewPdfUpload(prepared,file.size,isPreviewEnvironment?'preview':'production');
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),60_000);
    try {
      const response=await nativeFetch(ticket.uploadUrl,{method:'PUT',headers:{'Content-Type':metadata.tipo,'x-upsert':'false'},body:file,signal:controller.signal});
      if(!response.ok)throw new Error('Não foi possível enviar o PDF. Prepare um novo envio.');
    } finally {clearTimeout(timer);}
    return (await api.post(endpoint,{...fields,uploadedFileId:ticket.uploadId},{timeout:60_000})).data;
  }
  const form=new FormData();
  const type = /\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : 'application/pdf';
  if (Platform.OS === 'web') {
    const response = await fetch(uri);
    if (!response.ok) throw new Error('Não foi possível abrir a fatura selecionada.');
    form.append(field, await response.blob(), name);
  } else form.append(field,{uri,name,type} as any);
  for(const [key,value] of Object.entries(fields))if(value!==undefined && value!==null)form.append(key,String(value));
  return (await api.post(endpoint,form,{timeout:60_000})).data;
}
