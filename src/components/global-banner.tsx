import { AlertCircle } from "lucide-react";

export function GlobalBanner() {
  return (
    <div className="bg-primary/10 border border-primary/20 rounded-lg p-4 mb-6 flex items-start gap-3">
      <AlertCircle className="h-5 w-5 text-primary mt-0.5 shrink-0" />
      <div>
        <h3 className="font-semibold text-primary">All Branches View (Read-only)</h3>
        <p className="text-sm text-primary/80 mt-1">
          You are currently viewing aggregated data across all branches in your organization. 
          To create, edit, or delete records, please select a specific branch from the dropdown menu in the top right.
        </p>
      </div>
    </div>
  );
}
