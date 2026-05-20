import { Suspense } from "react";
import { redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import { getSettings } from "@/features/settings/actions";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Settings, Store, Bell, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { OrganizationSettingsForm } from "@/features/settings/components/organization-settings-form";
import { LowStockSettingsForm } from "@/features/settings/components/low-stock-settings-form";
import { Skeleton } from "@/components/ui/skeleton";
import { getSession } from "@/lib/session";

export const metadata = {
  title: "Settings | DI-CMS",
  description: "Manage your business profile and application preferences.",
};

// ─── Page Shell — renders INSTANTLY ─────────────────────────────────────────
export default async function SettingsPage() {
  try {
    await requireRole(["SUPER_ADMIN"]);
  } catch (err) {
    redirect("/");
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-1">
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
          <Settings className="h-8 w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground">
          Manage configuration for your organization.
        </p>
      </div>

      <Tabs defaultValue="org" className="space-y-4">
        <TabsList className="bg-muted/50 p-1">
          <TabsTrigger value="org" className="gap-2">
            <Store className="h-4 w-4" />
            Organization
          </TabsTrigger>
          <TabsTrigger value="notifications" className="gap-2">
            <Bell className="h-4 w-4" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="gap-2">
            <Shield className="h-4 w-4" />
            Security
          </TabsTrigger>
        </TabsList>

        <TabsContent value="org" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Update your organization&apos;s global identity and currency settings.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-48 w-full max-w-xl rounded-lg" />}>
                <OrgSettingsData />
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock Alerts</CardTitle>
              <CardDescription>
                Configure when you want to be notified about low inventory levels.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<Skeleton className="h-48 w-full max-w-xl rounded-lg" />}>
                <NotificationsData />
              </Suspense>
            </CardContent>
            <CardFooter className="bg-muted/30 pt-4">
              <Suspense fallback={<Skeleton className="h-4 w-64" />}>
                <NotificationsFooter />
              </Suspense>
            </CardFooter>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Identity &amp; Security</CardTitle>
              <CardDescription>
                Manage account security and access policies.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                All users are required to have a password of at least 8 characters.
                Two-factor authentication (2FA) is coming soon.
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Org Form Data ───────────────────────────────────────────────────────────
async function OrgSettingsData() {
  const res = await getSettings();
  if (!res.success || !res.data) {
    return (
      <p className="text-sm text-muted-foreground">Could not load settings.</p>
    );
  }
  return <OrganizationSettingsForm organization={res.data.organization} />;
}

// ─── Notifications Data ──────────────────────────────────────────────────────
async function NotificationsData() {
  const [res, session] = await Promise.all([getSettings(), getSession()]);
  if (!res.success || !res.data || !session?.user?.activeShopId) {
    return (
      <p className="text-sm text-muted-foreground">Could not load settings.</p>
    );
  }

  const activeShopId = session.user.activeShopId;
  const settings = res.data.settings || [];
  const thresholdSetting = settings.find(s => s.key === "low_stock_threshold");
  
  let currentThreshold = 10;
  if (thresholdSetting && thresholdSetting.value) {
    if (typeof thresholdSetting.value === "object" && "threshold" in thresholdSetting.value) {
      currentThreshold = Number((thresholdSetting.value as any).threshold) || 10;
    } else if (typeof thresholdSetting.value === "number") {
      currentThreshold = thresholdSetting.value;
    }
  }

  return <LowStockSettingsForm currentThreshold={currentThreshold} activeShopId={activeShopId} />;
}

// ─── Notifications Footer ────────────────────────────────────────────────────
async function NotificationsFooter() {
  const res = await getSettings();
  const shopName = res.success ? res.data?.shop?.name : null;
  return (
    <p className="text-xs text-muted-foreground italic">
      Notification preferences are applied to the active branch
      {shopName ? ` (${shopName})` : ""}.
    </p>
  );
}
