const LEAVE_STYLES: { match: RegExp; chip: string; text: string }[] = [
  { match: /sick/i, chip: 'bg-danger-soft', text: 'text-danger' },
  { match: /casual/i, chip: 'bg-info-soft', text: 'text-info' },
  { match: /earned/i, chip: 'bg-accent-soft', text: 'text-accent' },
  { match: /bereavement/i, chip: 'bg-warning-soft', text: 'text-warning' },
];

/** Color-codes a leave type tile/chip by its name (Sick/Casual/Earned/Bereavement), falling back to a neutral style for any custom leave type an admin adds. */
export function leaveStyle(name: string): { chip: string; text: string } {
  return LEAVE_STYLES.find((s) => s.match.test(name)) ?? { chip: 'bg-border-soft', text: 'text-text-muted' };
}
