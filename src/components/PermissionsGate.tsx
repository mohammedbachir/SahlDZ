import { type ReactNode } from "react";
import { useAreaPermission, type OpsArea } from "@/lib/permissions";

// Renders children only when the current role has write access to `area`.
export function CanWrite({
  area,
  children,
  fallback = null,
}: {
  area: OpsArea;
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { canWrite } = useAreaPermission(area);
  return <>{canWrite ? children : fallback}</>;
}