"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ArrowDownCircle, Loader2 } from "lucide-react";
import { recordRepayment } from "@/features/credit/actions";
import { toast } from "sonner";
import { formatPrice } from "@/lib/utils";

export function RepaymentDialog({ 
  customerId, 
  customerName, 
  currentBalance,
  currency = "USD",
}: { 
  customerId: string; 
  customerName: string; 
  currentBalance: number;
  currency?: string;
}) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await recordRepayment(formData);

    setLoading(false);
    if (res.success) {
      toast.success("Repayment recorded successfully");
      setOpen(false);
    } else {
      toast.error(res.error || "Failed to record repayment");
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger render={<Button variant="outline" size="sm" className="gap-1.5" disabled={currentBalance <= 0} />}>
          <ArrowDownCircle className="h-4 w-4" />
          Record Repayment
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <form onSubmit={handleSubmit}>
          <input type="hidden" name="customerId" value={customerId} />
          <DialogHeader>
            <DialogTitle>Record Repayment</DialogTitle>
            <DialogDescription>
              Record a payment from <strong>{customerName}</strong> to reduce their outstanding balance of <strong>{formatPrice(currentBalance, currency)}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="amount">Repayment Amount</Label>
              <Input
                id="amount"
                name="amount"
                type="number"
                step="0.01"
                placeholder="0.00"
                required
                max={currentBalance}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="method">Payment Method</Label>
              <Select name="method" defaultValue="CASH">
                <SelectTrigger id="method">
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">Cash</SelectItem>
                  <SelectItem value="TRANSFER">Bank Transfer</SelectItem>
                  <SelectItem value="POS">POS / Card</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="note">Notes (Optional)</Label>
              <Textarea
                id="note"
                name="note"
                placeholder="Reference number, check number, etc."
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Record Payment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
