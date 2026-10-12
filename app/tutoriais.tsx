import { Redirect } from "expo-router";
import { useAuth } from "../contexts/AuthContext";

// Suspended indefinitely; recordings remain preserved in assets/tutorials.
export default function Tutoriais() {
  const { usuario } = useAuth();
  return <Redirect href={usuario ? "/selecionar-unidade" : "/login"} />;
}
