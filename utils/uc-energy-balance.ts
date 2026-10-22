const digits = (value: unknown) => String(value ?? "").replace(/\D/g, "");
const months = ["JAN","FEV","MAR","ABR","MAI","JUN","JUL","AGO","SET","OUT","NOV","DEZ"];
function period(value: unknown) {
  const text = String(value ?? "").trim().toUpperCase();
  const iso = /^(20\d{2})-(\d{2})(?:-\d{2})?$/.exec(text);
  const br = /^([A-Z]{3}|\d{1,2})\/(20\d{2})$/.exec(text);
  const month = iso ? Number(iso[2]) : br ? (/^\d+$/.test(br[1]) ? Number(br[1]) : months.indexOf(br[1])+1) : 0;
  return month >= 1 && month <= 12 ? Number(iso?.[1] ?? br?.[2]) * 100 + month : 0;
}
export function currentUnitEnergyBalance(number: string, clientId: string | undefined, invoices: any[], attachments: any[]) {
  const candidates = [
    ...invoices.filter(f => !["CANCELADO","CANCELADA","RASCUNHO"].includes(String(f.status).toUpperCase())).map(f => ({number:f.numero_instalacao,clientId:f.cliente_id,reference:f.referencia,balance:f.saldo_atual,original:false})),
    ...attachments.map(a => ({number:a.dadosFatura?.uc ?? a.dadosFatura?.numero_instalacao,clientId:a.cliente_id,reference:a.dadosFatura?.referencia,balance:a.dadosFatura?.saldoAtual,original:true})),
  ].flatMap(f => {
    if (!digits(number) || digits(f.number) !== digits(number) || (clientId && f.clientId && f.clientId !== clientId) || f.balance == null || String(f.balance).trim() === "") return [];
    const text = String(f.balance);
    const balance = typeof f.balance === "number" ? f.balance : Number(text.includes(",") ? text.replace(/\./g, "").replace(",", ".") : text);
    const order = period(f.reference);
    return order && Number.isFinite(balance) && balance >= 0 ? [{balance,reference:String(f.reference),order,original:f.original}] : [];
  }).sort((a,b) => b.order-a.order || Number(b.original)-Number(a.original));
  return candidates[0];
}
