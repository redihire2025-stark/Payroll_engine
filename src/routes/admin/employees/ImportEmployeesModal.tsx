import { useState, type ChangeEvent } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type * as XLSXType from 'xlsx';
import { Modal } from '@/shared/ui/Modal';
import { Button } from '@/shared/ui/Button';
import { bulkCreateEmployees, type CreateEmployeeInput } from '@/modules/employee/employeeService';

type ParsedRow = Omit<CreateEmployeeInput, 'companyId'>;

// Header aliases accepted in the uploaded file, matched case-insensitively
// after stripping spaces/underscores — keeps the template forgiving without
// building a full column-mapping UI.
const HEADER_ALIASES: Record<string, keyof ParsedRow> = {
  employeecode: 'employeeCode',
  code: 'employeeCode',
  empcode: 'employeeCode',
  firstname: 'firstName',
  lastname: 'lastName',
  personalemail: 'personalEmail',
  email: 'personalEmail',
  phone: 'phone',
  mobile: 'phone',
  dateofjoining: 'dateOfJoining',
  doj: 'dateOfJoining',
  employmenttype: 'employmentType',
  department: 'departmentName',
  designation: 'designationTitle',
  branch: 'branchName',
};

function normalizeHeader(h: string): string {
  return h.trim().toLowerCase().replace(/[\s_-]+/g, '');
}

function excelSerialToIsoDate(value: number): string {
  // Excel's epoch is 1899-12-30 (accounting for its historical leap-year bug).
  const utcMs = Math.round((value - 25569) * 86400 * 1000);
  return new Date(utcMs).toISOString().slice(0, 10);
}

function toDateString(value: unknown): string {
  if (typeof value === 'number') return excelSerialToIsoDate(value);
  const str = String(value ?? '').trim();
  if (!str) return '';
  const parsed = new Date(str);
  return Number.isNaN(parsed.getTime()) ? str : parsed.toISOString().slice(0, 10);
}

function parseWorkbook(XLSX: typeof XLSXType, buffer: ArrayBuffer): { rows: ParsedRow[]; skipped: number } {
  const workbook = XLSX.read(buffer, { type: 'array' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const raw = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: '' });

  let skipped = 0;
  const rows: ParsedRow[] = [];

  for (const record of raw) {
    const mapped: Partial<ParsedRow> = {};
    for (const [header, value] of Object.entries(record)) {
      const field = HEADER_ALIASES[normalizeHeader(header)];
      if (!field) continue;
      if (field === 'dateOfJoining') {
        mapped.dateOfJoining = toDateString(value);
      } else {
        const str = String(value ?? '').trim();
        if (str) (mapped as Record<string, string>)[field] = str;
      }
    }
    if (!mapped.employeeCode || !mapped.firstName || !mapped.dateOfJoining) {
      skipped += 1;
      continue;
    }
    rows.push(mapped as ParsedRow);
  }

  return { rows, skipped };
}

async function downloadTemplate() {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet([
    {
      'Employee Code': 'EMP001',
      'First Name': 'Asha',
      'Last Name': 'Rao',
      'Personal Email': 'asha.rao@example.com',
      Phone: '9876543210',
      'Date of Joining': '2025-01-15',
      'Employment Type': 'full_time',
      Department: 'Engineering',
      Designation: 'Software Engineer',
      Branch: 'Hyderabad',
    },
  ]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Employees');
  XLSX.writeFile(workbook, 'employee-import-template.xlsx');
}

export function ImportEmployeesModal({ companyId, onClose }: { companyId: string; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [fileName, setFileName] = useState<string | null>(null);
  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [skipped, setSkipped] = useState(0);
  const [parseError, setParseError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<{ successCount: number; errors: { row: number; message: string }[] } | null>(null);

  async function handleFile(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setResult(null);
    setParseError(null);
    try {
      const [buffer, XLSX] = await Promise.all([file.arrayBuffer(), import('xlsx')]);
      const { rows: parsed, skipped: skippedCount } = parseWorkbook(XLSX, buffer);
      setRows(parsed);
      setSkipped(skippedCount);
      if (parsed.length === 0) {
        setParseError('No valid rows found. Each row needs at least Employee Code, First Name and Date of Joining.');
      }
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'Could not read that file.');
      setRows([]);
    }
  }

  async function handleImport() {
    setImporting(true);
    setResult(null);
    try {
      const outcome = await bulkCreateEmployees(companyId, rows);
      setResult(outcome);
      if (outcome.errors.length === 0) {
        queryClient.invalidateQueries({ queryKey: ['employees', companyId] });
        queryClient.invalidateQueries({ queryKey: ['company', companyId] });
      }
    } finally {
      setImporting(false);
    }
  }

  return (
    <Modal title="Import Employees" onClose={onClose} width="max-w-2xl">
      <div className="flex flex-col gap-4">
        <p className="text-[13px] text-text-muted">
          Upload an Excel (.xlsx) or CSV file. Each row needs at least <strong>Employee Code</strong>, <strong>First Name</strong> and{' '}
          <strong>Date of Joining</strong>. Department, Designation and Branch are created automatically if they don't already exist.
        </p>

        <button type="button" onClick={downloadTemplate} className="self-start text-[12.5px] font-semibold text-accent hover:underline">
          Download a template file
        </button>

        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border bg-bg p-6 text-center">
          <span className="text-[13px] font-semibold text-text">{fileName ?? 'Choose a file to upload'}</span>
          <span className="text-[11.5px] text-text-faint">.xlsx, .xls or .csv</span>
          <input type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFile} />
        </label>

        {parseError && <p className="text-[12.5px] text-danger">{parseError}</p>}

        {rows.length > 0 && !result && (
          <div className="rounded-lg border border-border bg-surface">
            <div className="border-b border-border px-4 py-2.5 text-[12.5px] font-semibold text-text">
              {rows.length} employee{rows.length === 1 ? '' : 's'} ready to import
              {skipped > 0 && <span className="ml-2 font-normal text-text-faint">({skipped} row{skipped === 1 ? '' : 's'} skipped — missing required fields)</span>}
            </div>
            <div className="max-h-48 overflow-y-auto">
              {rows.slice(0, 20).map((r, i) => (
                <div key={i} className="flex items-center justify-between border-b border-border-soft px-4 py-2 text-[12.5px] last:border-b-0">
                  <span className="font-medium text-text">{r.firstName} {r.lastName ?? ''}</span>
                  <span className="font-mono-num text-text-faint">{r.employeeCode}</span>
                </div>
              ))}
              {rows.length > 20 && <div className="px-4 py-2 text-[11.5px] text-text-faint">…and {rows.length - 20} more</div>}
            </div>
          </div>
        )}

        {result && (
          <div className="rounded-lg border border-border bg-surface p-4 text-[13px]">
            <p className="font-semibold text-text">{result.successCount} of {rows.length} employee{rows.length === 1 ? '' : 's'} created.</p>
            {result.errors.length > 0 && (
              <ul className="mt-2 flex flex-col gap-1 text-[12px] text-danger">
                {result.errors.slice(0, 10).map((e) => (
                  <li key={e.row}>Row {e.row}: {e.message}</li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="mt-1 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>{result ? 'Close' : 'Cancel'}</Button>
          {!result && (
            <Button type="button" variant="primary" disabled={rows.length === 0 || importing} onClick={handleImport}>
              {importing ? `Importing ${rows.length}…` : `Import ${rows.length || ''} Employee${rows.length === 1 ? '' : 's'}`}
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
}
