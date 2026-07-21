// Escáner de cédula: toma foto (cámara o galería), envía a /api/ocr/cedula
// y devuelve los campos extraídos. Guarda ambas fotos como documentos adjuntos.
import { useRef, useState } from "react";
import { Camera, ImageIcon, RotateCcw, Check, X, Edit3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Lado = "anverso" | "reverso";
type Estado = "idle" | "procesando" | "anverso_listo" | "completo" | "error";

interface CamposOCR {
  cedula?: string;
  fechaNacimiento?: string;
  sexo?: "M" | "F";
  primerApellido?: string;
  segundoApellido?: string;
  primerNombre?: string;
  segundoNombre?: string;
  direccionRegistrada?: string;
  departamentoRegistrado?: string;
}

interface Props {
  onCamposDetectados: (campos: CamposOCR, lado: Lado) => void;
  onFotoCapturada: (base64: string, lado: Lado) => void;
  onLlenarManual: () => void;
}

const leerArchivo = (f: File): Promise<string> =>
  new Promise((res, rej) => {
    const r = new FileReader();
    r.onload = () => res(r.result as string);
    r.onerror = () => rej(r.error);
    r.readAsDataURL(f);
  });

export function CedulaScanner({ onCamposDetectados, onFotoCapturada, onLlenarManual }: Props) {
  const [estado, setEstado] = useState<Estado>("idle");
  const [ladoActual, setLadoActual] = useState<Lado>("anverso");
  const [fotoAnverso, setFotoAnverso] = useState<string | null>(null);
  const [fotoReverso, setFotoReverso] = useState<string | null>(null);
  const [error, setError] = useState<string>("");
  const inputCamRef = useRef<HTMLInputElement>(null);
  const inputGalRef = useRef<HTMLInputElement>(null);

  const procesar = async (file: File, lado: Lado) => {
    setEstado("procesando");
    setError("");
    try {
      const base64 = await leerArchivo(file);
      if (lado === "anverso") setFotoAnverso(base64);
      else setFotoReverso(base64);
      onFotoCapturada(base64, lado);

      const resp = await fetch("/api/ocr/cedula", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: base64, lado }),
      });
      const data = await resp.json();
      if (!data.exito) throw new Error(data.error || "No se pudo procesar la imagen");
      onCamposDetectados(data.campos || {}, lado);

      if (lado === "anverso") {
        setLadoActual("reverso");
        setEstado("anverso_listo");
      } else {
        setEstado("completo");
      }
    } catch (e) {
      setError((e as Error).message);
      setEstado("error");
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) procesar(f, ladoActual);
    e.target.value = "";
  };

  const reiniciar = () => {
    setFotoAnverso(null);
    setFotoReverso(null);
    setLadoActual("anverso");
    setEstado("idle");
    setError("");
  };

  return (
    <div
      className={cn(
        "rounded-xl border-2 border-dashed p-4 transition-colors",
        estado === "error"
          ? "border-fieldcredit-red bg-red-50 dark:bg-red-900/20"
          : "border-fieldcredit-green bg-fieldcredit-green-pale dark:border-fieldcredit-green-dark dark:bg-slate-800",
      )}
    >
      <input ref={inputCamRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFile} />
      <input ref={inputGalRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />

      {estado === "idle" && (
        <div className="text-center">
          <Camera className="mx-auto mb-2 text-fieldcredit-green-dark dark:text-fieldcredit-green" size={32} />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Escanear cédula de identidad</h3>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Captura ambas caras para auto-completar los datos del solicitante
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => inputCamRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md bg-fieldcredit-green px-3 py-2 text-xs font-semibold text-white hover:bg-fieldcredit-green-dark"
            >
              <Camera size={14} /> Escanear anverso
            </button>
            <button
              type="button"
              onClick={() => inputGalRef.current?.click()}
              className="inline-flex items-center gap-1.5 rounded-md border border-fieldcredit-green bg-white px-3 py-2 text-xs font-semibold text-fieldcredit-green-dark hover:bg-fieldcredit-green-pale dark:bg-slate-700 dark:text-fieldcredit-green"
            >
              <ImageIcon size={14} /> Subir imagen
            </button>
            <button
              type="button"
              onClick={onLlenarManual}
              className="inline-flex items-center gap-1.5 rounded-md px-3 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
            >
              <Edit3 size={14} /> Llenar manualmente
            </button>
          </div>
        </div>
      )}

      {estado === "procesando" && (
        <div className="text-center">
          <div className="relative mx-auto h-40 w-full max-w-xs overflow-hidden rounded-lg">
            {(ladoActual === "anverso" ? fotoAnverso : fotoReverso) && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={ladoActual === "anverso" ? fotoAnverso! : fotoReverso!}
                alt="Cédula"
                className="h-full w-full object-cover opacity-60 blur-sm"
              />
            )}
            <div className="absolute inset-0 grid place-items-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-fieldcredit-teal border-t-transparent" />
            </div>
          </div>
          <p className="mt-3 text-sm font-medium text-fieldcredit-teal-dark dark:text-fieldcredit-teal">
            Leyendo cédula con IA...
          </p>
        </div>
      )}

      {(estado === "anverso_listo" || estado === "completo") && (
        <div>
          <div className="grid grid-cols-2 gap-3">
            {fotoAnverso && <Thumb src={fotoAnverso} label="Anverso" done />}
            {fotoReverso ? (
              <Thumb src={fotoReverso} label="Reverso" done />
            ) : (
              <div className="grid place-items-center rounded-lg border-2 border-dashed border-fieldcredit-green bg-white/50 p-3 text-center text-xs text-slate-600 dark:bg-slate-700/50 dark:text-slate-300">
                Ahora escanea el reverso
              </div>
            )}
          </div>
          {estado === "anverso_listo" ? (
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button
                type="button"
                onClick={() => inputCamRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md bg-fieldcredit-green px-3 py-2 text-xs font-semibold text-white hover:bg-fieldcredit-green-dark"
              >
                <Camera size={14} /> Escanear reverso
              </button>
              <button
                type="button"
                onClick={() => inputGalRef.current?.click()}
                className="inline-flex items-center gap-1.5 rounded-md border border-fieldcredit-green bg-white px-3 py-2 text-xs font-semibold text-fieldcredit-green-dark dark:bg-slate-700 dark:text-fieldcredit-green"
              >
                <ImageIcon size={14} /> Subir reverso
              </button>
            </div>
          ) : (
            <div className="mt-3 text-center">
              <p className="text-xs font-medium text-fieldcredit-green-dark dark:text-fieldcredit-green">
                ✅ Ambas fotos guardadas en el expediente
              </p>
              <button
                type="button"
                onClick={reiniciar}
                className="mt-2 inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100"
              >
                <RotateCcw size={14} /> Volver a escanear
              </button>
            </div>
          )}
        </div>
      )}

      {estado === "error" && (
        <div className="text-center">
          <X className="mx-auto mb-1 text-fieldcredit-red" size={28} />
          <p className="text-sm font-semibold text-fieldcredit-red">{error || "Error al procesar la imagen"}</p>
          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
            Sugerencia: mejor iluminación, sin reflejos
          </p>
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => { setEstado("idle"); setError(""); }}
              className="inline-flex items-center gap-1.5 rounded-md bg-fieldcredit-green px-3 py-2 text-xs font-semibold text-white hover:bg-fieldcredit-green-dark"
            >
              <RotateCcw size={14} /> Intentar de nuevo
            </button>
            <button
              type="button"
              onClick={onLlenarManual}
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-200"
            >
              <Edit3 size={14} /> Llenar manualmente
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Thumb({ src, label, done }: { src: string; label: string; done?: boolean }) {
  return (
    <div className="relative overflow-hidden rounded-lg border border-fieldcredit-green">
      <img src={src} alt={label} className="h-24 w-full object-cover" />
      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-[10px] text-white">
        <span>{label}</span>
        {done && <Check size={12} className="text-fieldcredit-green-light" />}
      </div>
    </div>
  );
}
