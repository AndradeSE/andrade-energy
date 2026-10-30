import { useEffect, useSyncExternalStore } from "react";
import { useGlobalSearchParams, usePathname } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { environmentForRoute, NavigationEnvironment } from "../services/navigation-environment";

const environments = new Map<string, NavigationEnvironment>();
const listeners = new Set<() => void>();
const subscribe = (listener:()=>void) => {listeners.add(listener);return ()=>{listeners.delete(listener);};};
export function useNavigationEnvironment() {
  const {user} = useAuth();
  const pathname=usePathname();
  const {ambiente}=useGlobalSearchParams<{ambiente?:string}>();
  const id=String(user?.id ?? "");
  const stored=useSyncExternalStore(subscribe,()=>environments.get(id) ?? "gerador");
  const route=environmentForRoute(pathname,ambiente);
  useEffect(()=>{
    if(id && route && environments.get(id)!==route){environments.set(id,route);listeners.forEach(listener=>listener());}
  },[id,route]);
  return route ?? stored;
}
