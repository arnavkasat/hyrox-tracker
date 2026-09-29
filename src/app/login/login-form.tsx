"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { MailCheck } from "lucide-react";
import { requestMagicLink, type LoginState } from "./actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" className="h-12 w-full text-[17px]" disabled={pending}>
      {pending ? "Sending…" : "Send magic link"}
    </Button>
  );
}

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action] = useActionState<LoginState, FormData>(requestMagicLink, {
    status: initialError ? "error" : "idle",
    message: initialError,
  });

  if (state.status === "sent") {
    return (
      <div className="space-y-3 text-center">
        <MailCheck className="mx-auto size-10 text-primary" />
        <p className="text-[17px] font-medium">Check your email</p>
        <p className="text-[15px] text-muted-foreground">
          Open the link on this device to finish signing in.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <Input
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        autoFocus
        required
        placeholder="you@example.com"
        aria-label="Email address"
        className="h-12 text-[17px]"
      />
      <SubmitButton />
      {state.status === "error" && state.message ? (
        <p role="alert" className="text-center text-[15px] text-destructive">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
