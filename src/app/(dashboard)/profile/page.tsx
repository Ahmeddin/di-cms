import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { getUsers } from "@/features/users/actions";
import { getAllBranches } from "@/features/shops/actions";
import { UserTable } from "@/features/users/components/user-table";
import { BranchTable } from "@/features/shops/components/branch-table";
import {
  Tabs, TabsContent, TabsList, TabsTrigger,
} from "@/components/ui/tabs";
import {
  Users, Store, ShieldAlert,
} from "lucide-react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { AdminPageHeader } from "./_components/page-header";
import { AdminPanelSkeleton, TableSkeleton } from "@/components/skeletons";

export const metadata = {
  title: "Admin Control Panel | DI-CMS",
  description: "Manage users, roles, and branch access.",
};

// ─── Page Shell — renders INSTANTLY (after auth check) ───────────────────────
export default async function AdminProfilePage() {
  const session = await getSession();

  if (session?.user?.globalRole !== "SUPER_ADMIN") {
    redirect("/");
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <Suspense fallback={<div className="h-16 w-64 rounded-lg bg-muted animate-pulse" />}>
        <AdminHeaderData />
      </Suspense>

      <Tabs defaultValue="users" className="space-y-6">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="users" className="gap-2">
            <Users className="h-4 w-4" />
            Users
          </TabsTrigger>
          <TabsTrigger value="branches" className="gap-2">
            <Store className="h-4 w-4" />
            Branches
          </TabsTrigger>
          <TabsTrigger value="roles" className="gap-2">
            <ShieldAlert className="h-4 w-4" />
            Roles
          </TabsTrigger>
        </TabsList>

        <TabsContent value="users" className="space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div>
                <CardTitle>User Management</CardTitle>
                <CardDescription>
                  Manage permissions and shop access for all employees.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Suspense fallback={<TableSkeleton rows={5} cols={5} />}>
                <UsersTableData />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="branches" className="space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <div>
                <CardTitle>Branch Management</CardTitle>
                <CardDescription>
                  Create and manage physical shop locations for your organization.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="px-0">
              <Suspense fallback={<TableSkeleton rows={4} cols={4} />}>
                <BranchesTableData />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="roles" className="space-y-6">
          <Card className="border-none shadow-none bg-transparent">
            <CardHeader className="px-0 pt-0">
              <CardTitle>Role Hierarchy</CardTitle>
              <CardDescription>
                Overview of available system roles and their assigned permissions.
              </CardDescription>
            </CardHeader>
            <CardContent className="px-0">
              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-indigo-600">SUPER ADMIN</CardTitle>
                    <CardDescription>Full Access</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Complete control over all branches, settings, user management, financial reports, and inventory.
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-sky-600">CASHIER</CardTitle>
                    <CardDescription>Sales &amp; Customers</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Primary access to the POS, sales creation, customer management, and repayment processing.
                  </CardContent>
                </Card>
                <Card className="bg-muted/30 border-dashed">
                  <CardHeader>
                    <CardTitle className="text-lg font-bold text-emerald-600">INVENTORY</CardTitle>
                    <CardDescription>Stock Management</CardDescription>
                  </CardHeader>
                  <CardContent className="text-sm text-muted-foreground">
                    Manage products, categories, stock adjustments, and reorder alerts.
                  </CardContent>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

import { prisma } from "@/lib/prisma";

// ─── Async Data Components ────────────────────────────────────────────────────
async function AdminHeaderData() {
  const session = await getSession();
  const [branchesRes, currentUser] = await Promise.all([
    getAllBranches(),
    session?.user?.id
      ? prisma.user.findUnique({
          where: { id: session.user.id },
          include: {
            shopMemberships: {
              include: {
                shop: { select: { name: true } },
                role: { select: { name: true } }
              }
            }
          }
        })
      : null
  ]);
  const branches = branchesRes.success ? branchesRes.data : [];
  return <AdminPageHeader branches={branches} currentUser={currentUser} />;
}

async function UsersTableData() {
  const [usersRes, branchesRes] = await Promise.all([
    getUsers(),
    getAllBranches(),
  ]);
  const users = usersRes.success ? usersRes.data : [];
  const branches = branchesRes.success ? branchesRes.data : [];
  return <UserTable users={users} branches={branches} />;
}

async function BranchesTableData() {
  const branchesRes = await getAllBranches();
  const branches = branchesRes.success ? branchesRes.data : [];
  return <BranchTable branches={branches} />;
}
