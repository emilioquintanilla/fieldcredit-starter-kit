// Layout autenticado: NavBar + Sidebar + área de contenido
import { useEffect, useState, type ReactNode } from "react";
import { useNavigate } from "@tanstack/react-router";
import { NavBar } from "./NavBar";
import { Sidebar } from "./Sidebar";
import { BottomNav } from "./BottomNav";
import { useApp } from "@/stores/app";

export function AppLayout({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [ready, setReady] = useState(false);
  const usuario = useApp((s) => s.usuario);
  const hydrate = useApp((s) => s.hydrate);
  const navigate = useNavigate();

  // Rehidrata el estado (usuario y tema) al montar en el cliente
  useEffect(() => {
    void hydrate().finally(() => setReady(true));
  }, [hydrate]);

  useEffect(() => {
    if (ready && !usuario) navigate({ to: "/login" });
  }, [ready, usuario, navigate]);

  const toggleSidebar = () => {
    if (typeof window !== "undefined" && window.innerWidth < 768) {
      setOpen((v) => !v);
    } else {
      setCollapsed((v) => !v);
    }
  };

  if (!ready || !usuario) return null;

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900 transition-colors dark:bg-slate-900 dark:text-slate-100">
      <Sidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <NavBar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden p-4 animate-fade-in sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
