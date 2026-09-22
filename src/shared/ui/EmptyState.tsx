import type { ReactNode } from 'react';

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
      {icon && <div className="flex h-12 w-12 items-center justify-center rounded-full bg-bg text-text-faint">{icon}</div>}
      <div>
        <div className="text-[14px] font-semibold text-text">{title}</div>
        {description && <p className="mt-1 max-w-sm text-[12.5px] text-text-faint">{description}</p>}
      </div>
      {action}
    </div>
  );
}

export function ErrorState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border border-danger/30 bg-danger-soft px-5 py-4 text-[13px] text-danger">
      Couldn't load this data: {message}
    </div>
  );
}

export function LoadingRows() {
  return (
    <div className="flex flex-col gap-2 p-5">
      {[0, 1, 2].map((i) => (
        <div key={i} className="h-10 animate-pulse rounded-lg bg-border-soft" />
      ))}
    </div>
  );
}
