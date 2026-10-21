import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

const NavigationContext = createContext<{ path: string; navigate: (path: string) => void }>({ path: "/", navigate: () => {} });
export function RouterProvider({ children }: { children: ReactNode }) {
  const [path, setPath] = useState(window.location.pathname);
  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  const navigate = (next: string) => {
    if (next === path) return;
    window.history.pushState({}, "", next);
    setPath(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  return <NavigationContext.Provider value={{ path, navigate }}>{children}</NavigationContext.Provider>;
}
export function useLocation() { return { pathname: useContext(NavigationContext).path }; }
export function useNavigate() { return useContext(NavigationContext).navigate; }
export function Link({ to, className, children, onClick }: { to: string; className?: string; children: ReactNode; onClick?: () => void }) {
  const { navigate } = useContext(NavigationContext);
  return <a href={to} className={className} onClick={(e) => { if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return; e.preventDefault(); navigate(to); onClick?.(); }}>{children}</a>;
}