export default function SimpleScreen({
  label,
  title,
  body,
  action,
}: {
  label: string;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="h-screen flex items-center justify-center bg-[var(--bg)] px-4">
      <div className="w-full max-w-[380px] text-center">
        <p className="text-xs font-medium text-[var(--muted)] uppercase tracking-[0.08em]">
          {label}
        </p>
        <h1 className="mt-3 text-sm font-semibold text-[var(--text)] leading-snug">
          {title}
        </h1>
        <p className="mt-2 text-xs text-[var(--muted)] leading-relaxed">
          {body}
        </p>
        {action && <div className="mt-5">{action}</div>}
      </div>
    </div>
  );
}
