// OCR de cédula nicaragüense — corre 100% en el navegador con Tesseract.js
// No requiere backend ni claves. El modelo `spa` se descarga en el primer uso
// y queda cacheado por el navegador para llamadas siguientes.

export interface CamposOCR {
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

export interface ResultadoOCR {
  exito: boolean;
  campos: CamposOCR;
  textoDetectado: string;
  error?: string;
}

// Parser específico para cédula de identidad de Nicaragua
function parsearCedulaNicaragua(texto: string, lado: "anverso" | "reverso"): CamposOCR {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const r: CamposOCR = {};

  if (lado === "anverso") {
    // Formato oficial: 000-000000-0000X
    const regexCedula = /\b(\d{3}[-\s]?\d{6}[-\s]?\d{4}[A-Z])\b/i;
    for (const l of lineas) {
      const m = l.match(regexCedula);
      if (m) {
        r.cedula = m[1].replace(/\s/g, "-").toUpperCase();
        break;
      }
    }
    // Fecha DD/MM/AAAA o DD-MM-AAAA → ISO YYYY-MM-DD
    const regexFecha = /\b(\d{2}[\/\-]\d{2}[\/\-]\d{4})\b/;
    for (const l of lineas) {
      const m = l.match(regexFecha);
      if (m) {
        const p = m[1].split(/[\/\-]/);
        if (p[2].length === 4) r.fechaNacimiento = `${p[2]}-${p[1]}-${p[0]}`;
        break;
      }
    }
    for (const l of lineas) {
      if (/\bM(ASCULINO)?\b/i.test(l)) { r.sexo = "M"; break; }
      if (/\bF(EMENINO)?\b/i.test(l))  { r.sexo = "F"; break; }
    }
    const excluir = ["NICARAGUA", "CEDULA", "CÉDULA", "REPUBLICA", "REPÚBLICA", "IDENTIDAD"];
    const nombresLineas = lineas.filter(
      (l) => /^[A-ZÁÉÍÓÚÑ\s]+$/.test(l) && l.length > 2 && !excluir.some((w) => l.includes(w)),
    );
    if (nombresLineas.length >= 2) {
      const aps = nombresLineas[0].trim().split(/\s+/);
      const nms = nombresLineas[1].trim().split(/\s+/);
      r.primerApellido  = aps[0] || "";
      r.segundoApellido = aps[1] || "";
      r.primerNombre    = nms[0] || "";
      r.segundoNombre   = nms[1] || "";
    }
  }

  if (lado === "reverso") {
    const palabrasClave = ["BARRIO", "COMARCA", "CALLE", "AVENIDA", "RESIDENCIAL",
      "KM", "COLONIA", "SECTOR", "REPARTO", "BO.", "CO.", "CASA", "DEL"];
    for (const l of lineas) {
      if (palabrasClave.some((p) => l.toUpperCase().includes(p)) && l.length > 15) {
        r.direccionRegistrada = l;
        break;
      }
    }
    const deps = ["BOACO", "CARAZO", "CHINANDEGA", "CHONTALES", "ESTELÍ", "GRANADA",
      "JINOTEGA", "LEÓN", "MADRIZ", "MANAGUA", "MASAYA", "MATAGALPA",
      "NUEVA SEGOVIA", "RIVAS", "RACCN", "RACCS"];
    for (const l of lineas) {
      const dep = deps.find((d) => l.toUpperCase().includes(d));
      if (dep) { r.departamentoRegistrado = dep; break; }
    }
  }
  return r;
}

// progress: 0..1 mientras Tesseract descarga modelo y reconoce texto
export async function reconocerCedula(
  imageBase64: string,
  lado: "anverso" | "reverso",
  onProgress?: (progress: number, status: string) => void,
): Promise<ResultadoOCR> {
  try {
    const Tesseract = (await import("tesseract.js")).default;
    const { data } = await Tesseract.recognize(imageBase64, "spa", {
      logger: (m: { status: string; progress: number }) => {
        if (onProgress) onProgress(m.progress ?? 0, m.status ?? "");
      },
    });
    const texto = data.text || "";
    const campos = parsearCedulaNicaragua(texto, lado);
    return { exito: true, campos, textoDetectado: texto };
  } catch (e) {
    return {
      exito: false,
      campos: {},
      textoDetectado: "",
      error: (e as Error).message || "Error al procesar la imagen",
    };
  }
}
