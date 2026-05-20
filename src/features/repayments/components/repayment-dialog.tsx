"use client";

import { useState, useTransition } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Banknote } from "lucide-react";

import { createRepayment } from "@/features/repayments/actions";
import { repaymentSchema, type RepaymentFormValues } from "@/features/repayments/schemas";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatPrice } from "@/lib/utils";

export function RepaymentDialog({
  customerId,
  customerName,
  maxAmount,
  currency = "USD",
}: {
  customerId: string;
  customerName: string;
  maxAmount: number;
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const form = useForm<RepaymentFormValues>({
    resolver: zodResolver(repaymentSchema) as any,
    defaultValues: {
      customerId,
      amount: 0,
      method: "CASH",
      note: "",
    },
  });

  async function onSubmit(values: RepaymentFormValues) {
    startTransition(async () => {
      const res = await createRepayment(values);
      if (res.success) {
        toast.success(`Payment of ${formatPrice(values.amount, currency)} recorded for ${customerName}`);
        setOpen(false);
        form.reset();
      } else {
        toast.error(res.error || "Failed to record payment");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" disabled={maxAmount <= 0} />}>
          <Banknote className="mr-2 h-4 w-4" />
          Record Payment
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Record Payment</DialogTitle>
          <DialogDescription>
            Record a payment for {customerName}. Outstanding balance: {formatPrice(maxAmount, currency)}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit as any)} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount Paid</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              max={maxAmount}
              disabled={pending}
              {...form.register("amount")}
            />
            {form.formState.errors.amount && (
              <p className="text-xs text-destructive">{form.formState.errors.amount.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="method">Payment Method</Label>
            <Select
              defaultValue="CASH"
              onValueChange={(v) => form.setValue("method", v as any)}
              disabled={pending}
            >
              <SelectTrigger id="method">
                <SelectValue placeholder="Select method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="CASH">Cash</SelectItem>
                <SelectItem value="MIXED">Bank Transfer / Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="note">Notes (Optional)</Label>
            <Textarea
              id="note"
              placeholder="e.g. Bank reference or receipt number"
              disabled={pending}
              className="resize-none h-20"
              {...form.register("note")}
            />
          </div>

          <DialogFooter className="pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || maxAmount <= 0}>
              {pending ? "Recording..." : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
