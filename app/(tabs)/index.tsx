import ClienteHome from "../../components/cliente/ClienteHome";
import DashboardGestor from "../../components/dashboard/DashboardGestor";
import { IS_GERADOR_APP } from "../../config/appVariant";

export default function Home() {
  return IS_GERADOR_APP ? <DashboardGestor /> : <ClienteHome />;
}
