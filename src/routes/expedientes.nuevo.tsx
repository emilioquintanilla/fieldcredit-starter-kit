// Nuevo expediente (placeholder)
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/expedientes/nuevo")({
  head: () => ({ meta: [{ title: "Nuevo expediente — FieldCredit" }] }),
  component: () => (
    <AppLayout>
      <PageHeader title="Nuevo expediente" subtitle="Crear una nueva solicitud de crédito" />
      <Placeholder />
    </AppLayout>
  ),
});
