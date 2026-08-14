import { useAuth } from "../../contexts/AuthContext";

import ClientePager from "../../components/cliente/ClientePager";
import DashboardAdmin from "../../components/dashboard/DashboardAdmin";
import DashboardGestor from "../../components/dashboard/DashboardGestor";

export default function Home() {
  const { usuario } = useAuth();
 console.log("===============");
  console.log("PERFIL:", usuario?.perfil);
  console.log("USUARIO:", usuario);
  console.log("===============");
  if (!usuario) return null;

  switch (usuario.perfil) {
    case "ADMIN":
      return <DashboardAdmin />;

    case "GESTOR":
      return <DashboardGestor />;

    case "LEITURA":
      return <ClientePager />;
    default:
      return <ClientePager />;
  }
}
