import type { ReactNode } from 'react';

export function Table({ columns, children }: { columns: string; children: ReactNode }) {
  return <div style={{ display: 'grid', gridTemplateColumns: columns }} className="min-w-full text-sm">{children}</div>;
}

export function TableHeadRow({ columns, children }: { columns: string; children: ReactNode }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: columns }}
      className="gap-3 border-b border-border px-4 py-2.5"
    >
      {children}
    </div>
  );
}

export function Th({ children, align = 'left' }: { children: ReactNode; align?: 'left' | 'right' }) {
  return (
    <div className={`text-[11px] font-bold uppercase tracking-wide text-text-faint ${align === 'right' ? 'text-right' : ''}`}>
      {children}
    </div>
  );
}

export function TableRow({ columns, children, className = '' }: { columns: string; children: ReactNode; className?: string }) {
  return (
    <div
      style={{ display: 'grid', gridTemplateColumns: columns }}
      className={`items-center gap-3 border-b border-border-soft px-4 py-3.5 text-[13px] last:border-b-0 hover:bg-bg/60 ${className}`}
    >
      {children}
    </div>
  );
}

export function Td({ children, align = 'left', muted = false }: { children: ReactNode; align?: 'left' | 'right'; muted?: boolean }) {
  return (
    <div className={`truncate ${align === 'right' ? 'text-right' : ''} ${muted ? 'text-text-muted' : 'text-text'}`}>
      {children}
    </div>
  );
}
