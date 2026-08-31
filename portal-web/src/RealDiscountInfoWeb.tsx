type Repasse = "REPASSAR" | "ABSORVER" | string;

type Props = {
  desconto: string;
  tipoGd: string;
  modalidadeFaturamento?: string | null;
  dadosFatura?: Record<string, any> | null;
  gd1: Repasse;
  gd2: Repasse;
  fioB: Repasse;
};

export default function RealDiscountInfoWeb({ desconto, tipoGd, modalidadeFaturamento, dadosFatura, gd1, gd2, fioB }: Props) {
  const parsed = Number(String(desconto).replace(",",".")); const value = Number.isFinite(parsed) ? Math.max(0,Math.min(100,parsed)) : 0;
  const tariff = 100-value; const type=tipoGd.toUpperCase(); const transferred:string[]=[];
  if ((!type||type==="GD1"||type==="MISTA")&&gd1==="REPASSAR") transferred.push("disponibilidade GD I");
  if ((!type||type==="GD2"||type==="MISTA")&&gd2==="REPASSAR") transferred.push("disponibilidade GD II");
  if ((!type||type==="GD2"||type==="MISTA")&&fioB==="REPASSAR") transferred.push("Fio B");
  const percent=(n:number)=>`${n.toLocaleString("pt-BR",{maximumFractionDigits:2})}%`;
  const preview=calculatePreview({data:dadosFatura,discount:value,billingMode:modalidadeFaturamento,type,gd1,gd2,fioB});
  const estimate=preview?percent(preview.realDiscount):`Aproximadamente ${percent(value)}`;
  const detail=preview?`${money(preview.savings)} de economia sobre ${money(preview.discountBase)} de energia cheia.${invoiceReference(dadosFatura)}`:transferred.length?`Os custos repassados (${transferred.join(" e ")}) reduzem a economia percebida pelo cliente.`:"A Andrade absorve os custos selecionados; outros encargos ainda podem variar.";
  return <section className="real-discount-info"><header><i>∑</i><div><strong>Como calculamos o desconto real</strong><p>O percentual contratado é aplicado à energia; o real considera tudo que o cliente efetivamente paga.</p></div></header><div className="discount-formula"><article><small>{preview?"PROJEÇÃO PELA ÚLTIMA FATURA":"DESCONTO REAL ESTIMADO"}</small><b>{estimate}</b><span>{detail}</span></article><div><span><small>DESCONTO CONTRATADO</small><b>{percent(value)}</b></span><span><small>TARIFA ANDRADE</small><b>{percent(tariff)} da tarifa cheia</b></span></div><hr/><small>ECONOMIA REAL</small><strong>Valor sem Andrade − total unificado</strong><hr/><small>DESCONTO REAL</small><strong>Economia real ÷ valor da energia cheia × 100</strong></div><p className="discount-impact">{transferred.length?`O desconto parte de ${percent(value)}, mas ${transferred.join(" e ")} permanecem com o cliente. Essas parcelas reduzem o desconto real da competência.`:`A usina assume disponibilidade e Fio B aplicáveis. Assim, o desconto real tende a se aproximar dos ${percent(value)} contratados.`}</p><em>{preview?"A projeção usa os valores da última fatura e recalcula o desconto e as escolhas de repasse ou absorção.":"Importe uma fatura para calcular a porcentagem exata desta UC."}</em></section>;
}

function numberFrom(data: Record<string, any> | null | undefined, ...keys: string[]) { for (const key of keys) { const value=Number(data?.[key]); if (Number.isFinite(value)) return value; } return 0; }
function money(value:number){return value.toLocaleString("pt-BR",{style:"currency",currency:"BRL"});}
function invoiceReference(data:Record<string,any>|null|undefined){const raw=String(data?.referencia??"").trim();if(!raw)return "";const match=/^(\d{4})-(\d{2})/.exec(raw);return ` Base: ${match?`${match[2]}/${match[1]}`:raw}.`;}
function calculatePreview({data,discount,billingMode,type,gd1,gd2,fioB}:{data?:Record<string,any>|null;discount:number;billingMode?:string|null;type:string;gd1:Repasse;gd2:Repasse;fioB:Repasse}){
  if(!data)return null; const fullTariff=numberFrom(data,"tarifa_cheia","tarifaCheia"),utilityValue=numberFrom(data,"valor_cemig","valorTotal"),consumption=numberFrom(data,"consumo_kwh","consumo"),energyGd1=numberFrom(data,"energia_compensada_gd1","energiaCompensadaGD1"),energyGd2=numberFrom(data,"energia_compensada_gd2","energiaCompensadaGD2"),compensated=numberFrom(data,"energia_compensada","energiaCompensada")||energyGd1+energyGd2,injected=numberFrom(data,"energia_injetada","energiaInjetada"),baseKwh=String(billingMode??"COMPENSACAO").toUpperCase()==="INJECAO"?injected:compensated;
  if(fullTariff<=0||utilityValue<=0||baseKwh<=0)return null; const availability=numberFrom(data,"custo_disponibilidade","custoDisponibilidade"),savedWire=numberFrom(data,"diferenca_fio_b","diferencaFioB"),scee=numberFrom(data,"tarifa_scee","tarifaScee"),gd2Tariff=numberFrom(data,"tarifa_gd","tarifaGD2","tarifaGD"),wire=savedWire>0?savedWire:energyGd2>0&&scee>gd2Tariff&&gd2Tariff>0?energyGd2*(scee-gd2Tariff):0,usesGd2=type==="GD2"||type==="MISTA"||energyGd2>0,usesGd1=type==="GD1"||type==="MISTA"||(!usesGd2&&energyGd1>0),absorbsAvailability=usesGd2?gd2==="ABSORVER":usesGd1&&gd1==="ABSORVER",absorbed=Math.min(utilityValue,(absorbsAvailability?availability:0)+(usesGd2&&fioB==="ABSORVER"?wire:0)),energyWithoutGd=Math.max(0,consumption*fullTariff),creditGd1=energyGd1*fullTariff,creditGd2Limit=Math.max(0,energyWithoutGd-numberFrom(data,"valor_energia_concessionaria","valorEnergiaConcessionaria")-creditGd1),creditGd2=energyGd2>0?Math.min(energyGd2*fullTariff,creditGd2Limit):0,effectiveCredit=energyGd1+energyGd2>0?creditGd1+creditGd2:compensated*fullTariff,reference=numberFrom(data,"valor_referencia_sem_andrade")||utilityValue+effectiveCredit,discountBase=usesGd2?energyWithoutGd:Math.max(0,reference-utilityValue);
  if(discountBase<=0)return null; const andradeValue=baseKwh*fullTariff*(1-discount/100),savings=Math.max(0,reference-(Math.max(0,utilityValue-absorbed)+andradeValue)); return {savings,discountBase,realDiscount:savings/discountBase*100};
}
