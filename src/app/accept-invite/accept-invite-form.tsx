"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

import { Logo } from "@/components/parkvega/logo";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { clientFetch } from "@/lib/api.client";

/** Same rule the API applies (8–72 characters, upper, lower and a digit). */
const schema = z
  .object({
    password: z
      .string()
      .min(8, "Use at least 8 characters.")
      .max(72, "Use at most 72 characters.")
      .regex(/[a-z]/, "Include a lowercase letter.")
      .regex(/[A-Z]/, "Include an uppercase letter.")
      .regex(/\d/, "Include a number."),
    confirm: z.string(),
  })
  .refine((values) => values.password === values.confirm, {
    message: "The passwords don't match.",
    path: ["confirm"],
  });

type Values = z.infer<typeof schema>;

function AcceptInviteFormInner() {
  const token = useSearchParams().get("token") ?? "";
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<Values>({ resolver: zodResolver(schema), defaultValues: { password: "", confirm: "" } });

  async function onSubmit(values: Values) {
    setFormError(null);
    try {
      const { email } = await clientFetch<{ email: string }>("/api/auth/accept-invite", {
        method: "POST",
        body: JSON.stringify({ token, password: values.password }),
      });
      window.location.assign(`/login?email=${encodeURIComponent(email)}&welcome=1`);
    } catch (error) {
      form.resetField("password");
      form.resetField("confirm");
      setFormError(error instanceof Error ? error.message : "Something went wrong. Please try again.");
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo size="sm" />
        <h1 className="font-display text-2xl font-semibold tracking-tight">Set up your account</h1>
        <p className="text-sm text-muted-foreground">Choose a password for the Park Vega staff console.</p>
      </div>

      {!token ? (
        <p role="alert" className="text-center text-sm font-medium text-destructive">
          This link is incomplete. Open the full link from your invitation, or ask an admin for a new one.
        </p>
      ) : (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" noValidate>
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>New password</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirm"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type it again</FormLabel>
                  <FormControl>
                    <Input type="password" autoComplete="new-password" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <p className="text-xs text-muted-foreground">
              At least 8 characters, with an uppercase letter, a lowercase letter and a number.
            </p>
            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving…" : "Save password"}
            </Button>
            {formError ? (
              <p role="alert" className="text-center text-sm font-medium text-destructive">
                {formError}
              </p>
            ) : null}
          </form>
        </Form>
      )}
    </div>
  );
}

/** `useSearchParams()` must be wrapped in a Suspense boundary. */
export function AcceptInviteForm() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteFormInner />
    </Suspense>
  );
}
