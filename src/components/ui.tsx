import Link from "next/link";

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  eyebrow?: string;
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h1 className="font-display text-2xl font-extrabold tracking-tight text-brand-900">
          {title}
        </h1>
        {subtitle && <p className="mt-1 text-sm text-stone-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "positive" | "negative" | "muted";
}) {
  const valueTone =
    tone === "positive"
      ? "text-brand-700"
      : tone === "negative"
        ? "text-clay-600"
        : tone === "muted"
          ? "text-stone-400"
          : "text-stone-900";
  return (
    <div className="stat-card">
      <div className="eyebrow">{label}</div>
      <div className={`ledger mt-1.5 text-2xl font-extrabold ${valueTone}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-stone-400">{hint}</div>}
    </div>
  );
}

export function EmptyState({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="card p-10 text-center">
      <p className="font-display text-base font-bold text-stone-800">{title}</p>
      {hint && <p className="mt-1 text-sm text-stone-500">{hint}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

const projectStatusStyles: Record<string, string> = {
  QUOTE: "bg-stone-100 text-stone-600",
  ACTIVE: "bg-brand-100 text-brand-700",
  DONE: "bg-lime-100 text-lime-600",
  PAID: "bg-stone-200 text-stone-700",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`badge ${projectStatusStyles[status] ?? "bg-stone-100 text-stone-600"}`}>
      {status.charAt(0) + status.slice(1).toLowerCase()}
    </span>
  );
}

export function MarginBadge({ margin }: { margin: number | null }) {
  if (margin === null) {
    return <span className="badge bg-stone-100 text-stone-500">— margin</span>;
  }
  const tone =
    margin >= 50
      ? "bg-lime-100 text-lime-600"
      : margin >= 25
        ? "bg-brand-100 text-brand-700"
        : "bg-clay-100 text-clay-600";
  return <span className={`badge ${tone}`}>{margin.toFixed(0)}% margin</span>;
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>
      {children}
    </Link>
  );
}
