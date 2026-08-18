"use client";

import Link from "next/link";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { signUp } from "@/app/auth/actions";
import {
  FieldLabel,
  FormError,
  SubmitButton,
  inputClass,
} from "@/components/AppShell";

function Submit() {
  const { pending } = useFormStatus();
  return <SubmitButton pending={pending}>Create my account</SubmitButton>;
}

export function SignupForm() {
  const [state, formAction] = useActionState(signUp, null);

  return (
    <form action={formAction} className="flex flex-col gap-[11px]">
      <FormError message={state?.error} />

      <div>
        <FieldLabel>First name</FieldLabel>
        <input
          type="text"
          name="full_name"
          autoComplete="given-name"
          required
          placeholder="e.g. Sarah"
          className={inputClass}
        />
      </div>
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
          autoComplete="new-password"
          required
          minLength={8}
          className={inputClass}
        />
        <p className="mt-[5px] text-[11px] text-muted">At least 8 characters.</p>
      </div>

      <div className="mt-3">
        <Submit />
      </div>

      <p className="mt-2 text-center text-[12.5px] text-body">
        Already tracking?{" "}
        <Link href="/login" className="font-bold text-navy underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
