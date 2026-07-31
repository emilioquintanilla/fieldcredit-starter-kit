// Layout autenticado: NavBar + Sidebar + área de contenido
// Fase 3 UX: colores semánticos, fondo con variable CSS
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
    <div className="flex min-h-screen bg-background text-foreground transition-colors">
      <Sidebar open={open} collapsed={collapsed} onClose={() => setOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col">
        <NavBar onToggleSidebar={toggleSidebar} />
        <main className="flex-1 overflow-x-hidden p-3 pb-20 sm:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
