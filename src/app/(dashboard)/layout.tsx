import type { ReactNode } from "react";
import { getSession } from "@/lib/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  const session = await getSession();

  return (
    <DashboardShell session={session}>
      {children}
    </DashboardShell>
  );
}

