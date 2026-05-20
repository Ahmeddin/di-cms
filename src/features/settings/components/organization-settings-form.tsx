"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Loader2, Save } from "lucide-react";
import { updateOrganizationSettings } from "@/features/settings/actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function OrganizationSettingsForm({ organization }: { organization: any }) {
  const [loading, setLoading] = useState(false);
  const [currency, setCurrency] = useState(organization?.currency || "USD");
  const router = useRouter();

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);

    const formData = new FormData(event.currentTarget);
    const res = await updateOrganizationSettings(formData);

    setLoading(false);
    if (res.success) {
      toast.success("Organization settings updated successfully");
      router.refresh();
    } else {
      toast.error(res.error || "Failed to update settings");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-xl">
      <div className="grid gap-2">
        <Label htmlFor="name">Organization Name</Label>
        <Input
          id="name"
          name="name"
          defaultValue={organization?.name}
          placeholder="e.g. My Awesome Business"
          required
        />
        <p className="text-[10px] text-muted-foreground italic">
          This is the global name for your entire business.
        </p>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="currency">Global Currency</Label>
        <Select value={currency} onValueChange={setCurrency}>
          <SelectTrigger id="currency">
            <SelectValue placeholder="Select currency" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ETB">Ethiopian Birr (Br)</SelectItem>
            <SelectItem value="USD">US Dollar ($)</SelectItem>
            <SelectItem value="EUR">Euro (€)</SelectItem>
            <SelectItem value="GBP">British Pound (£)</SelectItem>
          </SelectContent>
        </Select>
        <input type="hidden" name="currency" value={currency} />
        <p className="text-[10px] text-muted-foreground italic">
          This currency will be applied across all branches and reports.
        </p>
      </div>

      <Button type="submit" disabled={loading} className="gap-2">
        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Global Settings
      </Button>
    </form>
  );
}
