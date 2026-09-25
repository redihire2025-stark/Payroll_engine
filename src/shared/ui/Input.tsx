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

/**
 * A real controlled text input, not just a styled placeholder — this used
 * to render a <div> with no <input> at all, so nothing could be typed
 * into it and pages using it as a filter (Employees, Audit Log) silently
 * did no filtering. `value`/`onChange` are required so a caller can't
 * accidentally wire it up the same non-functional way again.
 */
export function SearchInput({
  placeholder = 'Search…',
  value,
  onChange,
  className = '',
}: {
  placeholder?: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div className={`flex w-56 items-center gap-2 rounded-lg border border-border bg-bg px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent ${className}`}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#8B93A1" strokeWidth={2} className="shrink-0">
        <circle cx="11" cy="11" r="7" />
        <path d="M21 21l-4.3-4.3" />
      </svg>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-transparent text-[12.5px] text-text placeholder:text-text-faint focus:outline-none"
      />
    </div>
  );
}
