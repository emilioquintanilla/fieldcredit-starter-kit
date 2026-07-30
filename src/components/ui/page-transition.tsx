/**
 * PageTransition — Envuelve el contenido de una ruta para animarlo al entrar.
 *
 * Usa CSS puro (no requiere framer-motion) para ser liviano.
 * Aplica un fade+slide-up sutil que hace que la navegación se sienta fluida.
 *
 * Uso en rutas:
 *   function MiPagina() {
 *     return (
 *       <PageTransition>
 *         <h1>Contenido</h1>
 *       </PageTransition>
 *     );
 *   }
 */

import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface PageTransitionProps {
  children: ReactNode;
  className?: string;
  /** Variante de animación */
  variant?: "fade" | "slide-up" | "scale";
}

const VARIANTS = {
  fade: "animate-[fadeIn_0.25s_ease-out]",
  "slide-up": "animate-[slideUp_0.3s_cubic-bezier(0.16,1,0.3,1)]",
  scale: "animate-[scaleIn_0.2s_cubic-bezier(0.16,1,0.3,1)]",
} as const;

export function PageTransition({
  children,
  className,
  variant = "slide-up",
}: PageTransitionProps) {
  return (
    <div className={cn(VARIANTS[variant], className)}>
      {children}
    </div>
  );
}
