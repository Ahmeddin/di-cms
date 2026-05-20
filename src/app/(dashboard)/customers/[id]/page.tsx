import { notFound, redirect } from "next/navigation";
import { requireRole } from "@/lib/rbac";
import Link from "next/link";
import { ArrowLeft, User, Phone, MapPin, CreditCard, Receipt, Clock } from "lucide-react";
import { format } from "date-fns";

import { prisma } from "@/lib/prisma";
import { getSession, getShopScope } from "@/lib/session";
import { convertFromBase } from "@/lib/currency";
import { formatPrice } from "@/lib/utils";

import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RepaymentDialog } from "@/features/repayments/components/repayment-dialog";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const { id } = await params;
  try {
    await requireRole(["SUPER_ADMIN", "CASHIER", "INVENTORY"]);
  } catch (err) {
    redirect("/");
  }
  const session = await getSession();
  const { whereShop } = getShopScope(session);

  if (!session?.user?.activeShopId) return null;

  const customer = await prisma.customer.findFirst({
    where: { id, ...whereShop },
    include: {
      creditAccount: true,
      sales: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          items: {
            include: { product: true }
          }
        }
      },
      repayments: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: {
          receivedBy: { select: { email: true, name: true } }
        }
      }
    },
  });

  if (!customer) {
    notFound();
  }

  const org = await prisma.organization.findUnique({
    where: { id: session.user.organizationId! },
    select: { currency: true },
  });
  const displayCurrency = org?.currency || "USD";

  const creditLimit = customer.creditLimit ? convertFromBase(customer.creditLimit.toString(), displayCurrency) : 0;
  const creditUsed = customer.creditAccount ? convertFromBase(customer.creditAccount.outstandingBalance.toString(), displayCurrency) : 0;
  const remainingBalance = Math.max(0, creditLimit - creditUsed);
  const utilization = creditLimit > 0 ? (creditUsed / creditLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/customers" className={buttonVariants({ variant: "ghost", size: "icon" })}>
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">{customer.fullName}</h1>
          <p className="text-sm text-muted-foreground flex items-center gap-2">
            Customer ID: {customer.id.slice(-8).toUpperCase()}
            {customer.isActive ? (
              <Badge variant="secondary" className="ml-2">Active</Badge>
            ) : (
              <Badge variant="outline" className="ml-2">Inactive</Badge>
            )}
          </p>
        </div>
        <div className="ml-auto">
          {session.user.activeRole !== "INVENTORY" && (
            <RepaymentDialog 
              customerId={customer.id} 
              customerName={customer.fullName} 
              maxAmount={creditUsed} 
              currency={displayCurrency}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Profile Card */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <User className="h-5 w-5 text-muted-foreground" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">{customer.phone || "No phone provided"}</span>
            </div>
            <div className="flex items-start gap-3">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <span className="text-sm">{customer.address || "No address provided"}</span>
            </div>
            {customer.notes && (
              <>
                <Separator />
                <div>
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Notes</span>
                  <p className="text-sm mt-1">{customer.notes}</p>
                </div>
              </>
            )}
            <div className="pt-2">
              <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Customer Since</span>
              <p className="text-sm mt-1">{format(customer.createdAt, "PPP")}</p>
            </div>
          </CardContent>
        </Card>

        {/* Credit Summary Cards */}
        <div className="md:col-span-2 grid gap-4 sm:grid-cols-2">
          <Card className={creditUsed > 0 ? "border-destructive/50" : ""}>
            <CardHeader className="pb-2">
              <CardDescription>Outstanding Balance</CardDescription>
              <CardTitle className={`text-3xl ${creditUsed > 0 ? "text-destructive" : ""}`}>
                {formatPrice(creditUsed, displayCurrency)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Total credit used out of {formatPrice(creditLimit, displayCurrency)} limit
              </div>
              <div className="mt-4 h-2 w-full bg-secondary rounded-full overflow-hidden">
                <div 
                  className={`h-full ${utilization > 80 ? "bg-destructive" : "bg-primary"}`} 
                  style={{ width: `${Math.min(utilization, 100)}%` }} 
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Remaining Credit</CardDescription>
              <CardTitle className="text-3xl text-emerald-600 dark:text-emerald-400">
                {formatPrice(remainingBalance, displayCurrency)}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-xs text-muted-foreground">
                Available credit for future purchases
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* History Tabs / Sections */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Sales Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Receipt className="h-5 w-5 text-muted-foreground" />
              Recent Sales
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.sales.length > 0 ? (
              <div className="space-y-4">
                {customer.sales.map((sale) => (
                  <div key={sale.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">Invoice #{sale.id.slice(-6).toUpperCase()}</p>
                      <p className="text-muted-foreground text-xs">{format(sale.createdAt, "MMM d, yyyy")}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{formatPrice(convertFromBase(sale.total.toString(), displayCurrency), displayCurrency)}</p>
                      <Badge variant={sale.status === "COMPLETED" ? "secondary" : "outline"} className="text-[10px]">
                        {sale.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Receipt className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No sales history found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Repayments Placeholder */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              Payment History
            </CardTitle>
          </CardHeader>
          <CardContent>
            {customer.repayments.length > 0 ? (
              <div className="space-y-4">
                {customer.repayments.map((payment) => (
                  <div key={payment.id} className="flex justify-between items-center text-sm border-b pb-2 last:border-0">
                    <div>
                      <p className="font-medium">{payment.method} Payment</p>
                      <p className="text-muted-foreground text-xs">{format(payment.createdAt, "MMM d, yyyy")}</p>
                    </div>
                    <div className="text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {formatPrice(convertFromBase(payment.amount.toString(), displayCurrency), displayCurrency)}
                      {payment.note && (
                        <p className="text-[10px] text-muted-foreground font-normal line-clamp-1">{payment.note}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center text-muted-foreground">
                <Clock className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No payment history found</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
