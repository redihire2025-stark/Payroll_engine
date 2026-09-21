import type { HTMLAttributes, ReactNode } from 'react';

export function Card({ className = '', children, ...rest }: HTMLAttributes<HTMLDivElement> & { children: ReactNode }) {
  return (
    <div className={`rounded-xl border border-border bg-surface shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function CardHeader({ title, subtitle, action }: { title: string; subtitle?: string; action?: ReactNode }) {
  return (
    <div className="flex items-center justify-between border-b border-border-soft px-5 py-4">
      <div>
        <h3 className="text-[14px] font-semibold text-text">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-text-faint">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
