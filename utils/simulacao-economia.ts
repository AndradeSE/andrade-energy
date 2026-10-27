export function simularEconomia(conta:number,baseDesconto:number,percentual:number){
 if(![conta,baseDesconto,percentual].every(Number.isFinite)||conta<=0||baseDesconto<0||baseDesconto>conta||percentual<0||percentual>100)throw new Error('Confira os valores: a parcela de energia não pode superar a conta e o desconto deve ficar entre 0% e 100%.');
 const totalCentavos=Math.round(conta*100),baseCentavos=Math.round(baseDesconto*100);
 const economiaCentavos=Math.round(baseCentavos*percentual/100);
 return {contaAtual:totalCentavos/100,energiaComDesconto:(baseCentavos-economiaCentavos)/100,outrosCustos:(totalCentavos-baseCentavos)/100,economiaMensal:economiaCentavos/100,totalEstimado:(totalCentavos-economiaCentavos)/100,economiaAnual:economiaCentavos*12/100,descontoEfetivo:economiaCentavos/totalCentavos*100};
}
