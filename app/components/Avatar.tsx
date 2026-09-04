const PALETTE = [
  { bg: "bg-primary", text: "text-paper" },
  { bg: "bg-[color:var(--color-violet)]", text: "text-paper" },
  { bg: "bg-[color:var(--color-blue)]", text: "text-paper" },
  { bg: "bg-[color:var(--color-rose)]", text: "text-paper" },
  { bg: "bg-[color:var(--color-emerald)]", text: "text-paper" },
  { bg: "bg-[color:var(--color-amber-solid)]", text: "text-paper" },
];

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function colorFor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) >>> 0;
  return PALETTE[hash % PALETTE.length];
}

export default function Avatar({ name, size = 27 }: { name: string; size?: number }) {
  const { bg, text } = colorFor(name);
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center rounded-full font-heading font-semibold ${bg} ${text}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials(name)}
    </span>
  );
}
