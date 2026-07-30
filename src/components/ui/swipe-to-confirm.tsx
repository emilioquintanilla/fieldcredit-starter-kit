/**
 * SwipeToConfirm — Microinteracción de deslizamiento para confirmaciones.
 *
 * Inspirado en el patrón "slide to confirm" de apps bancarias como Lafise Digital.
 * Previene toques accidentales y da feedback visual progresivo.
 *
 * Uso:
 *   <SwipeToConfirm
 *     label="Deslice para enviar a comité"
 *     onConfirm={() => enviarAComite(id)}
 *     variant="success"
 *   />
 *
 * Variantes:
 *   - success: verde MiCrédito (aprobar, enviar, confirmar)
 *   - danger: rojo (rechazar, eliminar)
 *   - warning: ámbar (acciones que requieren revisión)
 *
 * Requiere: framer-motion, lucide-react
 */

import { useState, useRef, useCallback, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Check, ChevronRight, Loader2 } from "lucide-react";

// ── Configuración por variante ──────────────────────────────────
const VARIANT_STYLES = {
  success: {
    track: "bg-fieldcredit-green-pale dark:bg-green-900/20",
    trackActive: "bg-fieldcredit-green-light dark:bg-green-900/40",
    thumb: "bg-fieldcredit-green shadow-lg shadow-fieldcredit-green/30",
    fill: "bg-fieldcredit-green/15",
    text: "text-fieldcredit-green-dark/70 dark:text-green-300/70",
    done: "bg-fieldcredit-green-pale dark:bg-green-900/30",
    doneText: "text-fieldcredit-green-dark dark:text-green-200",
  },
  danger: {
    track: "bg-red-50 dark:bg-red-900/20",
    trackActive: "bg-red-100 dark:bg-red-900/40",
    thumb: "bg-fieldcredit-red shadow-lg shadow-fieldcredit-red/30",
    fill: "bg-fieldcredit-red/15",
    text: "text-red-400 dark:text-red-400/70",
    done: "bg-red-50 dark:bg-red-900/30",
    doneText: "text-fieldcredit-red dark:text-red-200",
  },
  warning: {
    track: "bg-amber-50 dark:bg-amber-900/20",
    trackActive: "bg-amber-100 dark:bg-amber-900/40",
    thumb: "bg-fieldcredit-amber shadow-lg shadow-fieldcredit-amber/30",
    fill: "bg-fieldcredit-amber/15",
    text: "text-amber-500 dark:text-amber-400/70",
    done: "bg-amber-50 dark:bg-amber-900/30",
    doneText: "text-amber-700 dark:text-amber-200",
  },
} as const;

type SwipeVariant = keyof typeof VARIANT_STYLES;

interface SwipeToConfirmProps {
  /** Texto que aparece en la pista (e.g. "Deslice para aprobar") */
  label: string;
  /** Callback que se ejecuta al completar el swipe */
  onConfirm: () => void | Promise<void>;
  /** Variante de color según la acción */
  variant?: SwipeVariant;
  /** Deshabilitar el componente */
  disabled?: boolean;
  /** Clase CSS adicional */
  className?: string;
  /** Texto que aparece al confirmar */
  confirmedLabel?: string;
}

// ── Constantes ──────────────────────────────────────────────────
const THUMB_SIZE = 56;
const THUMB_MARGIN = 4;
const CONFIRM_THRESHOLD = 0.8; // 80% del recorrido

