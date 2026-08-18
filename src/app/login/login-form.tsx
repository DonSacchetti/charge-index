"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signIn } from "@/app/auth/actions";
import {
  FieldLabel,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/AppShell";

function Submit() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending}>Sign in</SubmitButton>;
}

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, formAction] = useActionState(signIn, null);

  return (
    <form action={formAction} className="flex flex-col gap-[11px]">
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <FormError message={state?.error ?? notice} />

      <div>
        <FieldLabel>Email</FieldLabel>
        <input
          type="email"
          name="email"
          autoComplete="email"
          required
          placeholder="you@email.com"
          className={inputClass}
        />
      </div>
      <div>
        <FieldLabel>Password</FieldLabel>
        <input
          type="password"
          name="password"
          autoComplete="current-password"
          required
          className={inputClass}
        />
      </div>

      <div className="mt-3">
        <Submit />
      </div>

      <p className="mt-2 text-center text-[12.5px] text-body">
        First time here?{" "}
        <Link href="/signup" className="font-bold text-navy underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}
