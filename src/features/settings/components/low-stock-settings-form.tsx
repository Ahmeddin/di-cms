"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Save } from "lucide-react";
import { updateLowStockThreshold } from "@/features/settings/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface LowStockSettingsFormProps {
  currentThreshold: number;
  activeShopId: string;
}

export function LowStockSettingsForm({ currentThreshold, activeShopId }: LowStockSettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState<number>(currentThreshold);
  const router = useRouter();

  const isGlobal = activeShopId === "ALL";

  useEffect(() => {
    setThreshold(currentThreshold);
  }, [currentThreshold]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isGlobal) return;
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await updateLowStockThreshold(formData);

    setLoading(false);
    if (res.success) {
      toast.success("Low stock alert threshold updated successfully");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update threshold");
    }
  }

  if (isGlobal) {
    return (
      <div className="rounded-lg border-2 border-dashed p-6 text-center">
        <p className="text-sm text-muted-foreground font-medium">
          Low stock thresholds are configured per branch. Please select a specific branch using the switcher at the top of the sidebar.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="grid gap-2">
        <Label htmlFor="threshold">Low Stock Threshold Limit</Label>
        <Input
          id="threshold"
          name="threshold"
          type="number"
          min={1}
          value={threshold}
          onChange={(e) => setThreshold(Number(e.target.value) || 0)}
          placeholder="e.g. 10"
          required
        />
        <p className="text-[10px] text-muted-foreground italic">
          Products with stock quantities equal to or below this quantity will trigger a &quot;Low Stock&quot; indicator on the dashboard.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Alert Settings
      </Button>
    </form>
  );
}
