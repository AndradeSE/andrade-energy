import {useEffect,useRef,useState} from 'react';
import {Keyboard,Text,View} from 'react-native';
import {TextInput} from '../components/assistant/AssistantNativeControls';
import {AppHeader,Button,Card,Metric,Screen,ElasticScrollView as ScrollView} from '../components/ui';
import ChoiceField from '../components/cadastro/ChoiceField';
import {Colors} from '../theme';
import {consultarTarifaCemig,consultarTributosCemig} from '../utils/tarifa-cemig';
import {aplicarImpostosNaTarifa} from '../utils/impostos-tarifa';
import {simularFaturas,calcularDisponibilidade} from '../utils/calculadora-fatura';
import municipios from '../data/municipios-mg.json';

const money=(n:number)=>n.toLocaleString('pt-BR',{style:'currency',currency:'BRL'});
const numero=(s:string)=>Number(s.replace(/\./g,'').replace(',','.'));
const decimal=(n:number,casas=8)=>n.toLocaleString('pt-BR',{useGrouping:false,maximumFractionDigits:casas});
const atual=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}).slice(0,7);
export default function SimulacaoEconomia(){
 const [consumo,setConsumo]=useState(''),[avancado,setAvancado]=useState(false);
 const [classe,setClasse]=useState('B1'),[bandeira,setBandeira]=useState('0'),[referencia]=useState(atual);
 const [tarifa,setTarifa]=useState(''),[cheia,setCheia]=useState(''),[icms,setIcms]=useState(''),[pis,setPis]=useState(''),[cofins,setCofins]=useState('');
 const [resumoTributos,setResumoTributos]=useState('');
 const [fonte,setFonte]=useState(''),[tributosInfo,setTributosInfo]=useState(''),[erro,setErro]=useState(''),[avisoImpostos,setAvisoImpostos]=useState('');
 const [consultando,setConsultando]=useState(false),[reconsulta,setReconsulta]=useState(0); const sequencia=useRef(0);
 const [cidade,setCidade]=useState(''),[pesquisa,setPesquisa]=useState(''),[escolherCidade,setEscolherCidade]=useState(false),[iluminacao,setIluminacao]=useState('');
 const [modalidade,setModalidade]=useState('COMPENSACAO'),[gd,setGd]=useState('GD1'),[ligacao,setLigacao]=useState('30');
 const [plano,setPlano]=useState('COM_FIDELIDADE'),[desconto,setDesconto]=useState('');
 const [repasseDisponibilidade,setRepasseDisponibilidade]=useState('REPASSAR'),[repasseFioB,setRepasseFioB]=useState('REPASSAR');
 const [fioB,setFioB]=useState('');
 const [resultado,setResultado]=useState<ReturnType<typeof simularFaturas>>();
 useEffect(()=>{
  const id=++sequencia.current;if(!/^20\d{2}-(0[1-9]|1[0-2])$/.test(referencia)){setConsultando(false);setCheia('');setTributosInfo('Informe a competência no formato AAAA-MM.');return;}
  setConsultando(true);setErro('');setCheia('');setTarifa('');setIcms('');setPis('');setCofins('');setFonte('');setTributosInfo('');setAvisoImpostos('');
  Promise.allSettled([consultarTarifaCemig(classe,Number(bandeira)),consultarTributosCemig(referencia)]).then(([preco,tributos])=>{
   if(id!==sequencia.current)return;
   if(preco.status==='fulfilled'){setTarifa(decimal(preco.value));setFonte('Tarifa convencional vigente da Cemig, com a bandeira selecionada, antes dos impostos.');}
   else setFonte('Tarifa oficial indisponível. Você pode informar a tarifa da fatura.');
   if(tributos.status==='fulfilled'&&tributos.value.tributos){
    const t=tributos.value.tributos;setResumoTributos(tributos.value.vigente?'Impostos de '+t.referencia+'.':'Impostos da última referência publicada ('+t.referencia+'), usados apenas como estimativa.');setPis(decimal(t.pis,6));setCofins(decimal(t.cofins,6));if(t.icmsPadrao!==null)setIcms(decimal(t.icmsPadrao,4));
    setTributosInfo(tributos.value.vigente?`Impostos obtidos automaticamente da Cemig para ${t.referencia}. ICMS padrão, sem benefício fiscal.`:`Referência publicada mais recente: ${t.referencia}. A Cemig ainda não publicou ${referencia}; os campos usam essa referência para a estimativa, não valores confirmados do mês. ICMS padrão, sem benefício fiscal.`);
    if(preco.status==='fulfilled'&&t.icmsPadrao!==null)setCheia(decimal(aplicarImpostosNaTarifa(decimal(preco.value),decimal(t.icmsPadrao),decimal(t.pis),decimal(t.cofins))));
   }else setTributosInfo('Consulta automática dos impostos indisponível. Preencha as alíquotas da fatura; campos vazios não significam isenção.');
  }).finally(()=>{if(id===sequencia.current)setConsultando(false);});
  return()=>{sequencia.current++;};
 },[classe,bandeira,referencia,reconsulta]);
 // A máscara ao sair do campo não altera seu valor e não deve apagar a
 // simulação calculada pelo mesmo clique que encerra a edição.
 const valoresSimulacao=[consumo,tarifa,cheia,icms,pis,cofins,iluminacao,desconto,fioB].map(v=>v.trim()?numero(v):null).join('|');
 useEffect(()=>{setResultado(undefined);},[valoresSimulacao,classe,bandeira,referencia,cidade,modalidade,gd,ligacao,plano,repasseDisponibilidade,repasseFioB]);
 function aplicar(){Keyboard.dismiss();try{setCheia(decimal(aplicarImpostosNaTarifa(tarifa,icms,pis,cofins)));setAvisoImpostos('Impostos aplicados à tarifa cheia abaixo.');}catch(e:any){setCheia('');setAvisoImpostos(e.message);}}
 const disponibilidadeSugerida=cheia&&tarifa?Math.max(0,Number(ligacao)*(gd==='GD1'?numero(tarifa):numero(cheia)-numero(tarifa))):0;
 function calcular(){Keyboard.dismiss();try{
  if(!consumo||!cheia||!desconto)throw new Error('Informe consumo e desconto. Se a tarifa automática estiver indisponível, preencha-a nas opções avançadas.');
  const disponibilidade=calcularDisponibilidade(Number(ligacao),gd as 'GD1'|'GD2',numero(tarifa),numero(cheia));
  setResultado(simularFaturas({consumo:numero(consumo),compensacao:numero(consumo),injecao:numero(consumo),tarifa:numero(cheia),desconto:numero(desconto),modalidade:modalidade as 'INJECAO'|'COMPENSACAO',tipoGd:gd as 'GD1'|'GD2',disponibilidade,fioB:fioB.trim()?numero(fioB):gd==='GD2'?numero(consumo)*numero(cheia)*0.13:0,iluminacao:iluminacao.trim()?numero(iluminacao):null,repassarDisponibilidade:repasseDisponibilidade==='REPASSAR',repassarFioB:repasseFioB==='REPASSAR'}));setErro('');
 }catch(e:any){setResultado(undefined);setErro(e.message);}}
 const campo=(label:string,value:string,set:(v:string)=>void,unidade='kWh',casas=3,imposto=false)=><View style={{gap:8}}><Text style={{color:Colors.text,fontWeight:'600'}}>{label}</Text><View style={{flexDirection:'row',alignItems:'center',borderWidth:1,borderColor:Colors.border,borderRadius:12,backgroundColor:Colors.surface,paddingRight:12}}><TextInput accessibilityLabel={label} value={value} onChangeText={v=>{const p=v.replace(/\./g,',').replace(/[^\d,]/g,'').split(',');set(p[0].slice(0,9)+(p.length>1?','+p.slice(1).join('').slice(0,casas):''));setErro('');if(imposto){setCheia('');setAvisoImpostos('');}}} onBlur={()=>{if(value)set(numero(value).toLocaleString('pt-BR',{useGrouping:false,minimumFractionDigits:unidade==='R$'?2:0,maximumFractionDigits:casas}));}} placeholder="Informe o valor" placeholderTextColor={Colors.subtitle} keyboardType="decimal-pad" maxLength={19} style={{flex:1,minWidth:0,padding:14,fontSize:18,color:Colors.text}}/><Text style={{color:Colors.subtitle}}>{unidade}</Text></View></View>;
 const escolha=(label:string,value:string,set:(v:string)=>void,options:[string,string][])=><ChoiceField label={label} value={value} onChange={set} options={options.map(([value,label])=>({value,label}))}/>;
 const titulo=(s:string)=><Text style={{fontSize:20,fontWeight:'700',color:Colors.text}}>{s}</Text>;
 const nota=(s:string)=><Text style={{color:Colors.subtitle,lineHeight:22}}>{s}</Text>;
 const termo=pesquisa.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const cidades=municipios.filter(c=>c.nome.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().includes(termo)).slice(0,12);
 return <Screen><AppHeader variant="subpage" showPlantSwitch={false} title="Calculadora de economia" subtitle="Uma ideia da economia do cliente" contextTitle="Estimativa rápida" contextSubtitle="Compensação de 100% do consumo"/><ScrollView keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag" contentContainerStyle={{padding:20,gap:20,paddingBottom:40}}>
 <Card><View style={{gap:16}}>{titulo("Estime a economia")}
 {campo('Consumo mensal',consumo,setConsumo)}
 {campo('Desconto oferecido',desconto,setDesconto,'%',4)}
 {escolha('Classe',classe,setClasse,[['B1','Residencial'],['B2','Rural'],['B3','Comércio e demais classes']])}
 {escolha('Ligação',ligacao,setLigacao,[['30','Monofásica'],['50','Bifásica'],['100','Trifásica']])}
 {escolha('Usina',gd,setGd,[['GD1','GD I'],['GD2','GD II']])}
 {nota('Consideramos 100% do consumo compensado. Disponibilidade calculada automaticamente pela ligação.')}
 {nota(consultando?'Consultando Cemig…':cheia?'Tarifa cheia: R$ '+cheia+'/kWh. '+resumoTributos:'Tarifa indisponível: informe nas opções avançadas.')}
 {gd==='GD2'&&!fioB?nota('Fio B estimado pela referência provisória do cadastro: 13% da energia. Ajuste opcional disponível abaixo.'):null}
 {!iluminacao.trim()?nota('Iluminação desconhecida: os totais serão parciais, sem essa contribuição.'):null}
 <Button title="Calcular economia" disabled={consultando} onPress={calcular}/>{erro?<Text accessibilityRole="alert" style={{color:Colors.text,fontWeight:"600"}}>{erro}</Text>:null}
 <Button title={avancado?"Ocultar opções avançadas":"Opções avançadas (opcionais)"} onPress={()=>setAvancado(!avancado)}/>
 </View></Card>
 {avancado?<>
 <Card><View style={{gap:16}}>{titulo('Tarifa e impostos')}
 
  {escolha('Bandeira a considerar',bandeira,setBandeira,[['0','Verde'],['1','Amarela'],['2','Vermelha 1'],['3','Vermelha 2']])}
 <Button title={consultando?'Consultando tarifa e impostos…':'Atualizar tarifa e impostos da Cemig'} disabled={consultando} onPress={()=>setReconsulta(v=>v+1)}/>
 {fonte?nota(fonte):null}{tributosInfo?nota(tributosInfo):null}
 {campo('Tarifa sem impostos',tarifa,setTarifa,'R$/kWh',8,true)}
 {campo('ICMS',icms,setIcms,'%',6,true)}{campo('PIS/Pasep',pis,setPis,'%',6,true)}{campo('Cofins',cofins,setCofins,'%',6,true)}
 {nota('A consulta oficial preenche os campos; você pode corrigir conforme a fatura. Benefícios fiscais e isenções dependem da UC. Tarifa branca e baixa renda exigem a tarifa correspondente da fatura.')}
 <Button title="Aplicar impostos à tarifa" disabled={consultando} onPress={aplicar}/>{avisoImpostos?<Text accessibilityLiveRegion="polite" style={{color:Colors.text,fontWeight:'600'}}>{avisoImpostos}</Text>:null}
 {campo('Tarifa cheia, com impostos e bandeira',cheia,setCheia,'R$/kWh',8)}
 </View></Card>
 <Card><View style={{gap:16}}>{titulo('Repasses opcionais')}
 {escolha('Plano do contrato',plano,v=>{setPlano(v);if(v==='SEM_FIDELIDADE')setDesconto(gd==='GD2'?'30':'20');},[['COM_FIDELIDADE','Com fidelidade'],['SEM_FIDELIDADE','Sem fidelidade']])}
  {escolha(`${gd==='GD1'?'GD I':'GD II'}: disponibilidade recalculada`,repasseDisponibilidade,setRepasseDisponibilidade,[['REPASSAR','Repassar ao cliente'],['ABSORVER','Absorver pela Andrade']])}
 {gd==='GD2'?escolha('GD II: diferença do Fio B',repasseFioB,setRepasseFioB,[['REPASSAR','Repassar ao cliente'],['ABSORVER','Absorver pela Andrade']]):null}
 <Metric title={`Disponibilidade calculada · ${ligacao} kWh`} value={cheia&&tarifa?money(disponibilidadeSugerida):'Aguardando tarifas'}/>
 {nota('Cálculo automático pela ligação: monofásica 30 kWh, bifásica 50 kWh ou trifásica 100 kWh. O app aplica as tarifas da modalidade GD selecionada e a opção de repasse ou absorção.')}
 {gd==='GD2'?<>{campo('Fio B do mês (opcional: substituir estimativa)',fioB,setFioB,'R$',2)}{nota('Deixe em branco para a estimativa provisória do cadastro, ou informe o valor da fatura para maior precisão.')}</>:null}
 </View></Card>
 <Card><View style={{gap:16}}>{titulo('Iluminação pública (opcional)')} <Button title={cidade?`Município: ${cidade} — alterar`:'Selecionar município de Minas Gerais'} onPress={()=>setEscolherCidade(!escolherCidade)}/>
 {escolherCidade?<View style={{gap:10}}><TextInput accessibilityLabel="Buscar município" placeholder="Digite o nome da cidade" value={pesquisa} onChangeText={setPesquisa} style={{padding:14,borderWidth:1,borderColor:Colors.border,borderRadius:12,color:Colors.text}}/>{cidades.map(c=><Button key={c.id} title={c.nome} onPress={()=>{setCidade(c.nome);setIluminacao('');setEscolherCidade(false);}}/>)}{nota('Lista oficial do IBGE. Digite para localizar entre os 853 municípios.')}</View>:null}

 {nota(cidade?`${cidade}/MG: a contribuição depende da legislação municipal. Sem tabela validada, informe o valor da fatura, use 0 quando não houver cobrança ou deixe em branco se não souber.`:'Selecione o município no perfil da UC.')}
 {campo('Iluminação pública da competência',iluminacao,setIluminacao,'R$',2)}
 {nota('A iluminação não recebe desconto Andrade. Zero indica ausência de cobrança, inclusive em áreas rurais quando aplicável. Campo em branco gera uma comparação parcial, sem iluminação; não significa isenção.')}
 <Button title="Simular fatura Cemig e Andrade" disabled={consultando} onPress={calcular}/>{erro?<Text accessibilityRole="alert" style={{color:Colors.text,fontWeight:'600'}}>{erro}</Text>:null}
 </View></Card>

 </>:null}
 {resultado?<Card><View style={{gap:16}}>{titulo(resultado.iluminacaoInformada?'Comparação mensal estimada':'Comparação parcial — iluminação não informada')}
 {!resultado.iluminacaoInformada?nota('Os valores abaixo não incluem iluminação pública. Informe a contribuição municipal quando souber para completar a estimativa das faturas.'):null}
 <Metric title="Cemig sem Andrade" value={money(resultado.cemigSemAndrade)}/>
 <Text style={{color:Colors.subtitle}}>Cemig após compensação: {money(resultado.cemigComAndrade)} + Andrade: {money(resultado.andrade)}.</Text>
 <Metric title={'Total estimado: Cemig + Andrade'} value={money(resultado.totalComAndrade)}/>
 <Metric title={resultado.economia>=0?'Economia estimada no mês':'Diferença a mais neste cenário'} value={money(Math.abs(resultado.economia))}/>
 {nota(`${resultado.iluminacaoInformada?`Iluminação incluída em cada cenário: ${money(resultado.iluminacao)}.`:'Iluminação não informada e não incluída nos totais.'} Abatimento de custos absorvidos pela Andrade: ${money(resultado.abatimento)}. ${'O total reúne as duas parcelas.'}`)}
 {nota(`Estimativa para 12 meses iguais: ${money(resultado.economiaAnual)} de economia. A fatura real depende do consumo, dos créditos, dos tributos e da contribuição municipal. Esta tela não emite cobrança.`)}
 </View></Card>:null}

 </ScrollView></Screen>;
}
