// Módulo de comité (placeholder)
import { createFileRoute } from "@tanstack/react-router";
import { AppLayout } from "@/components/AppLayout";
import { PageHeader } from "@/components/PageHeader";
import { Placeholder } from "@/components/Placeholder";

export const Route = createFileRoute("/comite")({
  head: () => ({ meta: [{ title: "Comité — FieldCredit" }] }),
  component: () => (
    <AppLayout>
      <PageHeader title="Comité de crédito" subtitle="Aprobaciones y revisiones" />
      <Placeholder />
    </AppLayout>
  ),
});
