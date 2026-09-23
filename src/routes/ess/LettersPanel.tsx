import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/shared/ui/Button';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { FileTextIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import { listMyLetters, getSignedLetterUrl } from '@/modules/letters/letterService';

export function LettersPanel() {
  const { user } = useSession();
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, error: listError } = useQuery({
    queryKey: ['my-letters', user?.employeeId],
    queryFn: () => listMyLetters(user!.employeeId),
    enabled: Boolean(user?.employeeId),
  });

  async function handleOpen(letterId: string) {
    setOpeningId(letterId);
    setError(null);
    try {
      const url = await getSignedLetterUrl(letterId);
      window.open(url, '_blank');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not open that letter.');
    } finally {
      setOpeningId(null);
    }
  }

  if (listError) return <ErrorState message={(listError as Error).message} />;
  if (isLoading) return <LoadingRows />;
  if ((data ?? []).length === 0) {
    return <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No letters yet" description="Letters issued to you will appear here." />;
  }

  return (
    <div className="flex flex-col gap-2.5">
      {error && <p className="text-[12px] text-danger">{error}</p>}
      {(data ?? []).map((l) => (
        <div key={l.id} className="flex items-center justify-between rounded-xl border border-border bg-surface p-4">
          <div>
            <div className="text-[13px] font-semibold text-text">{l.title}</div>
            <div className="mt-0.5 text-[11.5px] text-text-faint">{new Date(l.generatedAt).toLocaleDateString()}</div>
          </div>
          <Button size="sm" variant="secondary" disabled={openingId === l.id} onClick={() => handleOpen(l.id)}>
            {openingId === l.id ? 'Opening…' : 'View'}
          </Button>
        </div>
      ))}
    </div>
  );
}
