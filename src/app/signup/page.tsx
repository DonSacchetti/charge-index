import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

import { SignupForm } from "./signup-form";

export default async function SignupPage({ searchParams }: PageProps<"/signup">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/setup");

  const params = await searchParams;
  const checkEmail = typeof params.check === "string" ? params.check : null;

  if (checkEmail) {
    return (
      <AppShell subtitle="Almost there" progress={{ total: 7, current: 0 }}>
        <div className="px-5 pt-6 pb-9">
          <h1 className="font-serif text-[31px] leading-[1.14] font-semibold tracking-[-0.01em] text-navy">
            Check your
            <br />
            inbox
          </h1>
          <div className="my-[15px] h-0.5 w-[38px] bg-gold" />
          <p className="text-[13.5px] leading-[1.72] text-body">
            We sent a confirmation link to{" "}
            <strong className="text-navy">{checkEmail}</strong>. Open it and
            you&rsquo;ll land straight on your session setup.
          </p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell subtitle="Getting set up" badge="5–7 days" progress={{ total: 7, current: 0 }}>
      <div className="px-5 pt-6 pb-9">
        <h1 className="font-serif text-[31px] leading-[1.14] font-semibold tracking-[-0.01em] text-navy">
          How charged
          <br />
          are you?
        </h1>
        <div className="my-[15px] h-0.5 w-[38px] bg-gold" />
        <p className="mb-6 text-[13.5px] leading-[1.72] text-body">
          Log your energy through your waking hours for five to seven days. Five
          choices every time, from{" "}
          <strong className="text-navy">100% Fully Charged</strong> down to{" "}
          <strong className="text-navy">10% Recharge Needed</strong>. No right or
          wrong answers — it&rsquo;s data, not a grade.
        </p>
        <SignupForm />
      </div>
    </AppShell>
  );
}
