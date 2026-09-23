// Pure template rendering — no I/O, directly unit-testable. Tokens look
// like {{employee_name}}; an unknown token is left in place rather than
// silently dropped, so a typo in a template is visible in the preview
// instead of producing a letter with a gap in it.

export function renderTemplate(body: string, fields: Record<string, string>): string {
  return body.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (match, key: string) => {
    return Object.prototype.hasOwnProperty.call(fields, key) ? fields[key] : match;
  });
}

export const AVAILABLE_MERGE_FIELDS = [
  'employee_name',
  'employee_code',
  'designation',
  'department',
  'company_name',
  'date',
  'ctc',
  'date_of_joining',
  'date_of_exit',
] as const;
