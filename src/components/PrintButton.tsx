"use client";

export function PrintButton({ children }: { children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="rounded-[10px] border-[1.5px] border-navy px-4 py-[10px] text-[12.5px] font-extrabold text-navy hover:bg-navy hover:text-white"
    >
      {children}
    </button>
  );
}
