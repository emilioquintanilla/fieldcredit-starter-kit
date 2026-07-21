// Placeholder para módulos aún no desarrollados
export function Placeholder({ message = "Módulo en desarrollo" }: { message?: string }) {
  return (
    <div className="grid place-items-center rounded-xl border border-dashed border-slate-300 bg-white p-10 text-center dark:border-slate-700 dark:bg-slate-800">
      <div className="text-4xl">🚧</div>
      <p className="mt-3 text-sm font-medium text-slate-600 dark:text-slate-300">{message}</p>
      <p className="mt-1 text-xs text-slate-400">Próximamente disponible.</p>
    </div>
  );
}
