/**
 * Renders a tenant company's logo, or a deterministic monogram fallback
 * when none has been uploaded yet — used on the admin topbar and, most
 * importantly, on every generated payslip header. Never a broken image or
 * empty gap. See docs/architecture/16-self-service-onboarding.md §16.3.
 */
export function OrgLogo({ name, url, size = 32 }: { name: string; url?: string | null; size?: number }) {
  if (url) {
    // Uploaded logos are rarely square (most are wide wordmarks) — constrain
    // by height and let width flow, rather than force-cropping into a
    // square box the way the monogram fallback below renders.
    return (
      <img
        src={url}
        alt={`${name} logo`}
        style={{ height: size, width: 'auto', maxWidth: size * 4 }}
        className="object-contain"
      />
    );
  }
  const initials = name
    .split(' ')
    .filter((w) => w[0] === w[0]?.toUpperCase())
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      className="flex shrink-0 items-center justify-center rounded-lg border border-accent/25 bg-accent-soft font-bold text-accent-strong"
    >
      {initials || name[0]}
    </div>
  );
}
