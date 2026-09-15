import { redirect } from "next/navigation";

import { AuthShell } from "@/components/brand/AuthShell";
import { createClient } from "@/lib/supabase/server";

import { SignupForm } from "./signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/");

  const params = await searchParams;
  const checkEmail = typeof params.check === "string" ? params.check : null;

  const hero = {
    eyebrow: "The Charge Index™ · free assessment",
    title: (
      <>
        How charged
        <br />
        are you?
      </>
    ),
    lead: (
      <>
        Log your energy through your waking hours for five to seven days. Five choices every time, from{" "}
        <strong className="text-white">100% Fully Charged</strong> down to <strong className="text-white">10% Recharge Needed</strong>. No
        right or wrong answers — it&rsquo;s data, not a grade.
      </>
    ),
  };

  if (checkEmail) {
    return (
      <AuthShell {...hero}>
        <div className="flex flex-col items-start">
          <div className="animate-pop mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-level-75/12 text-level-75">
            <svg viewBox="0 0 24 24" className="h-7 w-7" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="m4 7 8 6 8-6" />
            </svg>
          </div>
          <h2 className="font-serif text-[30px] leading-tight font-semibold text-navy">Check your inbox</h2>
          <p className="mt-3 text-[14.5px] leading-[1.7] text-body">
            We sent a confirmation link to <strong className="text-navy wrap-anywhere">{checkEmail}</strong>. Open it{" "}
            <strong className="text-navy">in this same browser</strong> and you&rsquo;ll land straight on your session setup.
          </p>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell {...hero}>
      <h2 className="mb-6 font-serif text-[28px] font-semibold text-navy">Create your account</h2>
      <SignupForm />
    </AuthShell>
  );
}
