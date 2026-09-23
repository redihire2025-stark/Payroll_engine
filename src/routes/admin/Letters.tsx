import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Input, Select } from '@/shared/ui/Input';
import { Modal } from '@/shared/ui/Modal';
import { EmptyState, ErrorState, LoadingRows } from '@/shared/ui/EmptyState';
import { PlusIcon, FileTextIcon } from '@/shared/ui/icons';
import { useSession } from '@/shared/lib/session';
import {
  listTemplates,
  createTemplate,
  deleteTemplate,
  previewLetter,
  generateLetter,
  listCompanyLetters,
  getSignedLetterUrl,
  type LetterTemplateRow,
  type LetterType,
} from '@/modules/letters/letterService';
import { AVAILABLE_MERGE_FIELDS } from '@/modules/letters/mergeFields';
import { listEmployeesLite } from '@/modules/employee/employeeService';

const LETTER_TYPES: LetterType[] = [
  'offer', 'appointment', 'confirmation', 'promotion', 'increment',
  'transfer', 'salary_certificate', 'experience', 'relieving', 'custom',
];
const tabs = ['Templates', 'Generated'] as const;

function NewTemplateModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [letterType, setLetterType] = useState<LetterType>('custom');
  const [body, setBody] = useState('Dear {{employee_name}},\n\n');
  const [error, setError] = useState<string | null>(null);
  const mutation = useMutation({
    mutationFn: () => createTemplate(companyId, name.trim(), letterType, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['letter-templates', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not create template.'),
  });
  return (
    <Modal title="New Letter Template" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); setError(null); mutation.mutate(); }}>
        <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} required autoFocus />
        <Select value={letterType} onChange={(e) => setLetterType(e.target.value as LetterType)}>
          {LETTER_TYPES.map((t) => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
        </Select>
        <textarea
          className="rounded-lg border border-border bg-white px-3 py-2.5 text-[13px]"
          rows={8}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
        />
        <p className="text-[11px] text-text-faint">
          Merge fields: {AVAILABLE_MERGE_FIELDS.map((f) => `{{${f}}}`).join(', ')}
        </p>
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" variant="primary" disabled={!name.trim() || !body.trim() || mutation.isPending}>{mutation.isPending ? 'Saving…' : 'Save Template'}</Button>
        </div>
      </form>
    </Modal>
  );
}

