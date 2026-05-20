import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { getAuditLogs } from "@/features/audit/actions";
import { getSession, getShopScope } from "@/lib/session";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { format } from "date-fns";
import { Shield, Clock, User, Activity } from "lucide-react";
import { TableSkeleton } from "@/components/skeletons";
import { GlobalBanner } from "@/components/global-banner";
import { Badge } from "@/components/ui/badge";

export const metadata = {
  title: "Audit Log | DI-CMS",
  description: "Monitor system activity and user actions.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string }>;
}) {
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    redirect("/");
  }

  const resolvedSearchParams = await searchParams;
  const page = Number(resolvedSearchParams.page) || 1;
  const session = await getSession();
  const { isGlobal } = getShopScope(session);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Shield className="h-8 w-8 text-primary" />
          Audit Log
        </h1>
        <p className="text-muted-foreground">
          Monitor every action taken by users in your shop.
        </p>
      </div>

      {isGlobal && <GlobalBanner />}

      <Suspense fallback={<TableSkeleton rows={10} cols={5} />}>
        <AuditTable page={page} isGlobal={isGlobal} />
      </Suspense>
    </div>
  );
}

// ─── Async Data Component ────────────────────────────────────────────────────
async function AuditTable({ page, isGlobal }: { page: number; isGlobal?: boolean }) {
  const res = await getAuditLogs(page);

  if (!res.success || !res.data) {
    return (
      <div className="p-8 text-center border-2 border-dashed rounded-lg">
        <Shield className="h-10 w-10 mx-auto text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold">Could not load audit logs</h2>
        <p className="text-muted-foreground">{res.error}</p>
      </div>
    );
  }

  const { logs, pagination } = res.data;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          System Activity
        </CardTitle>
        <CardDescription>
          Showing {logs.length} most recent actions (Total: {pagination.total})
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[180px]">Timestamp</TableHead>
              <TableHead>User</TableHead>
              {isGlobal && <TableHead>Branch</TableHead>}
              <TableHead>Action</TableHead>
              <TableHead>Entity</TableHead>
              <TableHead className="text-right">ID</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logs.map((log) => (
              <TableRow key={log.id}>
                <TableCell className="font-mono text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    {format(new Date(log.createdAt), "MMM dd, HH:mm:ss")}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
                      <User className="h-3 w-3 text-primary" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-sm font-medium">
                        {log.user.name || "System"}
                      </span>
                      <span className="text-[10px] text-muted-foreground">
                        {log.user.email}
                      </span>
                    </div>
                  </div>
                </TableCell>
                {isGlobal && (
                  <TableCell>
                    <Badge variant="outline" className="text-xs bg-muted/50">{(log as any).shop?.name || "Unknown"}</Badge>
                  </TableCell>
                )}
                <TableCell>
                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-secondary text-secondary-foreground">
                    {log.action}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm">{log.entityType}</span>
                </TableCell>
                <TableCell className="text-right font-mono text-[10px] text-muted-foreground">
                  {log.entityId?.slice(-8) || "—"}
                </TableCell>
              </TableRow>
            ))}
            {logs.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={isGlobal ? 6 : 5}
                  className="text-center py-12 text-muted-foreground"
                >
                  No activity recorded yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
