"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Logo } from "@/components/parkvega/logo";
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
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="sm" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Staff login
        </h1>
        <p className="text-sm text-muted-foreground">
          {welcome
            ? "Your password is saved. Sign in to get started."
            : "Sign in with your Park Vega staff account."}
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
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

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Signing in…" : "Sign in"}
          </Button>

          {formError ? (
            <p
              role="alert"
              className="text-center text-sm font-medium text-destructive"
            >
              {formError}
            </p>
          ) : null}
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
