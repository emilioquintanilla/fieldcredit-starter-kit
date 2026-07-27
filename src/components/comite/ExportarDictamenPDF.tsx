/**
 * ExportarDictamenPDF — botón que genera el PDF del dictamen desde el navegador.
 *
 * Usa window.print() con una hoja de estilos @media print incluida en el head.
 * Sin dependencias de backend ni librerías externas.
 * El PDF resultante es idéntico a la vista del dictamen, optimizado para A4.
 *
 * Ruta: src/components/comite/ExportarDictamenPDF.tsx
 */
import { useCallback, useEffect } from "react";
import { Download } from "lucide-react";
import type { DictamenIA } from "@/stores/expedientes";
import type { ExpedienteBorrador } from "@/stores/expedientes";

interface Props {
  dictamen: DictamenIA;
  expediente: ExpedienteBorrador;
  clienteNombre: string;
}

const COLOR_SEMAFORO = {
  verde: "#5eb837",
  amarillo: "#f59e0b",
  rojo: "#dc2626",
};

const COLOR_BANDERA = {
  verde: "#dcfce7",
  amarillo: "#fef9c3",
  rojo: "#fee2e2",
};

const COLOR_BANDERA_TEXT = {
  verde: "#166534",
  amarillo: "#713f12",
  rojo: "#991b1b",
};

const fmtC$ = (n?: number | null) =>
  n != null && isFinite(n) ? `C$ ${Math.round(n).toLocaleString("es-NI")}` : "—";
const fmtPct = (n?: number | null) =>
  n != null && isFinite(n) ? `${Number(n).toFixed(1)}%` : "—";

