// Layout padre del módulo Comité. Los hijos (/comite y /comite/$id) se renderizan aquí.
import { createFileRoute, Outlet } from "@tanstack/react-router";

export const Route = createFileRoute("/comite")({
  component: () => <Outlet />,
});
