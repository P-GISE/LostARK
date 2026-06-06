import { Badge } from "@/components/ui";

export function StatusPill({ label }: { label: string }) {
  return <Badge tone="info">{label}</Badge>;
}