export function ExportarDictamenPDF({ dictamen, expediente, clienteNombre }: Props) {
  // Inyectar estilos de impresión al montar el componente
  useEffect(() => {
    const styleId = "fieldcredit-print-styles";
    if (document.getElementById(styleId)) return;
    const style = document.createElement("style");
    style.id = styleId;
    style.textContent = `
      @media print {
        body > *:not(#fc-dictamen-print) { display: none !important; }
        #fc-dictamen-print {
          display: block !important;
          position: fixed;
          inset: 0;
          background: white;
          z-index: 99999;
          padding: 24px 32px;
          font-family: 'Arial', sans-serif;
          font-size: 11px;
          color: #1e293b;
        }
        @page { margin: 1.5cm; size: A4; }
        .fc-no-print { display: none !important; }
        .fc-print-break { page-break-before: always; }
      }
      #fc-dictamen-print { display: none; }
    `;
    document.head.appendChild(style);
  }, []);

  const exportar = useCallback(() => {
    const d = expediente.data || {};
    const ahora = new Date().toLocaleString("es-NI", {
      day: "2-digit", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit",
    });

    const banderasHtml = dictamen.banderas.map((b) => `
      <div style="padding:6px 10px;margin-bottom:6px;border-radius:6px;
                  background:${COLOR_BANDERA[b.tipo]};color:${COLOR_BANDERA_TEXT[b.tipo]};
                  font-size:10px;">
        ${b.tipo === "verde" ? "✅" : b.tipo === "amarillo" ? "⚠️" : "🔴"} ${b.texto}
      </div>
    `).join("");

    const arsHtml = dictamen.scoreARS ? `
      <div style="margin-top:16px;padding:12px;border:1px solid #5eb837;border-radius:8px;background:#f0fae8;">
        <div style="font-weight:bold;color:#3d7a21;margin-bottom:8px;">
          🌾 AgroResilia Score (ARS): ${dictamen.scoreARS.score}/100 — ${dictamen.scoreARS.nivel.replace(/_/g, " ")}
        </div>
        <div style="font-size:10px;color:#166534;">Tasa: ${dictamen.scoreARS.tasa} · ${dictamen.scoreARS.condiciones}</div>
        ${dictamen.scoreARS.variables?.map((v) => `
          <div style="margin-top:6px;">
            <div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:2px;">
              <span>${v.nombre}</span><span style="font-weight:bold;">${v.puntaje}/100</span>
            </div>
            <div style="height:4px;background:#d1fae5;border-radius:2px;">
              <div style="height:4px;background:#5eb837;border-radius:2px;width:${v.puntaje}%;"></div>
            </div>
          </div>
        `).join("") ?? ""}
      </div>
    ` : "";

    const condicionesHtml = dictamen.recomendacion.condiciones?.length > 0
      ? `<ul style="margin:6px 0 0 16px;padding:0;">
          ${dictamen.recomendacion.condiciones.map((c) => `<li style="margin-bottom:4px;">${c}</li>`).join("")}
        </ul>`
      : "";

    const colorSemaforo = COLOR_SEMAFORO[dictamen.semaforo] || "#64748b";

    const html = `
      <div style="max-width:700px;margin:0 auto;">

        <!-- Encabezado institucional -->
        <div style="display:flex;justify-content:space-between;align-items:flex-start;
                    border-bottom:2px solid #5eb837;padding-bottom:12px;margin-bottom:16px;">
          <div>
            <div style="font-size:16px;font-weight:bold;color:#3d7a21;">MiCrédito · FieldCredit</div>
            <div style="font-size:12px;font-weight:bold;color:#1e293b;margin-top:4px;">
              DICTAMEN CREDITICIO — COPILOTO IA
            </div>
            <div style="font-size:10px;color:#64748b;">Generado: ${ahora}</div>
          </div>
          <div style="text-align:right;">
            <div style="font-size:10px;color:#64748b;">Expediente</div>
            <div style="font-size:14px;font-weight:bold;">${expediente.id}</div>
            <div style="font-size:10px;color:#64748b;">Estado: ${expediente.estado}</div>
          </div>
        </div>

        <!-- Score y semáforo -->
        <div style="display:flex;gap:16px;margin-bottom:16px;">
          <div style="flex:0 0 auto;text-align:center;padding:16px 24px;
                      border-radius:12px;background:${colorSemaforo}20;border:2px solid ${colorSemaforo};">
            <div style="font-size:36px;font-weight:900;color:${colorSemaforo};">${dictamen.score}</div>
            <div style="font-size:10px;color:#64748b;">/ 100</div>
            <div style="margin-top:4px;font-size:11px;font-weight:bold;
                        color:${colorSemaforo};text-transform:uppercase;">${dictamen.semaforo}</div>
          </div>
          <div style="flex:1;">
            <div style="font-size:11px;font-weight:bold;color:#1e293b;margin-bottom:6px;">Resumen ejecutivo</div>
            <div style="font-size:11px;line-height:1.6;color:#334155;">${dictamen.resumen}</div>
          </div>
        </div>

        <!-- Datos del cliente -->
        <div style="background:#f8fafc;border-radius:8px;padding:12px;margin-bottom:16px;">
          <div style="font-size:11px;font-weight:bold;color:#1e293b;margin-bottom:8px;">👤 Información del solicitante</div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10px;color:#475569;">
            <div><b>Nombre:</b> ${clienteNombre}</div>
            <div><b>Cédula:</b> ${d.cedula || "—"}</div>
            <div><b>Actividad:</b> ${d.tipo_actividad || "—"}</div>
            <div><b>Producto:</b> ${d.producto || "—"}</div>
            <div><b>Monto solicitado:</b> ${fmtC$(d.monto)}</div>
            <div><b>Plazo:</b> ${d.plazo || "—"} meses</div>
            <div><b>Destino:</b> ${d.destino || "—"}</div>
            <div><b>Frecuencia:</b> ${d.frecuencia_pago || "—"}</div>
          </div>
        </div>

        <!-- Métricas clave -->
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:bold;color:#1e293b;margin-bottom:8px;">📊 Indicadores clave de riesgo</div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px;">
            ${[
              { label: "Capacidad de pago", val: fmtPct(dictamen.metricas.capacidadPago), ok: dictamen.metricas.capacidadPago <= 70, limite: "≤70%" },
              { label: "Cobertura de flujo", val: fmtPct(dictamen.metricas.coberturaFlujo), ok: dictamen.metricas.coberturaFlujo >= 100, limite: "≥100%" },
              { label: "Índice de endeudamiento", val: fmtPct(dictamen.metricas.indiceEndeudamiento), ok: dictamen.metricas.indiceEndeudamiento <= 60, limite: "≤60%" },
              { label: "Cobertura de garantías", val: fmtPct(dictamen.metricas.coberturaGarantias), ok: dictamen.metricas.coberturaGarantias >= 100 || dictamen.metricas.coberturaGarantias === 0, limite: "≥100%" },
            ].map((m) => `
              <div style="padding:8px;border-radius:6px;text-align:center;
                          background:${m.ok ? "#f0fdf4" : "#fef2f2"};
                          border:1px solid ${m.ok ? "#bbf7d0" : "#fecaca"};">
                <div style="font-size:16px;font-weight:bold;color:${m.ok ? "#166534" : "#991b1b"};">${m.val}</div>
                <div style="font-size:9px;color:#64748b;margin-top:2px;">${m.label}</div>
                <div style="font-size:8px;color:${m.ok ? "#166534" : "#991b1b"};">${m.limite}</div>
              </div>
            `).join("")}
          </div>
        </div>

        <!-- ARS si aplica -->
        ${arsHtml}

        <!-- Banderas de cumplimiento -->
        <div style="margin-bottom:16px;">
          <div style="font-size:11px;font-weight:bold;color:#1e293b;margin-bottom:8px;">🚩 Banderas de cumplimiento</div>
          ${banderasHtml}
        </div>

        <!-- Recomendación -->
        <div style="padding:12px;border-radius:8px;background:#1e3a1e;color:white;margin-bottom:16px;">
          <div style="font-size:11px;font-weight:bold;margin-bottom:6px;">
            ⚖️ Recomendación del Copiloto IA:
            ${dictamen.recomendacion.accion === "aprobar" ? "✅ APROBAR"
              : dictamen.recomendacion.accion === "aprobar_con_condicion" ? "⚠️ APROBAR CON CONDICIÓN"
              : dictamen.recomendacion.accion === "rechazar" ? "🔴 RECHAZAR"
              : "🔍 REVISAR"}
          </div>
          <div style="font-size:10px;line-height:1.6;">${dictamen.recomendacion.texto}</div>
          ${condicionesHtml}
        </div>

        <!-- Decisión del comité -->
        ${expediente.comite?.decision ? `
          <div style="padding:12px;border-radius:8px;border:2px solid ${
            expediente.comite.decision.decision === "aprobado" ? "#5eb837"
            : expediente.comite.decision.decision === "condicionado" ? "#f59e0b" : "#dc2626"
          };margin-bottom:16px;">
            <div style="font-size:11px;font-weight:bold;margin-bottom:4px;">
              Decisión del comité humano:
              ${expediente.comite.decision.decision.toUpperCase()}
            </div>
            ${expediente.comite.decision.observacion
              ? `<div style="font-size:10px;color:#475569;">${expediente.comite.decision.observacion}</div>`
              : ""}
            <div style="font-size:9px;color:#94a3b8;margin-top:4px;">
              ${new Date(expediente.comite.decision.timestamp).toLocaleString("es-NI")}
            </div>
          </div>
        ` : ""}

        <!-- Disclaimer legal -->
        <div style="border-top:1px solid #e2e8f0;padding-top:10px;margin-top:8px;">
          <p style="font-size:9px;color:#94a3b8;line-height:1.5;margin:0;">
            ⚠️ Este dictamen es generado por el Copiloto IA de FieldCredit con fines de apoyo al análisis crediticio.
            No constituye una aprobación ni un desembolso. La decisión final corresponde exclusivamente al oficial
            de crédito y al comité de MiCrédito, en cumplimiento de la Ley 769 de Microfinanzas y la normativa CONAMI.
            FieldCredit — Sistema digital de gestión crediticia.
          </p>
        </div>
      </div>
    `;

    // Insertar en el div de impresión y disparar window.print()
    let printDiv = document.getElementById("fc-dictamen-print");
    if (!printDiv) {
      printDiv = document.createElement("div");
      printDiv.id = "fc-dictamen-print";
      document.body.appendChild(printDiv);
    }
    printDiv.innerHTML = html;

    // Disparar impresión en el siguiente frame para que el DOM se actualice
    requestAnimationFrame(() => {
      window.print();
    });
  }, [dictamen, expediente, clienteNombre]);

  return (
    <button
      onClick={exportar}
      className="flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition-colors hover:border-fieldcredit-green hover:text-fieldcredit-green dark:border-slate-600 dark:bg-slate-800 dark:text-slate-300 dark:hover:border-fieldcredit-green dark:hover:text-fieldcredit-green"
      title="Exportar dictamen como PDF"
    >
      <Download size={15} />
      Exportar PDF
    </button>
  );
}
