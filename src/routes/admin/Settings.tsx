import { useState, type FormEvent } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardHeader } from '@/shared/ui/Card';
import { Button } from '@/shared/ui/Button';
import { Field, Input, Select } from '@/shared/ui/Input';
import { ErrorState } from '@/shared/ui/EmptyState';
import { useSession } from '@/shared/lib/session';
import { getCompanySettings, updateCompanySettings, type CompanySettingsRow } from '@/modules/company/companyService';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Settings() {
  const { user } = useSession();
  const companyId = user!.companyId;
  const queryClient = useQueryClient();
  const { data: settings, isLoading, error } = useQuery({ queryKey: ['company-settings', companyId], queryFn: () => getCompanySettings(companyId) });

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setSaveError(null);
    setSaved(false);
    try {
      const fields: CompanySettingsRow = {
        fiscalYearStartMonth: Number(form.get('fiscalYearStartMonth')),
        payrollCycleType: String(form.get('payrollCycleType')),
        payDay: Number(form.get('payDay')),
        defaultCurrency: String(form.get('defaultCurrency')),
        timezone: String(form.get('timezone')),
      };
      await updateCompanySettings(companyId, fields);
      await queryClient.invalidateQueries({ queryKey: ['company-settings', companyId] });
      setSaved(true);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Could not save changes.');
    } finally {
      setSaving(false);
    }
  }

  if (error) return <ErrorState message={(error as Error).message} />;
  if (isLoading || !settings) return <div className="text-[13px] text-text-faint">Loading…</div>;

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold text-text">Settings</h1>
        <p className="mt-0.5 text-[13px] text-text-faint">Financial year, payroll calendar and regional configuration</p>
      </div>

      {saveError && <ErrorState message={saveError} />}

      <form onSubmit={handleSave}>
        <Card>
          <CardHeader title="Payroll Calendar" subtitle="Governs which financial year a payroll run and its statutory filings fall under" />
          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Fiscal year starts">
                <Select name="fiscalYearStartMonth" defaultValue={settings.fiscalYearStartMonth}>
                  {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                </Select>
              </Field>
              <Field label="Payroll cycle">
                <Select name="payrollCycleType" defaultValue={settings.payrollCycleType}>
                  <option value="monthly">Monthly</option>
                  <option value="biweekly">Bi-weekly</option>
                  <option value="weekly">Weekly</option>
                </Select>
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Pay day of month" hint="1–31">
                <Input name="payDay" type="number" min={1} max={31} defaultValue={settings.payDay} />
              </Field>
              <Field label="Default currency">
                <Select name="defaultCurrency" defaultValue={settings.defaultCurrency}>
                  <option value="INR">INR (₹)</option>
                  <option value="USD">USD ($)</option>
                </Select>
              </Field>
            </div>
            <Field label="Timezone">
              <Select name="timezone" defaultValue={settings.timezone}>
                <option value="Asia/Kolkata">Asia/Kolkata</option>
                <option value="UTC">UTC</option>
              </Select>
            </Field>
            <div className="flex items-center justify-end gap-3">
              {saved && <span className="text-[12.5px] text-success">Saved.</span>}
              <Button type="submit" variant="primary" size="sm" disabled={saving}>{saving ? 'Saving…' : 'Save Changes'}</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}
