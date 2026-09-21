function initials(name: string) {
  return name
    .split(' ')
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

const palette = ['#0B5D45', '#2B5F8A', '#A6690A', '#7A4FB2', '#B23A34'];
function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return palette[Math.abs(hash) % palette.length];
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  return (
    <div
      style={{ width: size, height: size, background: colorFor(name), fontSize: size * 0.38 }}
      className="flex shrink-0 items-center justify-center rounded-full font-bold text-white"
    >
      {initials(name)}
    </div>
  );
}
