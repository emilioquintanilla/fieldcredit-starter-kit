// Módulo de clientes (placeholder)
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — FieldCredit" }] }),
  component: () => (
    <AppLayout>
      <PageHeader title="Clientes" subtitle="Directorio de clientes" />
      <Placeholder />
    </AppLayout>
  ),
});
