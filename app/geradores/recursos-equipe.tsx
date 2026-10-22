import { useEffect, useState } from "react";
import { Alert, Text, TextInput, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { AppHeader, Card, ElasticScrollView, Loading, Screen } from "../../components/ui";
import { useAuth } from "../../contexts/AuthContext";
import api from "../../config/api";
import { commercialPermission } from "../../config/commercialPermissions";
import { Colors, Spacing } from "../../theme";

export default function RecursosEquipe() {
  const { user } = useAuth();
  const [dados,setDados] = useState<any>(null);
  const [geradores,setGeradores] = useState<any[]>([]);
  const [alvo,setAlvo] = useState("");
  const [busy,setBusy] = useState(false);
  const [nome,setNome] = useState(""); const [telefone,setTelefone] = useState("");
  const pode = (key:string) => user?.papel_empresa !== "COLABORADOR_COMERCIAL" || commercialPermission(user?.permissoes,key);
  useEffect(() => { void Promise.all([api.get("/comercial/recursos-equipe"), api.get("/comercial/painel")]).then(([r,p]) => {setDados(r.data);setGeradores(p.data.geradores ?? []);}).catch(e => Alert.alert("Comercial",e?.response?.data?.message ?? "Não foi possível carregar.")); },[]);
  async function executar(acao:()=>Promise<any>) { if(busy)return;setBusy(true);try {await acao();Alert.alert("Concluído","Operação concluída.");}catch(e:any){Alert.alert("Comercial",e?.response?.data?.message ?? "Não foi possível concluir.");}finally{setBusy(false);} }
  const botao=(texto:string,acao:()=>void)=><TouchableOpacity disabled={busy} accessibilityRole="button" onPress={acao} style={{padding:14,marginVertical:5,borderRadius:12,backgroundColor:Colors.primary}}><Text style={{color:"white",fontWeight:"700"}}>{texto}</Text></TouchableOpacity>;
  const confirmar=(texto:string,acao:()=>Promise<any>)=>Alert.alert("Confirmar envio",texto,[{text:"Cancelar",style:"cancel"},{text:"Enviar",onPress:()=>void executar(acao)}]);
  return <Screen><AppHeader variant="subpage" title="Ferramentas comerciais" subtitle="Permissões da equipe" contextTitle="Comercial" contextSubtitle="Contratação do sistema pelo gerador"/><ElasticScrollView contentContainerStyle={{padding:Spacing.lg,paddingBottom:120,gap:12}}>
    {!dados?<Loading/>:<>
      {(pode("geradores_convidar") || pode("contratos_enviar")) && botao("Preparar convite / contratação do sistema",()=>router.push("/geradores/convidar" as any))}
      {dados.planos.map((p:any)=><Card key={p.id}><Text style={{fontWeight:"800"}}>{p.nome}</Text><Text>{p.descricao}</Text><Text>Mensal: R$ {p.valor_mensal} · Anual: R$ {p.valor_anual}</Text><Text>{(p.recursos??[]).join(" · ")}</Text>{pode("propostas_preparar") ? botao("Preparar proposta deste plano",()=>Alert.alert(`Proposta — ${p.nome}`, `Contratação do sistema Andrade Energy. Mensal: R$ ${p.valor_mensal}. Anual: R$ ${p.valor_anual}. Benefícios: ${(p.recursos??[]).join(", ")}. A contratação depende do aceite dos termos aprovados pelo gerador.`, [{text:"Fechar"}, ...(pode("geradores_convidar") && pode("contratos_enviar") ? [{text:"Preparar convite",onPress:()=>router.push("/geradores/convidar" as any)}] : [])])) : null}</Card>)}
      {(pode("geradores_editar") || pode("documentos_enviar")) && <Card><Text>Selecione o gerador</Text>{geradores.filter(g=>g.perfil==="GESTOR").map(g=><TouchableOpacity key={g.id} onPress={()=>{setAlvo(g.id);setNome(g.nome);setTelefone(g.telefone??"");}} style={{padding:12}}><Text>{alvo===g.id?"✓ ":""}{g.nome}</Text></TouchableOpacity>)}
      {pode("geradores_editar") && alvo ? <><TextInput accessibilityLabel="Nome completo" value={nome} onChangeText={setNome} style={{padding:12,borderWidth:1}}/><TextInput accessibilityLabel="Telefone" value={telefone} onChangeText={setTelefone} keyboardType="phone-pad" style={{padding:12,borderWidth:1}}/>{botao("Salvar nome e telefone",()=>void executar(()=>api.patch(`/comercial/geradores/${alvo}/contato`,{nome,telefone})))}</>:null}</Card>}
      {dados.documentos.map((d:any)=><Card key={d.id}><Text style={{fontWeight:"800"}}>{d.titulo} · {d.versao}</Text><Text>{d.conteudo}</Text>{pode("documentos_enviar") && alvo ? botao("Enviar documento aprovado",()=>confirmar("Enviar este documento ao e-mail cadastrado do gerador selecionado?",()=>api.post(`/comercial/documentos/${d.id}/enviar`,{geradorId:alvo}))):null}</Card>)}
      {dados.cobrancas.map((c:any)=><Card key={c.id}><Text>{c.assinatura?.gerador?.nome ?? "Assinatura"}</Text><Text>{c.competencia} · R$ {c.valor} · Vence: {c.vencimento} · {c.status}</Text>{pode("cobrancas_lembrar") ? botao("Enviar lembrete",()=>confirmar("Enviar lembrete ao e-mail cadastrado, sem gerar nova cobrança?",()=>api.post(`/comercial/cobrancas/${c.id}/lembrar`))):null}</Card>)}
    </>}
  </ElasticScrollView></Screen>;
}
