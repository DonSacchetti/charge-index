import { redirect } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { createClient } from "@/lib/supabase/server";

import { LoginForm } from "./login-form";

const NOTICES: Record<string, string> = {
  confirm: "That confirmation link has expired. Sign in, or request a new one.",
};

export default async function LoginPage({
  searchParams,
}: PageProps<"/login">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user) redirect("/setup");

  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const notice =
    typeof params.error === "string" ? NOTICES[params.error] : undefined;

  return (
    <AppShell subtitle="Welcome back" progress={{ total: 7, filled: 1 }}>
      <div className="px-5 pt-6 pb-9">
        <h1 className="font-serif text-[31px] leading-[1.14] font-semibold tracking-[-0.01em] text-navy">
          Pick up where
          <br />
          you left off
        </h1>
        <div className="my-[15px] h-0.5 w-[38px] bg-gold" />
        <p className="mb-6 text-[13.5px] leading-[1.72] text-body">
          Your log lives in the cloud, so you can start on your phone and finish
          on your laptop.
        </p>
        <LoginForm next={next} notice={notice} />
      </div>
    </AppShell>
  );
}
