"use client";

import { useState, useMemo, useTransition } from "react";
import { toast } from "sonner";
import { ShoppingCart, Plus, Minus, Trash2, Search, CreditCard, Banknote, User as UserIcon } from "lucide-react";
import { useRouter } from "next/navigation";

import type { Product, Customer, CreditAccount } from "@/generated/prisma/client";
import { createSale } from "@/features/sales/actions";
import type { CreateSaleInput } from "@/features/sales/schemas";
import { formatPrice } from "@/lib/utils";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

type CustomerWithCredit = Customer & { creditAccount: CreditAccount | null };

type CartItem = {
  product: Product;
  quantity: number;
  unitPrice: number;
};

export function PosInterface({
  products,
  customers,
  currency = "USD",
}: {
  products: Product[];
  customers: CustomerWithCredit[];
  currency?: string;
}) {
  const router = useRouter();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Checkout State
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "CREDIT" | "MIXED">("CASH");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [amountPaidInput, setAmountPaidInput] = useState<string>("");
  const [pending, startTransition] = useTransition();

  // Filter products based on search
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const lowerQuery = searchQuery.toLowerCase();
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(lowerQuery) ||
        p.sku.toLowerCase().includes(lowerQuery) ||
        (p.barcode && p.barcode.toLowerCase().includes(lowerQuery))
    );
  }, [products, searchQuery]);

  // Cart Calculations
  const subtotal = cart.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const discountTotal = 0; // Future enhancement
  const taxTotal = 0; // Future enhancement
  const total = subtotal - discountTotal + taxTotal;

  // Selected Customer Logic
  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId) || null,
    [customers, selectedCustomerId]
  );
  const availableCredit = selectedCustomer
    ? Math.max(0, Number(selectedCustomer.creditLimit || 0) - Number(selectedCustomer.creditAccount?.outstandingBalance || 0))
    : 0;

  // Payment Logic
  let amountPaid = 0;
  let creditIssued = 0;

  if (paymentMethod === "CASH") {
    amountPaid = total;
    creditIssued = 0;
  } else if (paymentMethod === "CREDIT") {
    amountPaid = 0;
    creditIssued = total;
  } else if (paymentMethod === "MIXED") {
    amountPaid = Number(amountPaidInput) || 0;
    creditIssued = Math.max(0, total - amountPaid);
  }

  // Cart Actions
  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1, unitPrice: Number(product.sellingPrice) }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev.map((i) => {
        if (i.product.id === productId) {
          const newQty = Math.max(1, i.quantity + delta);
          return { ...i, quantity: newQty };
        }
        return i;
      })
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  // Checkout Action
  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }

    if ((paymentMethod === "CREDIT" || paymentMethod === "MIXED") && !selectedCustomerId) {
      toast.error("Please select a customer for credit sales");
      return;
    }

    if (creditIssued > availableCredit) {
      toast.error(`Credit limit exceeded. Customer only has ${formatPrice(availableCredit, currency)} available.`);
      return;
    }

    const payload: CreateSaleInput = {
      customerId: selectedCustomerId || null,
      paymentMethod,
      subtotal,
      discountTotal,
      taxTotal,
      total,
      amountPaid,
      creditIssued,
      allowInsufficientStock: false,
      items: cart.map(item => ({
        productId: item.product.id,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
      })),
    };

    startTransition(async () => {
      const res = await createSale(payload);
      if (res.success) {
        toast.success("Sale completed successfully");
        setCart([]);
        setPaymentMethod("CASH");
        setSelectedCustomerId("");
        setAmountPaidInput("");
        router.refresh(); // Refresh server state (e.g. products stock)
      } else {
        toast.error(res.error || "Failed to complete sale");
      }
    });
  };

  return (
    <div className="flex flex-col lg:grid lg:grid-cols-3 gap-6 lg:h-[calc(100vh-140px)] h-auto pb-10 lg:pb-0">
      {/* Products Selection (Left/Middle 2 Columns) */}
      <Card className="lg:col-span-2 flex flex-col lg:h-full h-[500px] border-none shadow-none bg-transparent">
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products by name, SKU, or barcode..."
              className="pl-9 bg-card"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <ScrollArea className="flex-1 -mx-4 px-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-4">
            {filteredProducts.map((product) => (
              <Card 
                key={product.id} 
                className="cursor-pointer hover:border-primary transition-colors flex flex-col"
                onClick={() => addToCart(product)}
              >
                <CardHeader className="p-4 pb-2">
                  <CardTitle className="text-sm line-clamp-2">{product.name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{product.sku}</p>
                </CardHeader>
                <CardContent className="p-4 pt-0 mt-auto flex justify-between items-end">
                  <div className="font-semibold">{formatPrice(Number(product.sellingPrice), currency)}</div>
                  {product.stockQty <= 0 ? (
                    <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>
                  ) : (
                    <span className="text-xs text-muted-foreground">{product.stockQty} in stock</span>
                  )}
                </CardContent>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="col-span-full py-12 text-center text-muted-foreground">
                No products found matching "{searchQuery}"
              </div>
            )}
          </div>
        </ScrollArea>
      </Card>

      {/* Cart & Checkout (Right 1 Column) */}
      <Card className="flex flex-col lg:h-full h-auto min-h-[400px] shadow-lg border-primary/10">
        <CardHeader className="py-4 border-b bg-muted/30">
          <CardTitle className="text-lg flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Current Order
          </CardTitle>
        </CardHeader>

        <ScrollArea className="flex-1 p-4">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-muted-foreground space-y-2 py-12">
              <ShoppingCart className="h-12 w-12 opacity-20" />
              <p>Cart is empty</p>
              <p className="text-xs text-center max-w-[200px]">Click on products to add them to the order.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {cart.map((item) => (
                <div key={item.product.id} className="flex gap-2 text-sm border-b pb-3">
                  <div className="flex-1">
                    <p className="font-medium line-clamp-1">{item.product.name}</p>
                    <p className="text-muted-foreground text-xs">{formatPrice(item.unitPrice, currency)} x {item.quantity}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <p className="font-medium">{formatPrice(item.unitPrice * item.quantity, currency)}</p>
                    <div className="flex items-center gap-1 border rounded-md">
                      <Button variant="ghost" size="icon-xs" onClick={() => updateQuantity(item.product.id, -1)} disabled={item.quantity <= 1}>
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-4 text-center text-xs">{item.quantity}</span>
                      <Button variant="ghost" size="icon-xs" onClick={() => updateQuantity(item.product.id, 1)}>
                        <Plus className="h-3 w-3" />
                      </Button>
                      <Button variant="ghost" size="icon-xs" className="text-destructive hover:text-destructive" onClick={() => removeFromCart(item.product.id)}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>

        <div className="p-4 bg-muted/10 border-t space-y-4">
          {/* Checkout Controls */}
          <div className="space-y-3">
            <div className="flex items-center justify-between font-medium">
              <span>Total</span>
              <span className="text-xl">{formatPrice(total, currency)}</span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <Button 
                variant={paymentMethod === "CASH" ? "default" : "outline"} 
                size="sm" 
                className="w-full text-xs"
                onClick={() => {
                  setPaymentMethod("CASH");
                  setSelectedCustomerId("");
                  setAmountPaidInput("");
                }}
              >
                <Banknote className="h-3 w-3 mr-1" /> Cash
              </Button>
              <Button 
                variant={paymentMethod === "CREDIT" ? "default" : "outline"} 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setPaymentMethod("CREDIT")}
              >
                <CreditCard className="h-3 w-3 mr-1" /> Credit
              </Button>
              <Button 
                variant={paymentMethod === "MIXED" ? "default" : "outline"} 
                size="sm" 
                className="w-full text-xs"
                onClick={() => setPaymentMethod("MIXED")}
              >
                Split
              </Button>
            </div>

            {(paymentMethod === "CREDIT" || paymentMethod === "MIXED" || selectedCustomerId) && (
              <div className="space-y-1.5 pt-2 border-t">
                <Label htmlFor="customer" className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserIcon className="h-3 w-3" /> Customer
                </Label>
                <Select value={selectedCustomerId} onValueChange={(v) => setSelectedCustomerId(v || "")}>
                  <SelectTrigger id="customer" className="h-8 text-sm">
                    <SelectValue placeholder="Select a customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.fullName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {selectedCustomer && (
                  <p className="text-[10px] text-muted-foreground text-right">
                    Available Credit: <span className={availableCredit < total ? "text-destructive font-medium" : "font-medium"}>{formatPrice(availableCredit, currency)}</span>
                  </p>
                )}
              </div>
            )}

            {paymentMethod === "MIXED" && (
              <div className="space-y-1.5">
                <Label htmlFor="amountPaid" className="text-xs text-muted-foreground">Cash Amount Paid</Label>
                <Input 
                  id="amountPaid"
                  type="number" 
                  className="h-8 text-sm" 
                  value={amountPaidInput} 
                  onChange={(e) => setAmountPaidInput(e.target.value)} 
                  placeholder="0.00"
                />
                <p className="text-[10px] text-right">
                  Credit to Issue: <span className="font-medium text-destructive">{formatPrice(creditIssued, currency)}</span>
                </p>
              </div>
            )}
          </div>

          <Button 
            className="w-full h-12 text-lg" 
            onClick={handleCheckout} 
            disabled={pending || cart.length === 0}
          >
            {pending ? "Processing..." : `Charge ${formatPrice(total, currency)}`}
          </Button>
        </div>
      </Card>
    </div>
  );
}
