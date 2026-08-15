import { router } from "expo-router";
import { useEffect, useState } from "react";
import {
  Alert,
  ImageBackground,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity
} from "react-native";

import { fecharUsina } from "../../services/fechamentos.service";
import { listarUsinas } from "../../services/usinas.service";

export default function NovoFechamento() {

  const [usinas, setUsinas] = useState<any[]>([]);
  const [usinaId, setUsinaId] = useState("");

  const [competencia, setCompetencia] =
    useState("");

  const [energiaGerada, setEnergiaGerada] =
    useState("");

  const [energiaAlocada, setEnergiaAlocada] =
    useState("");

  const [receitaPrevista, setReceitaPrevista] =
    useState("");

  const [receitaRealizada, setReceitaRealizada] =
    useState("");

  useEffect(() => {
    carregar();
  }, []);

  async function carregar() {

    const lista =
      await listarUsinas();

    setUsinas(lista);

    if (lista.length)
      setUsinaId(lista[0].id);

  }

 async function salvar() {

  try {


  if (!competencia.trim()) {

  Alert.alert(
    "Atenção",
    "Informe a competência."
  );

  return;

}

if (!energiaGerada) {

  Alert.alert(
    "Atenção",
    "Informe a energia gerada."
  );

  return;

}
    const [mes, ano] = competencia.split("/");

const competenciaFormatada = `${ano}-${mes.padStart(2, "0")}-01`;

await fecharUsina({
  usinaId,
  competencia: competenciaFormatada,
  energiaGerada: Number(energiaGerada) || 0,
  energiaAlocada: Number(energiaAlocada) || 0,
  receitaPrevista: Number(receitaPrevista) || 0,
  receitaRealizada: Number(receitaRealizada) || 0,
});


    Alert.alert(
      "Sucesso",
      "Fechamento realizado."
    );

    router.back();

  } catch (e: any) {


    Alert.alert(
      "Erro",
      e.message ?? JSON.stringify(e)
    );

  }

}

  return (

    <ImageBackground

      source={require("../../assets/images/background.png")}

      style={{

        flex:1,

      }}

    >

      <ScrollView

        contentContainerStyle={{

          padding:20,

        }}

      >

        <Text

          style={{

            color:"#FFF",

            fontSize:28,

            fontWeight:"bold",

            marginBottom:20,

          }}

        >

          Novo Fechamento

        </Text>

        <Text
          style={{
            color:"#FFF",
            marginBottom:5,
          }}
        >
          Usina
        </Text>

        {usinas.map(u=>(

          <TouchableOpacity

            key={u.id}

            onPress={()=>setUsinaId(u.id)}

            style={{

              backgroundColor:

                usinaId===u.id

                  ? "#16A34A"

                  : "#FFF",

              padding:12,

              borderRadius:10,

              marginBottom:10,

            }}

          >

            <Text>

              {u.nome}

            </Text>

          </TouchableOpacity>
          

        ))}

        <TextInput
          placeholder="Competência (07/2026)"
          value={competencia}
          onChangeText={setCompetencia}
          style={estilo}
        />

        <TextInput
          placeholder="Energia Gerada"
          keyboardType="numeric"
          value={energiaGerada}
          onChangeText={setEnergiaGerada}
          style={estilo}
        />

        <TextInput
          placeholder="Energia Alocada"
          keyboardType="numeric"
          value={energiaAlocada}
          onChangeText={setEnergiaAlocada}
          style={estilo}
        />

        <TextInput
          placeholder="Receita Prevista"
          keyboardType="numeric"
          value={receitaPrevista}
          onChangeText={setReceitaPrevista}
          style={estilo}
        />

        <TextInput
          placeholder="Receita Realizada"
          keyboardType="numeric"
          value={receitaRealizada}
          onChangeText={setReceitaRealizada}
          style={estilo}
        />

        <TouchableOpacity

          onPress={salvar}

          style={{

            backgroundColor:"#16A34A",

            padding:16,

            borderRadius:12,

            marginTop:20,

          }}

        >

          <Text

            style={{

              color:"#FFF",

              fontWeight:"bold",

              textAlign:"center",

            }}

          >

            FECHAR USINA

          </Text>

        </TouchableOpacity>

      </ScrollView>

    </ImageBackground>

  );

}

const estilo={

  backgroundColor:"#FFF",

  borderRadius:10,

  padding:14,

  marginBottom:12,

};
