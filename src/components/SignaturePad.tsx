// Canvas de firma digital — funciona con touch (móvil) y mouse (desktop)
import { useEffect, useRef, useState } from "react";
import { Eraser } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  onChange: (dataUrl: string | null) => void;
  valorInicial?: string;
}

export function SignaturePad({ onChange, valorInicial }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dibujando, setDibujando] = useState(false);
  const [tieneFirma, setTieneFirma] = useState(!!valorInicial);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Ajusta resolución según DPR
    const ratio = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    const ctx = canvas.getContext("2d")!;
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.2;
    ctx.strokeStyle = "#0f172a";
    if (valorInicial) {
      const img = new Image();
      img.onload = () => ctx.drawImage(img, 0, 0, rect.width, rect.height);
      img.src = valorInicial;
    }
  }, [valorInicial]);

  const getPos = (e: React.PointerEvent) => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const start = (e: React.PointerEvent) => {
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    setDibujando(true);
    (e.target as Element).setPointerCapture(e.pointerId);
  };
  const move = (e: React.PointerEvent) => {
    if (!dibujando) return;
    const ctx = canvasRef.current!.getContext("2d")!;
    const p = getPos(e);
    ctx.lineTo(p.x, p.y);
    ctx.stroke();
  };
  const end = () => {
    if (!dibujando) return;
    setDibujando(false);
    const data = canvasRef.current!.toDataURL("image/png");
    setTieneFirma(true);
    onChange(data);
  };

  const limpiar = () => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setTieneFirma(false);
    onChange(null);
  };

  return (
    <div>
      <div
        className={cn(
          "rounded-lg border-2 bg-white transition-colors dark:bg-slate-100",
          tieneFirma ? "border-fieldcredit-green" : "border-dashed border-gray-300",
        )}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={start}
          onPointerMove={move}
          onPointerUp={end}
          onPointerLeave={end}
          className="h-40 w-full touch-none rounded-lg"
        />
      </div>
      <div className="mt-2 flex items-center justify-between text-xs">
        <span className="text-slate-500 dark:text-slate-400">
          {tieneFirma ? "Firma capturada" : "Firme con el dedo o el mouse"}
        </span>
        <button
          type="button"
          onClick={limpiar}
          className="inline-flex items-center gap-1 text-fieldcredit-red hover:underline"
        >
          <Eraser size={12} /> Limpiar firma
        </button>
      </div>
    </div>
  );
}
