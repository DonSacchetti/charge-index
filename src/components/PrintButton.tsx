"use client";

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex min-h-11 items-center rounded-2xl border-[1.5px] border-navy bg-white px-5 text-[13.5px] font-extrabold text-navy transition hover:bg-navy hover:text-white"
    >
      {children}
    </button>
  );
}
