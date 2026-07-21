// Detalle de expediente (placeholder)
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/expedientes/$id")({
  head: () => ({ meta: [{ title: "Detalle de expediente — FieldCredit" }] }),
  component: ExpedienteDetalle,
});

function ExpedienteDetalle() {
  const { id } = Route.useParams();
  return (
    <AppLayout>
      <PageHeader title={`Expediente #${id}`} subtitle="Detalle de la solicitud" />
      <Placeholder />
    </AppLayout>
  );
}
