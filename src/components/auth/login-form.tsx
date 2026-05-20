"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { loginAction } from "@/features/auth/actions";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: FormValues) {
    console.log(">>> [FORM] onSubmit triggered for:", values.email);
    setError(null);
    setPending(true);
    try {
      console.log(">>> [FORM] Calling loginAction...");
      const res = await loginAction({
        email: values.email.trim(),
        password: values.password,
      });

      console.log(">>> [FORM] loginAction response:", JSON.stringify(res));

      if (!res.success) {
        setError(res.error || "Invalid email or password.");
        return;
      }

      // Success!
      console.log(">>> [FORM] Login successful, redirecting to:", next);
      window.location.assign(next);
    } catch (err: any) {
      console.error(">>> [FORM] Client Error:", err);
      if (err.digest?.includes("NEXT_REDIRECT")) {
        console.log(">>> [FORM] Handling Next.js redirect...");
        window.location.assign(next);
        return;
      }
      setError("Something went wrong. Please try again.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sign in</CardTitle>
        <CardDescription>Access your shop dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              disabled={pending}
              {...form.register("email")}
            />
            {form.formState.errors.email?.message ? (
              <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
            ) : null}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              disabled={pending}
              {...form.register("password")}
            />
            {form.formState.errors.password?.message ? (
              <p className="text-sm text-destructive">{form.formState.errors.password.message}</p>
            ) : null}
          </div>

          {error ? <p className={cn("text-sm text-destructive")}>{error}</p> : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Signing in..." : "Sign in"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

