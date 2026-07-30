// Devuelve la IP pública del cliente según las cabeceras del edge.
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/ip")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const h = request.headers;
        const ip =
          h.get("cf-connecting-ip") ||
          h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          h.get("x-real-ip") ||
          null;
        return Response.json(
          { ip },
          { headers: { "Cache-Control": "no-store" } },
        );
      },
    },
  },
});
