"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowUpRight, ArrowDownRight, Package, Users, CreditCard, DollarSign, AlertTriangle, UserCircle2, Receipt } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { format } from "date-fns";
import Link from "next/link";
import { cn, getCurrencySymbol, formatPrice } from "@/lib/utils";

export function DashboardHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="space-y-1 mb-8">
      <h1 className="text-3xl font-extrabold tracking-tight text-foreground">{title}</h1>
      <p className="text-muted-foreground font-medium">{description}</p>
    </div>
  );
}

export function StatCard({ 
  title, 
  value, 
  icon: iconName, 
  description, 
  trend 
}: { 
  title: string; 
  value: string; 
  icon: "dollar" | "credit" | "package" | "alert"; 
  description?: string;
  trend?: { value: number; isUp: boolean };
}) {
  const Icon = {
    dollar: DollarSign,
    credit: CreditCard,
    package: Package,
    alert: AlertTriangle,
  }[iconName];

  return (
    <Card className="relative overflow-hidden group hover:-translate-y-1 hover:shadow-premium transition-all duration-300 border-border/50">
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <CardHeader className="flex flex-row items-center justify-between pb-2 relative z-10">
        <CardTitle className="text-sm font-semibold text-muted-foreground">{title}</CardTitle>
        <div className="bg-primary/10 p-2 rounded-full">
          <Icon className="h-4 w-4 text-primary" />
        </div>
      </CardHeader>
      <CardContent className="relative z-10">
        <div className="text-3xl font-black tracking-tighter">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-2">
            {trend && (
              <Badge 
                variant={trend.isUp ? "default" : "destructive"} 
                className={cn(
                  "px-1.5 py-0 border-none font-bold text-[10px]", 
                  trend.isUp ? "bg-emerald-500/15 text-emerald-600 hover:bg-emerald-500/15" : "bg-destructive/15 text-destructive hover:bg-destructive/15"
                )}
              >
                {trend.isUp ? <ArrowUpRight className="h-3 w-3 mr-0.5" /> : <ArrowDownRight className="h-3 w-3 mr-0.5" />}
                {trend.value}%
              </Badge>
            )}
            {description && <p className="text-xs text-muted-foreground font-medium">{description}</p>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function SalesChart({ data, currency = "USD" }: { data: any[], currency?: string }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <Card className="lg:col-span-4 md:col-span-2 col-span-1 shadow-sm border-border/50">
        <CardHeader>
          <CardTitle>Sales Revenue</CardTitle>
          <CardDescription>Performance overview for the last 30 days.</CardDescription>
        </CardHeader>
        <CardContent className="mt-4 w-full">
          <div style={{ height: 350 }} className="bg-muted/10 animate-pulse rounded-lg" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="lg:col-span-4 md:col-span-2 col-span-1 shadow-sm border-border/50 hover:shadow-premium transition-shadow duration-300">
      <CardHeader>
        <CardTitle>Sales Revenue</CardTitle>
        <CardDescription>Performance overview for the last 30 days.</CardDescription>
      </CardHeader>
      <CardContent className="mt-4 w-full">
        {/* Explicit pixel height wrapper with relative positioning — prevents ResizeObserver returning -1 */}
        <div className="h-[350px] w-full relative">
          <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={350} debounce={100} initialDimension={{ width: 100, height: 350 }}>
            <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
              <XAxis 
                dataKey="date" 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
                dy={10}
              />
              <YAxis 
                fontSize={12} 
                tickLine={false} 
                axisLine={false} 
                tickFormatter={(value) => `${getCurrencySymbol(currency)}${value}`}
                tick={{ fill: 'hsl(var(--muted-foreground))' }}
              />
              <Tooltip 
                cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="bg-popover border rounded-lg p-3 shadow-premium text-sm">
                        <p className="font-semibold text-muted-foreground mb-1">{payload[0].payload.date}</p>
                        <p className="text-foreground font-bold text-lg">{formatPrice(payload[0].value as number, currency)}</p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Bar 
                dataKey="total" 
                fill="hsl(var(--primary))" 
                radius={[4, 4, 0, 0]} 
                maxBarSize={50}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}

export function InventoryStatus({ alerts }: { alerts: any }) {
  return (
    <Card className="lg:col-span-3 md:col-span-2 col-span-1 shadow-sm border-border/50 flex flex-col hover:shadow-premium transition-shadow duration-300">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="bg-primary/10 p-1.5 rounded-md">
            <Package className="h-5 w-5 text-primary" />
          </div>
          Stock Alerts
        </CardTitle>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-6">
          {alerts.outOfStock.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-bold text-destructive uppercase tracking-widest flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-destructive animate-pulse" />
                Critical: Out of Stock
              </p>
              <div className="space-y-2">
                {alerts.outOfStock.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-destructive/5 border border-destructive/10">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    <Badge variant="destructive" className="text-[10px] px-1.5 py-0 h-5">0</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          <div className="space-y-3">
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Low Stock
            </p>
            {alerts.lowStock.length > 0 ? (
              <div className="space-y-2">
                {alerts.lowStock.map((p: any) => (
                  <div key={p.id} className="flex justify-between items-center text-sm p-2 rounded-md bg-amber-500/5 border border-amber-500/10">
                    <span className="line-clamp-1 font-medium">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-amber-600">{p.stockQty} left</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center py-6 text-sm text-muted-foreground bg-muted/30 rounded-lg border border-dashed">
                All inventory levels are healthy.
              </div>
            )}
          </div>
        </div>
      </CardContent>
      { (alerts.outOfStock.length > 0 || alerts.lowStock.length > 0) && (
        <CardFooter className="pt-4 border-t bg-muted/10 mt-auto">
          <Link href="/inventory" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center w-full justify-center">
            Manage Inventory <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </CardFooter>
      )}
    </Card>
  );
}

function CardFooter({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn("px-6 py-4", className)}>{children}</div>;
}

export function RecentSalesList({ sales, currency = "USD" }: { sales: any[], currency?: string }) {
  return (
    <Card className="lg:col-span-4 md:col-span-2 col-span-1 shadow-sm border-border/50 hover:shadow-premium transition-shadow duration-300 flex flex-col">
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
        <CardDescription>Latest sales across the organization.</CardDescription>
      </CardHeader>
      <CardContent className="flex-1">
        <div className="space-y-1">
          {sales.map((sale, i) => (
            <div key={sale.id} className={cn("flex items-center gap-4 py-3", i !== sales.length - 1 && "border-b border-border/40")}>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <UserCircle2 className="h-6 w-6" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-sm font-semibold leading-none">{sale.customer}</p>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="outline" className="text-[9px] px-1 py-0 h-4 font-medium tracking-wide">
                    {sale.method}
                  </Badge>
                  <span>{format(new Date(sale.createdAt), "MMM dd, hh:mm a")}</span>
                </div>
              </div>
              <div className="text-base font-bold text-foreground">
                +{formatPrice(sale.total, currency)}
              </div>
            </div>
          ))}
          {sales.length === 0 && (
            <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
              <Receipt className="h-8 w-8 opacity-20" />
              No recent transactions found.
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="pt-4 border-t bg-muted/10 mt-auto">
          <Link href="/sales" className="text-sm font-medium text-primary hover:text-primary/80 transition-colors flex items-center w-full justify-center">
            View All Sales <ArrowUpRight className="ml-1 h-4 w-4" />
          </Link>
        </CardFooter>
    </Card>
  );
}
