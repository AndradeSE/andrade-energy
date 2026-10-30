import {useState} from 'react';
import {Keyboard,Text,View} from 'react-native';
import {TextInput} from '../components/assistant/AssistantNativeControls';
import {ElasticScrollView as ScrollView} from '../components/ui';
import {AppHeader,Button,Card,Metric,Screen} from '../components/ui';
import {Colors} from '../theme';
import {simularEconomia} from '../utils/simulacao-economia';

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function numero(s:string){return Number(s.replace(/\./g,'').replace(',','.'));}
export default function SimulacaoEconomia(){
 const [conta,setConta]=useState(''),[base,setBase]=useState(''),[desconto,setDesconto]=useState('');
 const [resultado,setResultado]=useState<ReturnType<typeof simularEconomia>>(),[erro,setErro]=useState('');
 const change=(set:(v:string)=>void,_moeda:boolean)=>(v:string)=>{const partes=v.replace(/\./g,',').replace(/[^\d,]/g,'').split(',');set(partes[0]+(partes.length>1?','+partes.slice(1).join('').slice(0,8):''));setResultado(undefined);setErro('');};
 function calcular(){Keyboard.dismiss();try{if(!conta||!base||!desconto)throw new Error('Preencha o consumo em kWh, a tarifa cheia e o desconto.');const consumo=numero(conta),tarifa=numero(base);if(!Number.isFinite(consumo)||!Number.isFinite(tarifa)||consumo<=0||tarifa<=0)throw new Error('Informe consumo e tarifa maiores que zero.');const energia=consumo*tarifa;setResultado(simularEconomia(energia,energia,numero(desconto)));setErro('');}catch(e:any){setErro(e.message);setResultado(undefined);}}
 const field=(label:string,value:string,set:(v:string)=>void,moeda=true)=><View style={{gap:8}}><Text style={{color:Colors.text,fontWeight:'600'}}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={change(set,moeda)} keyboardType="decimal-pad" maxLength={moeda?22:6} style={{borderWidth:1,borderColor:Colors.border,borderRadius:12,padding:14,fontSize:18,color:Colors.text,backgroundColor:Colors.surface}}/></View>;
 return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Calculadora de economia" subtitle="Estimativa para o cliente" contextTitle="Comparação de valores" contextSubtitle="Sem criar contrato ou cobrança"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:20,paddingBottom:40}}>
  <Card><View style={{gap:18}}><Text style={{color:Colors.subtitle,lineHeight:22}}>Informe a quantidade de energia e o preço cheio de cada kWh para comparar com o desconto oferecido ao cliente.</Text>
   {field('Consumo mensal a compensar (kWh)',conta,setConta)}
   {field('Tarifa cheia atual (R$/kWh)',base,setBase)}
   <Text style={{color:Colors.subtitle,lineHeight:21}}>Preenchimento manual: use a tarifa cheia da fatura do mês, com os impostos e a bandeira aplicáveis à UC. Exemplo: 1,12345678. Iluminação pública e cobranças fixas não entram nesta comparação.</Text>
   {field('Desconto oferecido ao cliente (%)',desconto,setDesconto,false)}
   <Button title="Calcular economia" onPress={calcular}/>{erro?<Text accessibilityRole="alert" style={{color:Colors.text}}>{erro}</Text>:null}
  </View></Card>
  {resultado?<><Metric title="Economia estimada por mês" value={money(resultado.economiaMensal)}/><Card><View style={{gap:14}}>
   <Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>Comparação mensal</Text>
   {[['Energia sem desconto (kWh × tarifa cheia)',resultado.contaAtual],['Energia Andrade após desconto',resultado.energiaComDesconto],['Economia estimada em 12 meses',resultado.economiaAnual]].map(([label,value])=><View key={String(label)} style={{gap:4}}><Text style={{color:Colors.subtitle}}>{label}</Text><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>{money(Number(value))}</Text></View>)}
   <Text style={{color:Colors.subtitle,lineHeight:22}}>A economia anual considera 12 meses iguais. Consumo, tarifas, bandeiras, compensação efetiva e condições do contrato podem alterar o resultado. Valores apenas estimados.</Text>
  </View></Card></>:null}
 </ScrollView></Screen>;
}
