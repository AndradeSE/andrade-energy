import { useAuth } from "../../contexts/AuthContext";

import DashboardAdmin from "../../components/dashboard/DashboardAdmin";
import DashboardCliente from "../../components/dashboard/DashboardCliente";
import DashboardGestor from "../../components/dashboard/DashboardGestor";

export default function Home() {
  const { usuario } = useAuth();

  if (!usuario) return null;

  switch (usuario.perfil) {
    case "CLIENTE":
      return <DashboardCliente />;

    case "GESTOR":
      return <DashboardGestor />;

    case "ADMIN":
      return <DashboardAdmin />;

    default:
      return null;
  }
}