export function SwipeToConfirm({
  label,
  onConfirm,
  variant = "success",
  disabled = false,
  className,
  confirmedLabel = "¡Confirmado!",
}: SwipeToConfirmProps) {
  const [state, setState] = useState<"idle" | "dragging" | "loading" | "done">("idle");
  const [progress, setProgress] = useState(0);
  const trackRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const currentX = useRef(0);
  const maxTravel = useRef(0);
  const isDragging = useRef(false);

  const colors = VARIANT_STYLES[variant];

  // Calcular ancho máximo de recorrido
  useEffect(() => {
    if (trackRef.current) {
      maxTravel.current = trackRef.current.offsetWidth - THUMB_SIZE - THUMB_MARGIN * 2;
    }
  }, []);

  const updatePosition = useCallback((clientX: number) => {
    const delta = clientX - startX.current;
    const clamped = Math.max(0, Math.min(delta, maxTravel.current));
    currentX.current = clamped;
    const pct = maxTravel.current > 0 ? clamped / maxTravel.current : 0;
    setProgress(pct);

    if (thumbRef.current) {
      thumbRef.current.style.transform = `translateX(${clamped}px)`;
    }
  }, []);

  const resetPosition = useCallback(() => {
    if (thumbRef.current) {
      thumbRef.current.style.transition = "transform 0.4s cubic-bezier(0.16, 1, 0.3, 1)";
      thumbRef.current.style.transform = "translateX(0px)";
      setTimeout(() => {
        if (thumbRef.current) thumbRef.current.style.transition = "";
      }, 400);
    }
    setProgress(0);
    setState("idle");
    isDragging.current = false;
  }, []);

  const handleConfirm = useCallback(async () => {
    setState("loading");
    try {
      await onConfirm();
      setState("done");
    } catch {
      resetPosition();
    }
  }, [onConfirm, resetPosition]);

  // ── Handlers táctiles ─────────────────────────────────────────
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || state !== "idle") return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      startX.current = e.clientX;
      isDragging.current = true;
      setState("dragging");
    },
    [disabled, state],
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging.current) return;
      updatePosition(e.clientX);
    },
    [updatePosition],
  );

  const handlePointerUp = useCallback(() => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (progress >= CONFIRM_THRESHOLD) {
      // Snap al final
      if (thumbRef.current) {
        thumbRef.current.style.transition = "transform 0.2s ease-out";
        thumbRef.current.style.transform = `translateX(${maxTravel.current}px)`;
      }
      handleConfirm();
    } else {
      resetPosition();
    }
  }, [progress, handleConfirm, resetPosition]);

  // ── Estado "done" ─────────────────────────────────────────────
  if (state === "done") {
    return (
      <div
        className={cn(
          "flex h-14 items-center justify-center gap-2 rounded-full",
          colors.done,
          colors.doneText,
          "animate-[scaleIn_0.2s_ease-out]",
          className,
        )}
      >
        <svg
          className="h-5 w-5"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline
            points="4 12 9 17 20 6"
            style={{
              strokeDasharray: 24,
              strokeDashoffset: 0,
              animation: "checkDraw 0.4s ease-out forwards",
            }}
          />
        </svg>
        <span className="text-sm font-semibold">{confirmedLabel}</span>
      </div>
    );
  }

  // ── Label opacity basado en progreso ──────────────────────────
  const labelOpacity = Math.max(0, 1 - progress * 2.5);

  return (
    <div
      ref={trackRef}
      className={cn(
        "relative flex h-14 select-none items-center overflow-hidden rounded-full",
        state === "dragging" ? colors.trackActive : colors.track,
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      {/* Relleno progresivo */}
      <div
        className={cn("absolute inset-y-0 left-0 rounded-full transition-none", colors.fill)}
        style={{ width: `${progress * 100}%` }}
      />

      {/* Texto indicador */}
      <span
        className={cn(
          "pointer-events-none absolute inset-0 flex items-center justify-center gap-1 text-sm font-medium transition-none",
          colors.text,
        )}
        style={{ opacity: labelOpacity }}
      >
        {label}
        <ChevronRight className="h-4 w-4 animate-pulse" />
      </span>

      {/* Thumb — el control que se arrastra */}
      <div
        ref={thumbRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={cn(
          "relative z-10 flex items-center justify-center rounded-full touch-none",
          "cursor-grab active:cursor-grabbing",
          colors.thumb,
          state === "loading" && "pointer-events-none",
        )}
        style={{
          width: THUMB_SIZE,
          height: THUMB_SIZE - THUMB_MARGIN * 2,
          margin: THUMB_MARGIN,
        }}
      >
        {state === "loading" ? (
          <Loader2 className="h-5 w-5 animate-spin text-white" />
        ) : (
          <ChevronRight className="h-6 w-6 text-white" />
        )}
      </div>
    </div>
  );
}
