// Endpoint OCR de cédula de identidad nicaragüense
// Recibe imagen en base64 y devuelve campos extraídos con Google Cloud Vision
// La clave GOOGLE_CLOUD_VISION_KEY vive solo en el servidor — nunca en el cliente
import { createFileRoute } from "@tanstack/react-router";

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

function parsearCedulaNicaragua(texto: string, lado: "anverso" | "reverso"): CamposOCR {
  const lineas = texto.split("\n").map((l) => l.trim()).filter(Boolean);
  const r: CamposOCR = {};

  if (lado === "anverso") {
    const regexCedula = /\b(\d{3}[-\s]?\d{6}[-\s]?\d{4}[A-Z])\b/i;
    for (const l of lineas) {
      const m = l.match(regexCedula);
      if (m) { r.cedula = m[1].replace(/\s/g, "-").toUpperCase(); break; }
    }
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

export const Route = createFileRoute("/api/ocr/cedula")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          const { imageBase64, lado } = (await request.json()) as {
            imageBase64: string;
            lado: "anverso" | "reverso";
          };
          const apiKey = process.env.GOOGLE_CLOUD_VISION_KEY;
          if (!apiKey) {
            return Response.json(
              { exito: false, error: "GOOGLE_CLOUD_VISION_KEY no configurada en el servidor." },
              { status: 500 },
            );
          }
          // Limpia el prefijo data URL si viene incluido
          const clean = imageBase64.replace(/^data:image\/\w+;base64,/, "");
          const visionResp = await fetch(
            `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                requests: [{
                  image: { content: clean },
                  features: [
                    { type: "TEXT_DETECTION", maxResults: 1 },
                    { type: "DOCUMENT_TEXT_DETECTION", maxResults: 1 },
                  ],
                }],
              }),
            },
          );
          if (!visionResp.ok) {
            const t = await visionResp.text();
            return Response.json(
              { exito: false, error: `Vision API: ${visionResp.status} ${t.slice(0, 200)}` },
              { status: 502 },
            );
          }
          const data = await visionResp.json();
          const texto = data.responses?.[0]?.fullTextAnnotation?.text || "";
          const campos = parsearCedulaNicaragua(texto, lado);
          return Response.json({ exito: true, campos, textoDetectado: texto });
        } catch (e) {
          return Response.json(
            { exito: false, error: (e as Error).message || "Error desconocido" },
            { status: 500 },
          );
        }
      },
    },
  },
});
