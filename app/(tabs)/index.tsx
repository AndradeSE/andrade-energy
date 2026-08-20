import ClientePager from "../../components/cliente/ClientePager";
import DashboardGestor from "../../components/dashboard/DashboardGestor";
import { IS_GERADOR_APP } from "../../config/appVariant";

export default function Home() {
  return IS_GERADOR_APP ? <DashboardGestor /> : <ClientePager />;
}
