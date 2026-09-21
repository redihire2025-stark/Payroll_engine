import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[12.5px] font-semibold text-text-muted">{label}</span>
      {children}
      {hint && <span className="text-[11px] text-text-faint">{hint}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className={`rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] text-text placeholder:text-text-faint focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${props.className ?? ''}`}
    />
  );
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      {...props}
      className={`rounded-lg border border-border bg-white px-3 py-2.5 text-[13px] text-text focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent ${props.className ?? ''}`}
    />
  );
}

export function SearchInput({ placeholder = 'Search…' }: { placeholder?: string }) {
  return (
    <div className="flex w-56 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B93A1" strokeWidth={2}>
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <span className="text-[12.5px] text-text-faint">{placeholder}</span>
    </div>
  );
}
