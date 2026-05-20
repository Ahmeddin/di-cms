"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { useSession } from "next-auth/react";
import {
  Save,
  User,
  Mail,
  Lock,
  CheckCircle2,
  Eye,
  EyeOff,
  ShieldCheck,
  Loader2,
} from "lucide-react";

import { upsertUser } from "@/features/users/actions";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// ─── Schema (tailored for self-update) ───────────────────────────────────────
const selfUpdateSchema = z
  .object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Please enter a valid email"),
    currentPassword: z.string().optional().or(z.literal("")),
    newPassword: z.string().optional().or(z.literal("")),
    confirmPassword: z.string().optional().or(z.literal("")),
  })
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword.length >= 8;
      }
      return true;
    },
    { message: "New password must be at least 8 characters", path: ["newPassword"] }
  )
  .refine(
    (data) => {
      if (data.newPassword && data.newPassword.length > 0) {
        return data.newPassword === data.confirmPassword;
      }
      return true;
    },
    { message: "Passwords do not match", path: ["confirmPassword"] }
  );

type SelfUpdateInput = z.infer<typeof selfUpdateSchema>;

interface SuperAdminProfileFormProps {
  currentUser: {
    id: string;
    name: string | null;
    email: string | null;
    globalRole: string;
    createdAt: Date | string;
    shopMemberships?: {
      shop: { name: string };
      role: { name: string };
    }[];
  };
}

export function SuperAdminProfileForm({ currentUser }: SuperAdminProfileFormProps) {
  const [isPending, startTransition] = React.useTransition();
  const [showNewPassword, setShowNewPassword] = React.useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = React.useState(false);
  const [saved, setSaved] = React.useState(false);
  const { update } = useSession();

  const form = useForm<SelfUpdateInput>({
    resolver: zodResolver(selfUpdateSchema),
    defaultValues: {
      name: currentUser.name || "",
      email: currentUser.email || "",
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const initials = currentUser.name
    ? currentUser.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "SA";

  const joinedDate = new Date(currentUser.createdAt).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const onSubmit = async (data: SelfUpdateInput) => {
    startTransition(async () => {
      try {
        const result = await upsertUser({
          id: currentUser.id,
          name: data.name,
          email: data.email,
          password: data.newPassword || "",
          isActive: true,
        });

        if (result.success) {
          toast.success("Profile updated successfully!");
          setSaved(true);
          setTimeout(() => setSaved(false), 3000);

          // Reset password fields
          form.setValue("currentPassword", "");
          form.setValue("newPassword", "");
          form.setValue("confirmPassword", "");

          // Trigger next-auth session update
          await update({
            name: data.name,
            email: data.email,
          });
        } else {
          toast.error(
            ("error" in result ? (result.error as string) : null) ||
              "Failed to update profile"
          );
        }
      } catch {
        toast.error("An unexpected error occurred");
      }
    });
  };

  return (
    <div className="grid gap-6 md:grid-cols-[280px_1fr]">
      {/* ─── Profile Card ─────────────────────────────────────────────── */}
      <Card className="h-fit">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center text-center space-y-4">
            <div className="relative">
              <Avatar className="h-20 w-20 ring-4 ring-violet-500/20">
                <AvatarFallback className="bg-gradient-to-br from-violet-500 to-indigo-600 text-white text-xl font-bold">
                  {initials}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 rounded-full bg-background p-0.5">
                <div className="rounded-full bg-emerald-500 h-4 w-4 flex items-center justify-center">
                  <CheckCircle2 className="h-3 w-3 text-white" />
                </div>
              </div>
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-semibold">{currentUser.name || "Super Admin"}</h3>
              <p className="text-xs text-muted-foreground">{currentUser.email}</p>
              <Badge
                variant="outline"
                className="bg-violet-500/10 text-violet-600 border-violet-500/20 font-semibold text-[10px] uppercase tracking-wider"
              >
                <ShieldCheck className="h-3 w-3 mr-1" />
                Super Admin
              </Badge>
            </div>
            <div className="w-full pt-3 border-t space-y-2">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Member since</span>
                <span className="font-medium">{joinedDate}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Status</span>
                <span className="font-medium text-emerald-500">Active</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">Access Level</span>
                <span className="font-medium text-violet-500">Full Access</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Edit Form ────────────────────────────────────────────────── */}
      <div className="space-y-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Personal Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Personal Information
              </CardTitle>
              <CardDescription>
                Update your display name and email address.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sa-name">Full Name</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sa-name"
                      {...form.register("name")}
                      placeholder="Your full name"
                      className="pl-9"
                      disabled={isPending}
                    />
                  </div>
                  {form.formState.errors.name && (
                    <span className="text-[11px] text-destructive">
                      {form.formState.errors.name.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sa-email">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sa-email"
                      type="email"
                      {...form.register("email")}
                      placeholder="you@example.com"
                      className="pl-9"
                      disabled={isPending}
                    />
                  </div>
                  {form.formState.errors.email && (
                    <span className="text-[11px] text-destructive">
                      {form.formState.errors.email.message}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Password Change */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lock className="h-5 w-5 text-primary" />
                Change Password
              </CardTitle>
              <CardDescription>
                Leave blank to keep your current password.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="sa-new-password">New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sa-new-password"
                      type={showNewPassword ? "text" : "password"}
                      {...form.register("newPassword")}
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.newPassword && (
                    <span className="text-[11px] text-destructive">
                      {form.formState.errors.newPassword.message}
                    </span>
                  )}
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="sa-confirm-password">Confirm New Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="sa-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      {...form.register("confirmPassword")}
                      placeholder="••••••••"
                      className="pl-9 pr-10"
                      disabled={isPending}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {form.formState.errors.confirmPassword && (
                    <span className="text-[11px] text-destructive">
                      {form.formState.errors.confirmPassword.message}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex items-center justify-end gap-3">
            {saved && (
              <span className="flex items-center gap-1.5 text-sm text-emerald-500 animate-in fade-in slide-in-from-right-2 duration-300">
                <CheckCircle2 className="h-4 w-4" />
                Changes saved!
              </span>
            )}
            <Button
              type="submit"
              disabled={isPending}
              className="min-w-[140px] gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
