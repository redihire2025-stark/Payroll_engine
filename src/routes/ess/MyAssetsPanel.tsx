import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { BoxIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listMyAssets } from '@/modules/asset/assetService';

export function MyAssetsPanel() {
  const { user } = useSession();
  const { data, isLoading, error } = useQuery({
    queryKey: ['my-assets', user?.employeeId],
    queryFn: () => listMyAssets(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  if (error) return <ErrorState message={(error as Error).message} />;
  if (isLoading) return <LoadingRows />;
  if ((data ?? []).length === 0) {
    return <EmptyState icon={<BoxIcon width={20} height={20} />} title="No assets issued" description="Equipment issued to you will appear here." />;
  }
  return (
    <div className="flex flex-col gap-2.5">
      {(data ?? []).map((a, i) => (
        <div key={i} className="rounded-xl border border-border bg-surface p-4">
          <div className="text-[13px] font-semibold text-text">{a.name}</div>
          <div className="mt-0.5 text-[11.5px] text-text-faint">{a.category} · issued {a.issuedAt}</div>
        </div>
      ))}
    </div>
  );
}
