// shared toggle: SourcesModal provider rows and the Settings appearance rows
export function Switch({
  checked,
  label,
  onToggle,
}: {
  checked: boolean;
  label: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={`flex h-6 w-11 shrink-0 items-center rounded-full px-0.5 transition-colors duration-[250ms] ease-in-out max-lg:h-11 max-lg:w-16 ${
        checked ? "bg-accent" : "bg-white/10"
      }`}
    >
      <span
        className={`h-5 w-5 rounded-full transition-transform duration-[250ms] ease-[cubic-bezier(0.4,0,0.2,1)] max-lg:h-9 max-lg:w-9 ${
          checked ? "translate-x-5 max-lg:translate-x-6 bg-canvas" : "translate-x-0 bg-white"
        }`}
      />
    </button>
  );
}

export default Switch;
