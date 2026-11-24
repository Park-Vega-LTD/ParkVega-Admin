"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, LogIn } from "lucide-react";

import { clientFetch } from "@/lib/api.client";
import { safeNextPath } from "@/lib/auth-redirect";
import type { User } from "@/types/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

/**
 * Messages the BFF login Route Handler returns on a 401 / 403. `clientFetch`
 * throws a plain Error carrying the message (not the status), so known
 * messages are shown as-is and anything else becomes a generic error.
 */
const KNOWN_ERRORS = new Set([
  "Incorrect email or password.",
  "This account does not have staff access.",
  "Too many sign-in attempts. Please wait a minute and try again.",
]);
const GENERIC_ERROR_MESSAGE = "Something went wrong. Please try again.";

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

type LoginFormValues = z.infer<typeof loginSchema>;

function LoginFormInner() {
  const searchParams = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    // After accepting an invitation, the email comes prefilled.
    defaultValues: { email: searchParams.get("email") ?? "", password: "" },
  });
  const welcome = searchParams.get("welcome") === "1";

  const {
    formState: { isSubmitting },
  } = form;

  async function onSubmit(values: LoginFormValues) {
    setFormError(null);

    try {
      await clientFetch<{ user: User }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(values),
      });

      // Full navigation so the proxy and server layouts see the new cookies.
      window.location.assign(safeNextPath(searchParams.get("next")));
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      form.resetField("password");
      setFormError(KNOWN_ERRORS.has(message) ? message : GENERIC_ERROR_MESSAGE);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-primary-ink">
          Park Vega Account
        </p>
        <h2 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Welcome back
        </h2>
        <p className="text-sm text-muted-foreground">
          {welcome
            ? "Your password is saved. Sign in to get started."
            : "Sign in to manage operations and content."}
        </p>
      </div>

      {/* Welcome banner */}
      {welcome && (
        <div className="rounded-xl bg-secondary/15 px-4 py-3 text-sm font-medium text-foreground ring-1 ring-secondary/30">
          🎉 Account activated — you&apos;re all set!
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
          {/* Email */}
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    autoComplete="email"
                    placeholder="you@parkvega.com"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Password with show/hide toggle */}
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="••••••••"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword
                        ? <EyeOff className="size-4" />
                        : <Eye className="size-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {/* Error banner */}
          {formError ? (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl bg-destructive/8 px-4 py-3 text-sm text-destructive ring-1 ring-destructive/20"
            >
              <span className="mt-px shrink-0">⚠</span>
              <span>{formError}</span>
            </div>
          ) : null}

          {/* Submit */}
          <Button
            type="submit"
            className="h-11 w-full gap-2 rounded-xl font-semibold"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                Signing in…
              </>
            ) : (
              <>
                <LogIn className="size-4" />
                Sign in
              </>
            )}
          </Button>
        </form>
      </Form>
    </div>
  );
}

/** `useSearchParams()` must be wrapped in a Suspense boundary. */
export function LoginForm() {
  return (
    <Suspense fallback={null}>
      <LoginFormInner />
    </Suspense>
  );
}
