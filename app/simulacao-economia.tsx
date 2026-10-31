import {useEffect,useRef,useState} from 'react';
import {Keyboard,Text,View} from 'react-native';
import {TextInput} from '../components/assistant/AssistantNativeControls';
import {AppHeader,Button,Card,Metric,Screen,ElasticScrollView as ScrollView} from '../components/ui';
import ChoiceField from '../components/cadastro/ChoiceField';
import {Colors} from '../theme';
import {consultarTarifaCemig,consultarTributosCemig} from '../utils/tarifa-cemig';
import {aplicarImpostosNaTarifa} from '../utils/impostos-tarifa';
import {simularFaturas} from '../utils/calculadora-fatura';
import municipios from '../data/municipios-mg.json';

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const numero=(s:string)=>Number(s.replace(/\./g,'').replace(',','.'));
const decimal=(n:number,casas=8)=>n.toLocaleString('pt-BR',{useGrouping:false,maximumFractionDigits:casas});
const atual=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7);
export default function SimulacaoEconomia(){
 const [consumo,setConsumo]=useState(''),[compensacao,setCompensacao]=useState(''),[injecao,setInjecao]=useState('');
 const [classe,setClasse]=useState('B1'),[bandeira,setBandeira]=useState('0'),[referencia,setReferencia]=useState(atual);
 const [tarifa,setTarifa]=useState(''),[cheia,setCheia]=useState(''),[icms,setIcms]=useState(''),[pis,setPis]=useState(''),[cofins,setCofins]=useState('');
 const [fonte,setFonte]=useState(''),[tributosInfo,setTributosInfo]=useState(''),[erro,setErro]=useState(''),[avisoImpostos,setAvisoImpostos]=useState('');
 const [consultando,setConsultando]=useState(false),[reconsulta,setReconsulta]=useState(0); const sequencia=useRef(0);
 const [cidade,setCidade]=useState(''),[pesquisa,setPesquisa]=useState(''),[escolherCidade,setEscolherCidade]=useState(false),[iluminacao,setIluminacao]=useState('');
 const [modalidade,setModalidade]=useState('COMPENSACAO'),[gd,setGd]=useState('GD1'),[ligacao,setLigacao]=useState('30');
 const [plano,setPlano]=useState('COM_FIDELIDADE'),[desconto,setDesconto]=useState('');
 const [formato,setFormato]=useState('UNIFICADA'),[repasseDisponibilidade,setRepasseDisponibilidade]=useState('REPASSAR'),[repasseFioB,setRepasseFioB]=useState('REPASSAR');
 const [disponibilidade,setDisponibilidade]=useState(''),[fioB,setFioB]=useState('');
 const [resultado,setResultado]=useState<ReturnType<typeof simularFaturas>>();
 useEffect(()=>{
  const id=++sequencia.current;if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(referencia)){setConsultando(false);setCheia('');setTributosInfo('Informe a competência no formato AAAA-MM.');return;}
  setConsultando(true);setErro('');setCheia('');setTarifa('');setIcms('');setPis('');setCofins('');setFonte('');setTributosInfo('');setAvisoImpostos('');
  Promise.allSettled([consultarTarifaCemig(classe,Number(bandeira)),consultarTributosCemig(referencia)]).then(([preco,tributos])=>{
   if(id!==sequencia.current)return;
   if(preco.status==='fulfilled'){setTarifa(decimal(preco.value));setFonte('Tarifa convencional vigente da Cemig, com a bandeira selecionada, antes dos impostos.');}
   else setFonte('Tarifa oficial indisponível. Você pode informar a tarifa da fatura.');
   if(tributos.status==='fulfilled'&&tributos.value.tributos){
    const t=tributos.value.tributos;setPis(decimal(t.pis,6));setCofins(decimal(t.cofins,6));if(t.icmsPadrao!==null)setIcms(decimal(t.icmsPadrao,4));
    setTributosInfo(tributos.value.vigente?`Impostos obtidos automaticamente da Cemig para ${t.referencia}. ICMS padrão, sem benefício fiscal.`:`Referência publicada mais recente: ${t.referencia}. A Cemig ainda não publicou ${referencia}; os campos usam essa referência para a estimativa, não valores confirmados do mês. ICMS padrão, sem benefício fiscal.`);
    if(preco.status==='fulfilled'&&t.icmsPadrao!==null)setCheia(decimal(aplicarImpostosNaTarifa(decimal(preco.value),decimal(t.icmsPadrao),decimal(t.pis),decimal(t.cofins))));
   }else setTributosInfo('Consulta automática dos impostos indisponível. Preencha as alíquotas da fatura; campos vazios não significam isenção.');
  }).finally(()=>{if(id===sequencia.current)setConsultando(false);});
  return()=>{sequencia.current++;};
 },[classe,bandeira,referencia,reconsulta]);
 // A máscara ao sair do campo não altera seu valor e não deve apagar a
 // simulação calculada pelo mesmo clique que encerra a edição.
 const valoresSimulacao=[consumo,compensacao,injecao,tarifa,cheia,icms,pis,cofins,iluminacao,desconto,disponibilidade,fioB].map(v=>v.trim()?numero(v):null).join('|');
 useEffect(()=>{setResultado(undefined);},[valoresSimulacao,classe,bandeira,referencia,cidade,modalidade,gd,ligacao,plano,formato,repasseDisponibilidade,repasseFioB]);
 function aplicar(){Keyboard.dismiss();try{setCheia(decimal(aplicarImpostosNaTarifa(tarifa,icms,pis,cofins)));setAvisoImpostos('Impostos aplicados à tarifa cheia abaixo.');}catch(e:any){setCheia('');setAvisoImpostos(e.message);}}
 const disponibilidadeSugerida=cheia&&tarifa?Math.max(0,Number(ligacao)*(gd==='GD1'?numero(tarifa):numero(cheia)-numero(tarifa))):0;
 function calcular(){Keyboard.dismiss();try{
  if(!consumo||!cheia||!compensacao||!desconto||!cidade||!iluminacao||(modalidade==='INJECAO'&&!injecao)||(gd==='GD2'&&!fioB))throw new Error('Preencha consumo, energia compensada, tarifa cheia, desconto, município e iluminação. Em GD II, informe também o Fio B; por injeção, informe a energia alocada. Use 0 somente quando o valor for zero.');
  if(!disponibilidade&&disponibilidadeSugerida<=0)throw new Error('Informe o custo de disponibilidade ou preencha a tarifa sem impostos para estimá-lo.');
  setResultado(simularFaturas({consumo:numero(consumo),compensacao:numero(compensacao),injecao:numero(injecao),tarifa:numero(cheia),desconto:numero(desconto),modalidade:modalidade as 'INJECAO'|'COMPENSACAO',tipoGd:gd as 'GD1'|'GD2',disponibilidade:disponibilidade?numero(disponibilidade):disponibilidadeSugerida,fioB:numero(fioB),iluminacao:numero(iluminacao),repassarDisponibilidade:repasseDisponibilidade==='REPASSAR',repassarFioB:repasseFioB==='REPASSAR'}));setErro('');
 }catch(e:any){setResultado(undefined);setErro(e.message);}}
 const campo=(label:string,value:string,set:(v:string)=>void,unidade='kWh',casas=3,imposto=false)=><View style={{gap:8}}><Text style={{color:Colors.text,fontWeight:'600'}}>{label}</Text><View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:Colors.border,borderRadius:12,backgroundColor:Colors.surface,paddingRight:12}}><TextInput accessibilityLabel={label} value={value} onChangeText={v=>{const p=v.replace(/\./g,',').replace(/[^\d,]/g,'').split(',');set(p[0].slice(0,9)+(p.length>1?','+p.slice(1).join('').slice(0,casas):''));setErro('');if(imposto){setCheia('');setAvisoImpostos('');}}} onBlur={()=>{if(value)set(numero(value).toLocaleString('pt-BR',{useGrouping:false,minimumFractionDigits:unidade==='R$'?2:0,maximumFractionDigits:casas}));}} placeholder="Informe o valor" placeholderTextColor={Colors.subtitle} keyboardType="decimal-pad" maxLength={19} style={{flex:1,minWidth:0,padding:14,fontSize:18,color:Colors.text}}/><Text style={{color:Colors.subtitle}}>{unidade}</Text></View></View>;
 const escolha=(label:string,value:string,set:(v:string)=>void,options:[string,string][])=><ChoiceField label={label} value={value} onChange={set} options={options.map(([value,label])=>({value,label}))}/>;
 const titulo=(s:string)=><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>{s}</Text>;
 const nota=(s:string)=><Text style={{color:Colors.subtitle,lineHeight:22}}>{s}</Text>;
 const termo=pesquisa.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cidades=municipios.filter(c=>c.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(termo)).slice(0,12);
 return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Calculadora de economia" subtitle="Fatura Cemig e Andrade" contextTitle="Estimativa para o cliente" contextSubtitle="Sem criar UC, contrato ou cobrança"/><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{padding:20,gap:20,paddingBottom:40}}>
 <Card><View style={{gap:16}}>{titulo('1. Perfil e consumo da UC')}
 {nota('Compare uma fatura sem Andrade com os valores da Cemig e da Andrade após a compensação. As escolhas seguem a configuração do cadastro da UC.')}
 <Button title={cidade?`Município: ${cidade} — alterar`:'Selecionar município de Minas Gerais'} onPress={()=>setEscolherCidade(!escolherCidade)}/>
 {escolherCidade?<View style={{gap:10}}><TextInput accessibilityLabel="Buscar município" placeholder="Digite o nome da cidade" value={pesquisa} onChangeText={setPesquisa} style={{padding:14,borderWidth:1,borderColor:Colors.border,borderRadius:12,color:Colors.text}}/>{cidades.map(c=><Button key={c.id} title={c.nome} onPress={()=>{setCidade(c.nome);setIluminacao('');setEscolherCidade(false);}}/>)}{nota('Lista oficial do IBGE. Digite para localizar entre os 853 municípios.')}</View>:null}
 {campo('Consumo médio mensal',consumo,setConsumo)}
 {escolha('Tipo de ligação',ligacao,setLigacao,[['30','Monofásica'],['50','Bifásica'],['100','Trifásica']])}
 {escolha('Modalidade GD',gd,setGd,[['GD1','GD I'],['GD2','GD II']])}
 {escolha('Faturamento',modalidade,setModalidade,[['COMPENSACAO','Compensação'],['INJECAO','Injeção']])}
 {campo('Energia compensada no mês',compensacao,setCompensacao)}{nota('Informe quanto do consumo será coberto pelos créditos da usina. O consumo restante continua na Cemig.')}
 {modalidade==='INJECAO'?<>{campo('Energia injetada/alocada à UC',injecao,setInjecao)}{nota('Na cobrança por injeção, créditos ainda não utilizados também podem ser cobrados. A comparação considera esse valor.')}</>:null}
 </View></Card>
 <Card><View style={{gap:16}}>{titulo('2. Tarifa e impostos')}
 <Text style={{color:Colors.text,fontWeight:'600'}}>Mês de referência</Text><TextInput accessibilityLabel="Mês de referência AAAA-MM" value={referencia} onChangeText={setReferencia} maxLength={7} placeholder="2026-10" style={{padding:14,borderWidth:1,borderColor:Colors.border,borderRadius:12,color:Colors.text}}/>
 {escolha('Classe convencional Cemig',classe,setClasse,[['B1','B1 — Residencial normal'],['B2','B2 — Rural'],['B3','B3 — Comércio e demais classes']])}
 {escolha('Bandeira a considerar',bandeira,setBandeira,[['0','Verde'],['1','Amarela'],['2','Vermelha 1'],['3','Vermelha 2']])}
 <Button title={consultando?'Consultando tarifa e impostos…':'Atualizar tarifa e impostos da Cemig'} disabled={consultando} onPress={()=>setReconsulta(v=>v+1)}/>
 {fonte?nota(fonte):null}{tributosInfo?nota(tributosInfo):null}
 {campo('Tarifa sem impostos',tarifa,setTarifa,'R$/kWh',8,true)}
 {campo('ICMS',icms,setIcms,'%',6,true)}{campo('PIS/Pasep',pis,setPis,'%',6,true)}{campo('Cofins',cofins,setCofins,'%',6,true)}
 {nota('A consulta oficial preenche os campos; você pode corrigir conforme a fatura. Benefícios fiscais e isenções dependem da UC. Tarifa branca e baixa renda exigem a tarifa correspondente da fatura.')}
 <Button title="Aplicar impostos à tarifa" disabled={consultando} onPress={aplicar}/>{avisoImpostos?<Text accessibilityLiveRegion="polite" style={{color:Colors.text,fontWeight:'600'}}>{avisoImpostos}</Text>:null}
 {campo('Tarifa cheia, com impostos e bandeira',cheia,setCheia,'R$/kWh',8)}
 </View></Card>
 <Card><View style={{gap:16}}>{titulo('3. Configuração Andrade')}
 {escolha('Plano do contrato',plano,v=>{setPlano(v);if(v==='SEM_FIDELIDADE')setDesconto(gd==='GD2'?'30':'20');},[['COM_FIDELIDADE','Com fidelidade'],['SEM_FIDELIDADE','Sem fidelidade']])}
 {campo('Desconto contratado',desconto,setDesconto,'%',4)}
 {escolha('Formato da cobrança',formato,setFormato,[['UNIFICADA','Fatura unificada'],['SOMENTE_ANDRADE','Somente Andrade']])}
 {escolha(`${gd==='GD1'?'GD I':'GD II'}: disponibilidade recalculada`,repasseDisponibilidade,setRepasseDisponibilidade,[['REPASSAR','Repassar ao cliente'],['ABSORVER','Absorver pela Andrade']])}
 {gd==='GD2'?escolha('GD II: diferença do Fio B',repasseFioB,setRepasseFioB,[['REPASSAR','Repassar ao cliente'],['ABSORVER','Absorver pela Andrade']]):null}
 {campo('Custo de disponibilidade (opcional: substituir estimativa)',disponibilidade,setDisponibilidade,'R$',2)}
 {nota(`Estimativa pelas tarifas e ligação: ${money(disponibilidadeSugerida)}. Confira o custo exato na fatura, especialmente com compensação parcial.`)}
 {gd==='GD2'?<>{campo('Diferença do Fio B no mês',fioB,setFioB,'R$',2)}{nota('Use o valor da fatura ou da projeção da usina. Não presumimos zero nem um percentual fixo de Fio B.')}</>:null}
 </View></Card>
 <Card><View style={{gap:16}}>{titulo('4. Iluminação pública')}
 {nota(cidade?`${cidade}/MG: a contribuição depende da legislação municipal. Enquanto não houver tabela validada para esta cidade, informe o valor da fatura para compor os dois cenários.`:'Selecione o município no perfil da UC.')}
 {campo('Iluminação pública da competência',iluminacao,setIluminacao,'R$',2)}
 {nota('A iluminação não recebe desconto Andrade. O valor informado entra integralmente nos dois cenários; digite 0 apenas em caso de isenção.')}
 <Button title="Simular fatura Cemig e Andrade" disabled={consultando} onPress={calcular}/>{erro?<Text accessibilityRole="alert" style={{color:Colors.text,fontWeight:'600'}}>{erro}</Text>:null}
 </View></Card>
 {resultado?<Card><View style={{gap:16}}>{titulo('Comparação mensal estimada')}
 <Metric title="Cemig sem Andrade" value={money(resultado.cemigSemAndrade)}/>
 <Metric title="Cemig após compensação" value={money(resultado.cemigComAndrade)}/>
 <Metric title="Cobrança Andrade" value={money(resultado.andrade)}/>
 <Metric title={formato==='UNIFICADA'?'Total da fatura unificada Andrade':'Total a pagar: Cemig + Andrade'} value={money(resultado.totalComAndrade)}/>
 <Metric title={resultado.economia>=0?'Economia estimada no mês':'Diferença a mais neste cenário'} value={money(Math.abs(resultado.economia))}/>
 {nota(`Iluminação incluída em cada cenário: ${money(resultado.iluminacao)}. Abatimento de custos absorvidos pela Andrade: ${money(resultado.abatimento)}. ${formato==='SOMENTE_ANDRADE'?'A conta Cemig continua separada.':'O total unificado reúne as duas parcelas.'}`)}
 {nota(`Estimativa para 12 meses iguais: ${money(resultado.economiaAnual)} de economia. A fatura real depende do consumo, dos créditos, dos tributos e da contribuição municipal. Esta tela não emite cobrança.`)}
 </View></Card>:null}
 </ScrollView></Screen>;
}
