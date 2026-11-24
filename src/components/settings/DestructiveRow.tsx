import { useEffect, useState } from "react";

// two-step confirm; armed state is destructive intent and expires on its own
export function DestructiveRow({
  label,
  description,
  disabled,
  onConfirm,
}: {
  label: string;
  description: string;
  disabled: boolean;
  onConfirm: () => void;
}) {
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  return (
    <div className="flex items-center justify-between gap-3 py-3">
      <div className="min-w-0">
        <p className="text-sm text-ink">{label}</p>
        <p className="mt-0.5 text-xs text-ink-dim">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        aria-label={armed ? `Confirm ${label.toLowerCase()}` : label}
        onClick={() => {
          if (armed) {
            setArmed(false);
            onConfirm();
            return;
          }
          setArmed(true);
        }}
        className={`shrink-0 rounded-ctl border px-3 py-1.5 text-sm transition-colors duration-[250ms] ease-in-out disabled:cursor-not-allowed disabled:opacity-40 max-lg:min-h-11 ${
          armed
            ? "border-red-400/40 text-red-400"
            : "border-hairline text-ink-dim hover:bg-surface-2 hover:text-ink"
        }`}
      >
        {armed ? "Confirm" : "Clear"}
      </button>
    </div>
  );
}

export default DestructiveRow;