function GenerateLetterModal({ companyId, template, onClose }: { companyId: string; template: LetterTemplateRow; onClose: () => void }) {
  const queryClient = useQueryClient();
  const employeesQuery = useQuery({ queryKey: ['employees-lite', companyId], queryFn: () => listEmployeesLite(companyId) });
  const [employeeId, setEmployeeId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const previewQuery = useQuery({
    queryKey: ['letter-preview', template.id, employeeId],
    queryFn: () => previewLetter(companyId, employeeId, template.body),
    enabled: Boolean(employeeId),
  });
  const mutation = useMutation({
    mutationFn: () => generateLetter(companyId, employeeId, template.id, template.name, template.body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['company-letters', companyId] });
      onClose();
    },
    onError: (err) => setError(err instanceof Error ? err.message : 'Could not generate letter.'),
  });
  return (
    <Modal title={`Generate "${template.name}"`} onClose={onClose}>
      <div className="flex flex-col gap-4">
        <Select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)}>
          <option value="">Select employee…</option>
          {(employeesQuery.data ?? []).map((e) => <option key={e.id} value={e.id}>{e.name} ({e.code})</option>)}
        </Select>
        {employeeId && (
          <div className="max-h-56 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-bg px-3 py-2.5 text-[12.5px] text-text-muted">
            {previewQuery.isLoading ? 'Loading preview…' : previewQuery.data}
          </div>
        )}
        {error && <p className="text-[12.5px] text-danger">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="primary" disabled={!employeeId || mutation.isPending} onClick={() => { setError(null); mutation.mutate(); }}>
            {mutation.isPending ? 'Generating…' : 'Generate & Store PDF'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function TemplatesTab({ companyId }: { companyId: string }) {
  const queryClient = useQueryClient();
  const [showNew, setShowNew] = useState(false);
  const [generatingTemplate, setGeneratingTemplate] = useState<LetterTemplateRow | null>(null);
  const { data, isLoading, error } = useQuery({ queryKey: ['letter-templates', companyId], queryFn: () => listTemplates(companyId) });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteTemplate(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['letter-templates', companyId] }),
  });

  return (
    <div className="flex flex-col gap-4">
      <Button size="sm" variant="secondary" icon={<PlusIcon width={14} height={14} />} onClick={() => setShowNew(true)} className="self-start">
        New Template
      </Button>

      {error && <ErrorState message={(error as Error).message} />}

      <Card>
        {isLoading ? (
          <LoadingRows />
        ) : (data ?? []).length === 0 ? (
          <div className="px-5 pb-6 pt-2">
            <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No templates yet" description="Create a template to start generating letters." />
          </div>
        ) : (
          (data ?? []).map((t) => (
            <div key={t.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
              <div>
                <div className="font-medium text-text">{t.name}</div>
                <div className="text-[11.5px] text-text-faint capitalize">{t.letterType.replace('_', ' ')}</div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" onClick={() => setGeneratingTemplate(t)}>Generate</Button>
                <Button size="sm" variant="secondary" disabled={deleteMutation.isPending} onClick={() => deleteMutation.mutate(t.id)}>Delete</Button>
              </div>
            </div>
          ))
        )}
      </Card>

      {showNew && <NewTemplateModal companyId={companyId} onClose={() => setShowNew(false)} />}
      {generatingTemplate && <GenerateLetterModal companyId={companyId} template={generatingTemplate} onClose={() => setGeneratingTemplate(null)} />}
    </div>
  );
}

function GeneratedTab({ companyId }: { companyId: string }) {
  const [openingId, setOpeningId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { data, isLoading, error: listError } = useQuery({ queryKey: ['company-letters', companyId], queryFn: () => listCompanyLetters(companyId) });

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

  return (
    <Card>
      {listError && <div className="px-5 pt-4"><ErrorState message={(listError as Error).message} /></div>}
      {error && <p className="px-5 pt-2 text-[12px] text-danger">{error}</p>}
      {isLoading ? (
        <LoadingRows />
      ) : (data ?? []).length === 0 ? (
        <div className="px-5 pb-6 pt-2">
          <EmptyState icon={<FileTextIcon width={20} height={20} />} title="No letters generated yet" description="Letters generated for employees will appear here." />
        </div>
      ) : (
        (data ?? []).map((l) => (
          <div key={l.id} className="flex items-center justify-between border-b border-border-soft px-5 py-3.5 text-[13px] last:border-b-0">
            <div>
              <div className="font-medium text-text">{l.title}</div>
              <div className="text-[11.5px] text-text-faint">{l.employeeName} · {new Date(l.generatedAt).toLocaleDateString()}</div>
            </div>
            <Button size="sm" variant="secondary" disabled={openingId === l.id} onClick={() => handleOpen(l.id)}>
              {openingId === l.id ? 'Opening…' : 'View PDF'}
            </Button>
          </div>
        ))
      )}
    </Card>
  );
}

export default function Letters() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const [tab, setTab] = useState<(typeof tabs)[number]>('Templates');

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Letters</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Templates and generated employee letters</p>
      </div>

      <div className="flex gap-1 border-b border-border">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`border-b-2 px-3 pb-2.5 text-[13px] font-semibold ${tab === t ? 'border-accent text-accent' : 'border-transparent text-text-faint'}`}
          >
            {t}
          </button>
        ))}
      </div>

      {tab === 'Templates' && <TemplatesTab companyId={companyId} />}
      {tab === 'Generated' && <GeneratedTab companyId={companyId} />}
    </div>
  );
}
