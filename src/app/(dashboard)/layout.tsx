import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <DashboardShell session={session}>
      {children}
    </DashboardShell>
  );
}

