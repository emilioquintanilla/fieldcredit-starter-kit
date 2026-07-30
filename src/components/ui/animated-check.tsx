/**
 * AnimatedCheck — Animación de éxito para acciones completadas.
 *
 * Un check SVG que se dibuja progresivamente dentro de un círculo.
 * Reemplaza las confirmaciones aburridas por un momento de "delight".
 *
 * Uso:
 *   <AnimatedCheck />
 *   <AnimatedCheck size={64} color="teal" label="Expediente enviado" />
 */

import { cn } from "@/lib/utils";

interface AnimatedCheckProps {
  /** Tamaño del componente en px */
  size?: number;
  /** Color de la marca MiCrédito */
  color?: "green" | "teal" | "amber";
  /** Texto opcional debajo del check */
  label?: string;
  /** Clase CSS adicional */
  className?: string;
}

const COLOR_MAP = {
  green: {
    circle: "stroke-fieldcredit-green",
    check: "stroke-fieldcredit-green",
    bg: "bg-fieldcredit-green-pale dark:bg-green-900/30",
    text: "text-fieldcredit-green-dark dark:text-green-200",
  },
  teal: {
    circle: "stroke-fieldcredit-teal",
    check: "stroke-fieldcredit-teal",
    bg: "bg-fieldcredit-teal-pale dark:bg-teal-900/30",
    text: "text-fieldcredit-teal-dark dark:text-teal-200",
  },
  amber: {
    circle: "stroke-fieldcredit-amber",
    check: "stroke-fieldcredit-amber",
    bg: "bg-fieldcredit-amber-light dark:bg-amber-900/30",
    text: "text-amber-700 dark:text-amber-200",
  },
} as const;

export function AnimatedCheck({
  size = 48,
  color = "green",
  label,
  className,
}: AnimatedCheckProps) {
  const colors = COLOR_MAP[color];

  return (
    <div
      className={cn("flex flex-col items-center gap-2", className)}
      style={{ animation: "scaleIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
    >
      <div
        className={cn("grid place-items-center rounded-full", colors.bg)}
        style={{ width: size + 16, height: size + 16 }}
      >
        <svg
          width={size}
          height={size}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Círculo de fondo — se dibuja primero */}
          <circle
            cx="24"
            cy="24"
            r="20"
            className={colors.circle}
            strokeWidth="2.5"
            strokeLinecap="round"
            style={{
              strokeDasharray: 126,
              strokeDashoffset: 126,
              animation: "checkCircle 0.5s ease-out 0.1s forwards",
              opacity: 0.3,
            }}
          />
          {/* Check — se dibuja después */}
          <polyline
            points="15 25 21 31 33 19"
            className={colors.check}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            style={{
              strokeDasharray: 30,
              strokeDashoffset: 30,
              animation: "checkDraw 0.4s ease-out 0.4s forwards",
            }}
          />
        </svg>
      </div>

      {label && (
        <span
          className={cn("text-sm font-medium", colors.text)}
          style={{ animation: "slideUp 0.3s ease-out 0.5s both" }}
        >
          {label}
        </span>
      )}

      {/* Keyframe adicional para el círculo */}
      <style>{`
        @keyframes checkCircle {
          to { stroke-dashoffset: 0; }
        }
      `}</style>
    </div>
  );
}
