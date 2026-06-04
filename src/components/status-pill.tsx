export function StatusPill({ label }: { label: string }) {
  return (
    <span className="rounded-full bg-zinc-100 px-2 py-1 text-xs font-medium text-zinc-700">
      {label}
    </span>
  );
}
