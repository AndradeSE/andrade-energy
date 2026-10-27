import {useState} from 'react';
import {ScrollView,Text,TextInput,View} from 'react-native';
import {AppHeader,Button,Card,Metric,Screen} from '../components/ui';
import {Colors} from '../theme';
import {simularEconomia} from '../utils/simulacao-economia';

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function numero(s:string){return Number(s.replace(/\./g,'').replace(',','.'));}
export default function SimulacaoEconomia(){
 const [conta,setConta]=useState(''),[base,setBase]=useState(''),[desconto,setDesconto]=useState('');
 const [resultado,setResultado]=useState<ReturnType<typeof simularEconomia>>(),[erro,setErro]=useState('');
 const change=(set:(v:string)=>void)=>(v:string)=>{set(v.replace(/[^\d,]/g,''));setResultado(undefined);setErro('');};
 function calcular(){try{if(!conta||!base||!desconto)throw new Error('Preencha a conta, a parcela de energia e o desconto da proposta.');setResultado(simularEconomia(numero(conta),numero(base),numero(desconto)));setErro('');}catch(e:any){setErro(e.message);setResultado(undefined);}}
 const field=(label:string,value:string,set:(v:string)=>void)=><View style={{gap:8}}><Text style={{color:Colors.text,fontWeight:'600'}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change(set)} keyboardType="decimal-pad" maxLength={14} style={{borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:14,fontSize:18,color:Colors.text,backgroundColor:Colors.surface}}/></View>;
 return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Simular economia" subtitle="Estimativa para o cliente" contextTitle="Comparação de valores" contextSubtitle="Sem criar contrato ou cobrança"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:20,paddingBottom:40}}>
  <Card><View style={{gap:18}}><Text style={{color:Colors.subtitle,lineHeight:22}}>Compare sua conta atual com uma estimativa usando o desconto da proposta Andrade. Esta simulação não cria contrato nem cobrança.</Text>
   {field('Valor atual da conta (R$)',conta,setConta)}
   {field('Parcela de energia elegível ao desconto (R$)',base,setBase)}
   <Text style={{color:Colors.subtitle,lineHeight:21}}>Use o valor da energia que será compensada. Iluminação pública, tributos e custos não abrangidos pelo desconto ficam fora dessa parcela, conforme a proposta. Não inclua saldo excedente acumulado.</Text>
   {field('Desconto da proposta (%)',desconto,setDesconto)}
   <Button title="Simular minha economia" onPress={calcular}/>{erro?<Text accessibilityRole="alert" style={{color:Colors.text}}>{erro}</Text>:null}
  </View></Card>
  {resultado?<><Metric title="Economia estimada por mês" value={money(resultado.economiaMensal)}/><Card><View style={{gap:14}}>
   <Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Comparação mensal</Text>
   {[['Conta atual',resultado.contaAtual],['Energia Andrade após desconto',resultado.energiaComDesconto],['Demais custos mantidos',resultado.outrosCustos],['Total estimado com Andrade',resultado.totalEstimado],['Economia estimada em 12 meses',resultado.economiaAnual]].map(([label,value])=><View key={String(label)} style={{gap:4}}><Text style={{color:Colors.subtitle}}>{label}</Text><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>{money(Number(value))}</Text></View>)}
   <Text style={{color:Colors.subtitle,lineHeight:22}}>A economia anual considera 12 meses iguais. Consumo, tarifas, bandeiras, compensação efetiva e condições do contrato podem alterar o resultado. Valores apenas estimados.</Text>
  </View></Card></>:null}
 </ScrollView></Screen>;
}
