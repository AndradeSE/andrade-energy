import Loading from "./Loading";

/** Aparece somente quando a seção não tem dados no cache; não remonta abas prontas. */
export default function TabDataPending() {
  return <Loading />;
}
