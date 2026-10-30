import {useEffect,useState} from 'react';
import {Keyboard,Text,View} from 'react-native';
import {TextInput} from '../components/assistant/AssistantNativeControls';
import {ElasticScrollView as ScrollView} from '../components/ui';
import {AppHeader,Button,Card,Metric,Screen} from '../components/ui';
import {Colors} from '../theme';
import {simularEconomia} from '../utils/simulacao-economia';
import {consultarTarifaCemig,tarifaComTributos} from '../utils/tarifa-cemig';

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
function numero(s:string){return Number(s.replace(/\./g,'').replace(',','.'));}
export default function SimulacaoEconomia(){
 const [conta,setConta]=useState(''),[base,setBase]=useState(''),[desconto,setDesconto]=useState('');
 const [classe,setClasse]=useState('');
 const [icms,setIcms]=useState(''),[pis,setPis]=useState(''),[cofins,setCofins]=useState('');
 const [tarifaLiquida,setTarifaLiquida]=useState<number>();
 function aplicarTributos(){try{if(tarifaLiquida===undefined)throw new Error('Busque primeiro a tarifa oficial.');if(!icms||!pis||!cofins)throw new Error('Informe as três alíquotas da fatura; use 0 quando houver isenção.');setBase(tarifaComTributos(tarifaLiquida,numero(icms),numero(pis),numero(cofins)).toFixed(8).replace('.',','));setResultado(undefined);setErro('');setFonte('Tarifa cheia calculada com a bandeira selecionada e os tributos informados.');}catch(e:any){setErro(e.message);}}
 const [bandeira,setBandeira]=useState(0),[consultando,setConsultando]=useState(false),[fonte,setFonte]=useState('');
 async function buscar(){if(consultando)return;setConsultando(true);setResultado(undefined);setErro('');setFonte('');setTarifaLiquida(undefined);setBase('');try{const tarifa=await consultarTarifaCemig(classe,bandeira);setTarifaLiquida(tarifa);setFonte(`Tarifa oficial com a bandeira selecionada, sem impostos: R$ ${tarifa.toFixed(8).replace('.',',')}/kWh. Informe os tributos abaixo para obter a tarifa cheia.`);}catch(e:any){setErro(e.message);}finally{setConsultando(false);}}
 const [resultado,setResultado]=useState<ReturnType<typeof simularEconomia>>(),[erro,setErro]=useState('');
 useEffect(()=>{if(!classe)return;let ativo=true;setConsultando(true);setErro('');setTarifaLiquida(undefined);setBase('');consultarTarifaCemig(classe,bandeira).then(tarifa=>{if(!ativo)return;setTarifaLiquida(tarifa);setFonte(`Cemig: R$ ${tarifa.toFixed(8).replace('.',',')}/kWh antes dos impostos, com a bandeira selecionada.`);}).catch(e=>{if(ativo)setErro(e.message||'Não foi possível consultar a Cemig. Informe a tarifa manualmente.');}).finally(()=>{if(ativo)setConsultando(false);});return()=>{ativo=false;};},[classe,bandeira]);
 useEffect(()=>{if(tarifaLiquida===undefined||!icms||!pis||!cofins)return;try{setBase(tarifaComTributos(tarifaLiquida,numero(icms),numero(pis),numero(cofins)).toFixed(8).replace('.',','));setResultado(undefined);setErro('');}catch(e:any){setBase('');setErro(e.message);}},[tarifaLiquida,icms,pis,cofins]);
 const change=(set:(v:string)=>void,casas:number)=>(v:string)=>{const partes=v.replace(/\./g,',').replace(/[^\d,]/g,'').split(',');set(partes[0].slice(0,9)+(partes.length>1?','+partes.slice(1).join('').slice(0,casas):''));setResultado(undefined);setErro('');};
 function calcular(){Keyboard.dismiss();try{if(!conta||!base||!desconto)throw new Error('Preencha o consumo em kWh, a tarifa cheia e o desconto.');const consumo=numero(conta),tarifa=numero(base);if(!Number.isFinite(consumo)||!Number.isFinite(tarifa)||consumo<=0||tarifa<=0)throw new Error('Informe consumo e tarifa maiores que zero.');const energia=consumo*tarifa;setResultado(simularEconomia(energia,energia,numero(desconto)));setErro('');}catch(e:any){setErro(e.message);setResultado(undefined);}}
 const field=(label:string,value:string,set:(v:string)=>void,moeda=true)=>{const tarifa=label.includes('R$/kWh'),casas=tarifa?8:moeda?3:4,unidade=tarifa?'R$/kWh':moeda?'kWh':'%';return <View style={{gap:8}}><Text style={{color:Colors.text,fontWeight:'600'}}>{label}</Text><View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:Colors.border,borderRadius:12,backgroundColor:Colors.surface,paddingRight:14}}><TextInput accessibilityLabel={label} value={value} onChangeText={change(set,casas)} onBlur={()=>{if(value)set(numero(value).toLocaleString('pt-BR',{useGrouping:false,minimumFractionDigits:tarifa?2:0,maximumFractionDigits:casas}));}} placeholder={tarifa?'0,00':'0'} keyboardType="decimal-pad" maxLength={19} style={{flex:1,minWidth:0,padding:14,fontSize:18,color:Colors.text}}/><Text style={{color:Colors.subtitle}}>{unidade}</Text></View></View>;};
 return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Calculadora de economia" subtitle="Estimativa para o cliente" contextTitle="Comparação de valores" contextSubtitle="Sem criar contrato ou cobrança"/><ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{padding:20,gap:20,paddingBottom:40}}>
  <Card><View style={{gap:18}}><Text style={{color:Colors.subtitle,lineHeight:22}}>Informe a quantidade de energia e o preço cheio de cada kWh para comparar com o desconto oferecido ao cliente.</Text>
   {field('Consumo mensal a compensar (kWh)',conta,setConta)}
   <View style={{gap:10}}><Text style={{color:Colors.text,fontWeight:'600'}}>Classe — tarifa convencional Cemig</Text>{[['B1','Residencial normal'],['B2','Rural'],['B3','Comércio e demais classes']].map(([id,label])=><Button key={id} title={`${classe===id?'✓ ':''}${id} — ${label}`} onPress={()=>{setClasse(id);setBase('');setFonte('');setResultado(undefined);}}/>)}<Text style={{color:Colors.text,fontWeight:'600'}}>Bandeira da fatura do mês</Text>{['Verde','Amarela','Vermelha 1','Vermelha 2'].map((label,id)=><Button key={label} title={`${bandeira===id?'✓ ':''}${label}`} onPress={()=>{setBandeira(id);setBase('');setFonte('');setResultado(undefined);}}/>)}<Button title={consultando?'Consultando Cemig…':'Buscar tarifa oficial vigente'} onPress={buscar}/>{fonte?<Text style={{color:Colors.subtitle}}>{fonte}</Text>:null}<Text style={{color:Colors.subtitle}}>Tarifa branca, baixa renda e outras modalidades: informe a tarifa da fatura manualmente.</Text></View>
   {tarifaLiquida!==undefined?<View style={{gap:6}}><Text style={{color:Colors.subtitle}}>Tarifa oficial consultada, sem impostos (R$/kWh)</Text><Text style={{color:Colors.text,fontSize:22,fontWeight:'700'}}>{tarifaLiquida.toFixed(8).replace('.',',')}</Text></View>:null}
   {field('ICMS da fatura (%)',icms,setIcms,false)}
   {field('PIS da fatura (%)',pis,setPis,false)}
   {field('Cofins da fatura (%)',cofins,setCofins,false)}
   <Button title="Aplicar impostos à tarifa oficial" onPress={aplicarTributos}/>
   {field('Tarifa cheia com impostos (R$/kWh)',base,setBase)}
   {!base&&tarifaLiquida!==undefined?<Text style={{color:Colors.subtitle}}>Preencha ICMS, PIS e Cofins abaixo da tarifa oficial para preencher automaticamente o valor cheio, ou digite diretamente a tarifa cheia da fatura.</Text>:null}
   <Text style={{color:Colors.subtitle}}>Informe as alíquotas efetivas da fatura do mês. ICMS, PIS e Cofins ainda têm preenchimento manual. O cálculo usa tarifa ÷ (1 − PIS − Cofins) ÷ (1 − ICMS), com as alíquotas convertidas de porcentagem. Se já digitou a tarifa cheia da fatura, não aplique os impostos novamente.</Text>
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
