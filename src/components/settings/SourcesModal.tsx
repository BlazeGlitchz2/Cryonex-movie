import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { ChevronDown, ChevronUp, Pencil, Plus, X } from "lucide-react";
import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { useAppStore } from "../../store/useAppStore";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import { useToastStore } from "../../store/useToastStore";
import { useUIStore } from "../../store/useUIStore";
import type { StreamProvider } from "../../types/media";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// AppShell owns the same query; matching it keeps one nav/chrome breakpoint contract
const DESKTOP_QUERY = window.matchMedia("(min-width: 1024px)");

function subscribeDesktop(onChange: () => void) {
  DESKTOP_QUERY.addEventListener("change", onChange);
  return () => DESKTOP_QUERY.removeEventListener("change", onChange);
}

const rowStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const rowRise: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

// touch needs 44px targets, so the compact desktop icon buttons grow below lg
const iconButtonClass =
  "grid place-items-center rounded-ctl p-1.5 text-ink-dim transition-colors duration-[250ms] ease-in-out hover:bg-surface-2 hover:text-ink disabled:opacity-40 max-lg:min-h-11 max-lg:min-w-11";

interface ProviderFormValues {
  name: string;
  badge: string;
  movieTemplate: string;
  tvTemplate: string;
}

function validate(values: ProviderFormValues) {
  const name = values.name.trim();
  const movieTemplate = values.movieTemplate.trim();
  const tvTemplate = values.tvTemplate.trim();
  return {
    name: name ? null : "Name is required.",
    movieTemplate:
      movieTemplate.startsWith("https://") && movieTemplate.includes("{id}")
        ? null
        : "Movie template must start with https:// and contain {id}.",
    tvTemplate:
      tvTemplate.startsWith("https://") &&
      ["{id}", "{season}", "{episode}"].every((token) =>
        tvTemplate.includes(token),
      )
        ? null
        : "TV template must start with https:// and contain {id}, {season} and {episode}.",
  };
}

function ProviderForm({
  initial,
  submitLabel,
  onSubmit,
  onCancel,
}: {
  initial: ProviderFormValues;
  submitLabel: string;
  onSubmit: (values: ProviderFormValues) => void;
  onCancel?: () => void;
}) {
  const formId = useId();
  const [values, setValues] = useState(initial);
  const [touched, setTouched] = useState({
    name: false,
    badge: false,
    movieTemplate: false,
    tvTemplate: false,
  });

  const errors = validate(values);
  const valid = !errors.name && !errors.movieTemplate && !errors.tvTemplate;

  const setField =
    (field: keyof ProviderFormValues) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const blurField = (field: keyof ProviderFormValues) => () => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  };

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      return;
    }
    onSubmit({
      name: values.name.trim(),
      badge: values.badge.trim(),
      movieTemplate: values.movieTemplate.trim(),
      tvTemplate: values.tvTemplate.trim(),
    });
  };

  // iOS zooms any focused input under 16px, so touch fields run 16px text in 44px fields
  const inputClass =
    "mt-1 w-full rounded-ctl border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-dim max-lg:min-h-11 max-lg:text-base";

  return (
    <form onSubmit={submit} className="space-y-3" noValidate>
      <div>
        <label htmlFor={`${formId}-name`} className="block text-xs text-ink-dim">
          Name
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          value={values.name}
          onChange={setField("name")}
          onBlur={blurField("name")}
          placeholder="Example: Vidora"
          className={inputClass}
        />
        {touched.name && errors.name && (
          <p className="mt-1 text-xs text-ink">{errors.name}</p>
        )}
      </div>
      <div>
        <label
          htmlFor={`${formId}-badge`}
          className="block text-xs text-ink-dim"
        >
          Badge (optional)
        </label>
        <input
          id={`${formId}-badge`}
          type="text"
          value={values.badge}
          onChange={setField("badge")}
          onBlur={blurField("badge")}
          placeholder="Example: 4K with subtitles"
          className={inputClass}
        />
      </div>
      <div>
        <label
          htmlFor={`${formId}-movie`}
          className="block text-xs text-ink-dim"
        >
          Movie template
        </label>
        <input
          id={`${formId}-movie`}
          type="text"
          value={values.movieTemplate}
          onChange={setField("movieTemplate")}
          onBlur={blurField("movieTemplate")}
          placeholder="https://example.com/movie/{id}"
          className={inputClass}
        />
        {touched.movieTemplate && errors.movieTemplate && (
          <p className="mt-1 text-xs text-ink">{errors.movieTemplate}</p>
        )}
      </div>
      <div>
        <label htmlFor={`${formId}-tv`} className="block text-xs text-ink-dim">
          TV template
        </label>
        <input
          id={`${formId}-tv`}
          type="text"
          value={values.tvTemplate}
          onChange={setField("tvTemplate")}
          onBlur={blurField("tvTemplate")}
          placeholder="https://example.com/tv/{id}/{season}/{episode}"
          className={inputClass}
        />
        {touched.tvTemplate && errors.tvTemplate && (
          <p className="mt-1 text-xs text-ink">{errors.tvTemplate}</p>
        )}
      </div>
      <div className="flex items-center gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="flex items-center gap-1.5 rounded-ctl bg-accent px-3 py-2 text-sm font-medium text-canvas transition-colors duration-[250ms] ease-in-out disabled:opacity-40 max-lg:min-h-11"
        >
          <Plus size={14} aria-hidden="true" />
          {submitLabel}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-ctl border border-hairline px-3 py-2 text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out hover:bg-surface-2 max-lg:min-h-11"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

function DestructiveRow({
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
    // confirm state is a real destructive intent, so it expires on its own
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

function Switch({
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

function ProviderRow({
  provider,
  index,
  total,
  isDefault,
  isEditing,
  isArmedForRemove,
  onEdit,
  onCancelEdit,
  onRemoveClick,
  onToggle,
  onMove,
  onSetDefault,
  onSave,
}: {
  provider: StreamProvider;
  index: number;
  total: number;
  isDefault: boolean;
  isEditing: boolean;
  isArmedForRemove: boolean;
  onEdit: (id: string) => void;
  onCancelEdit: () => void;
  onRemoveClick: (id: string) => void;
  onToggle: (id: string) => void;
  onMove: (id: string, direction: -1 | 1) => void;
  onSetDefault: (id: string) => void;
  onSave: (id: string, values: ProviderFormValues) => void;
}) {
  const dimInfo = provider.enabled ? "" : "opacity-60";

  return (
    <motion.div
      variants={rowRise}
      layout
      transition={{ duration: 0.45, ease: EASE }}
      className="material-card rounded-card p-3"
    >
      {/* below lg the controls wrap under the name, so a 360px row never collides */}
      <div className="flex items-start gap-3 max-lg:flex-col">
        <div className="min-w-0 flex-1 max-lg:w-full">
          <div className="flex items-center gap-3">
            <span
              className={`font-display text-sm ${
                provider.enabled ? "text-ink" : "text-ink-dim"
              }`}
            >
              {provider.name}
            </span>
            {provider.badge && (
              <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[11px] text-ink-dim">
                {provider.badge}
              </span>
            )}
          </div>
          <p
            title={provider.movieTemplate}
            className={`mt-1 truncate text-xs text-ink-dim ${dimInfo}`}
          >
            {provider.movieTemplate}
          </p>
          <p
            title={provider.tvTemplate}
            className={`truncate text-xs text-ink-dim ${dimInfo}`}
          >
            {provider.tvTemplate}
          </p>
        </div>
        <div className="flex items-start gap-3 max-lg:w-full max-lg:items-center max-lg:justify-end">
          <input
            type="radio"
            name="default-source"
            checked={isDefault}
            onChange={() => onSetDefault(provider.id)}
            disabled={!provider.enabled}
            aria-label={`Set ${provider.name} as default`}
            className="accent-accent max-lg:size-11"
          />
        <Switch
          checked={provider.enabled}
          label={`${provider.name} enabled`}
          onToggle={() => onToggle(provider.id)}
        />
        <div className="flex flex-col">
          <motion.button
            type="button"
            aria-label={`Move ${provider.name} up`}
            disabled={index === 0}
            onClick={() => onMove(provider.id, -1)}
            whileTap={{ scale: 0.94, transition: { duration: 0.25, ease: EASE } }}
            className={iconButtonClass}
          >
            <ChevronUp size={16} aria-hidden="true" />
          </motion.button>
          <motion.button
            type="button"
            aria-label={`Move ${provider.name} down`}
            disabled={index === total - 1}
            onClick={() => onMove(provider.id, 1)}
            whileTap={{ scale: 0.94, transition: { duration: 0.25, ease: EASE } }}
            className={iconButtonClass}
          >
            <ChevronDown size={16} aria-hidden="true" />
          </motion.button>
        </div>
        <button
          type="button"
          aria-label={`Edit ${provider.name}`}
          onClick={() =>
            isEditing ? onCancelEdit() : onEdit(provider.id)
          }
          className={iconButtonClass}
        >
          <Pencil size={16} aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={
            isArmedForRemove
              ? `Confirm removing ${provider.name}`
              : `Remove ${provider.name}`
          }
          onClick={() => onRemoveClick(provider.id)}
          className={iconButtonClass}
        >
          {isArmedForRemove ? (
            <span className="px-1 text-xs text-ink">Remove?</span>
          ) : (
            <X size={16} aria-hidden="true" />
          )}
        </button>
        </div>
      </div>
      {isEditing && (
        <div className="mt-3 rounded-card border border-hairline bg-surface-2 p-3">
          <ProviderForm
            key={provider.id}
            initial={{
              name: provider.name,
              badge: provider.badge ?? "",
              movieTemplate: provider.movieTemplate,
              tvTemplate: provider.tvTemplate,
            }}
            submitLabel="Save"
            onSubmit={(values) => onSave(provider.id, values)}
            onCancel={onCancelEdit}
          />
        </div>
      )}
    </motion.div>
  );
}

function SourcesPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const isDesktop = useSyncExternalStore(
    subscribeDesktop,
    () => DESKTOP_QUERY.matches,
  );

  const providers = useAppStore((state) => state.providers);
  const activeProviderId = useAppStore((state) => state.activeProviderId);
  const addProvider = useAppStore((state) => state.addProvider);
  const updateProvider = useAppStore((state) => state.updateProvider);
  const removeProvider = useAppStore((state) => state.removeProvider);
  const toggleProviderEnabled = useAppStore(
    (state) => state.toggleProviderEnabled,
  );
  const moveProvider = useAppStore((state) => state.moveProvider);
  const setActiveProvider = useAppStore((state) => state.setActiveProvider);
  const watchlist = useAppStore((state) => state.watchlist);
  const continueWatching = useAppStore((state) => state.continueWatching);
  const removeFromWatchlist = useAppStore(
    (state) => state.removeFromWatchlist,
  );
  const removeFromContinueWatching = useAppStore(
    (state) => state.removeFromContinueWatching,
  );
  const pushToast = useToastStore((state) => state.pushToast);
  const glass = useAppearanceStore((state) => state.glass);
  const setGlass = useAppearanceStore((state) => state.setGlass);
  const windowGlass = useAppearanceStore((state) => state.windowGlass);
  const setWindowGlass = useAppearanceStore((state) => state.setWindowGlass);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [armedRemoveId, setArmedRemoveId] = useState<string | null>(null);
  const [addFormKey, setAddFormKey] = useState(0);

  useEffect(() => {
    const previouslyFocused =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    // the shell owns scrolling, so lock the canvas scroller, not the body
    const canvas = document.getElementById("canvas-scroll");
    const previousOverflow = canvas?.style.overflow ?? "";
    if (canvas) {
      canvas.style.overflow = "hidden";
    }
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      if (canvas) {
        canvas.style.overflow = previousOverflow;
      }
      previouslyFocused?.focus();
    };
  }, [onClose]);

  const onPanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Tab") {
      return;
    }
    event.preventDefault();
    const focusables = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>(
        "button, input, select, [href]",
      ) ?? [],
    ).filter((el) => !el.hasAttribute("disabled"));
    if (focusables.length === 0) {
      return;
    }
    const current = focusables.indexOf(
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : focusables[0],
    );
    const next = event.shiftKey
      ? current <= 0
        ? focusables.length - 1
        : current - 1
      : current === -1 || current === focusables.length - 1
        ? 0
        : current + 1;
    focusables[next]?.focus();
  };

  const submitAdd = (values: ProviderFormValues) => {
    addProvider({
      id: crypto.randomUUID(),
      name: values.name,
      badge: values.badge || null,
      movieTemplate: values.movieTemplate,
      tvTemplate: values.tvTemplate,
      enabled: true,
    });
    setAddFormKey((key) => key + 1);
  };

  const submitEdit = (id: string, values: ProviderFormValues) => {
    updateProvider(id, {
      name: values.name,
      badge: values.badge || null,
      movieTemplate: values.movieTemplate,
      tvTemplate: values.tvTemplate,
    });
    setEditingId(null);
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-canvas/70 p-4 max-lg:items-end max-lg:p-0"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3, ease: EASE }}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label="Streaming sources"
        className="material-modal flex max-h-[80vh] w-[560px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[24px] max-lg:max-h-[85dvh] max-lg:w-full max-lg:max-w-none max-lg:rounded-t-[24px] max-lg:rounded-b-none"
        // below lg the sheet rises from the bottom edge; desktop keeps its scale-settle
        initial={{ opacity: 0, ...(isDesktop ? { scale: 0.96 } : { y: 56 }) }}
        animate={{
          opacity: 1,
          ...(isDesktop
            ? {
                // 2% overshoot on settle, one gentle keyframe pass, no bounce
                scale: [0.96, 1.008, 1],
                transition: { duration: 0.55, ease: EASE, times: [0, 0.7, 1] },
              }
            : {
                y: 0,
                transition: { duration: 0.55, ease: EASE },
              }),
        }}
        exit={{
          opacity: 0,
          ...(isDesktop ? { scale: 0.96 } : { y: 56 }),
          transition: { duration: 0.3, ease: EASE },
        }}
        onKeyDown={onPanelKeyDown}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 pb-4 pt-5">
          <div>
            <h2 className="font-display text-sm font-semibold text-ink">
              Streaming sources
            </h2>
            <p className="mt-1 max-w-90 text-sm text-ink-dim">
              Each source is an embed server template. Cryonex fills in the
              TMDB id, season and episode to build the player URL.
            </p>
          </div>
          <button
            type="button"
            autoFocus
            aria-label="Close streaming sources"
            onClick={onClose}
            className="grid place-items-center rounded-ctl p-1.5 text-ink-dim transition-colors duration-[250ms] ease-in-out hover:bg-surface-2 hover:text-ink max-lg:size-11"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5 max-lg:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          {providers.length === 0 ? (
            <p className="py-6 text-sm text-ink-dim">
              No sources yet. Add one below.
            </p>
          ) : (
            <motion.div
              variants={rowStagger}
              initial="hidden"
              animate="show"
              className="space-y-3"
            >
              {providers.map((provider, index) => (
                <ProviderRow
                  key={provider.id}
                  provider={provider}
                  index={index}
                  total={providers.length}
                  isDefault={activeProviderId === provider.id}
                  isEditing={editingId === provider.id}
                  isArmedForRemove={armedRemoveId === provider.id}
                  onEdit={setEditingId}
                  onCancelEdit={() => setEditingId(null)}
                  onRemoveClick={(id) => {
                    if (armedRemoveId === id) {
                      removeProvider(id);
                      setArmedRemoveId(null);
                      if (editingId === id) {
                        setEditingId(null);
                      }
                    } else {
                      setArmedRemoveId(id);
                    }
                  }}
                  onToggle={toggleProviderEnabled}
                  onMove={moveProvider}
                  onSetDefault={setActiveProvider}
                  onSave={submitEdit}
                />
              ))}
            </motion.div>
          )}
          <div className="pt-4">
            <h3 className="font-display text-sm font-semibold text-ink">
              Add source
            </h3>
            <div className="mt-3">
              <ProviderForm
                key={addFormKey}
                initial={{
                  name: "",
                  badge: "",
                  movieTemplate: "",
                  tvTemplate: "",
                }}
                submitLabel="Add source"
                onSubmit={submitAdd}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-hairline pt-4">
            <h3 className="font-display text-sm font-semibold text-ink">
              Your data
            </h3>
            <div className="mt-2 divide-y divide-hairline">
              <DestructiveRow
                label="Clear continue watching"
                description={
                  continueWatching.length > 0
                    ? `${continueWatching.length} titles in progress.`
                    : "Nothing in progress."
                }
                disabled={continueWatching.length === 0}
                onConfirm={() => {
                  // only single-item removal exists in the store, loop is fine at personal scale
                  continueWatching.forEach((entry) =>
                    removeFromContinueWatching(entry.id, entry.mediaType),
                  );
                  pushToast({
                    title: "Continue watching cleared",
                    tone: "success",
                  });
                }}
              />
              <DestructiveRow
                label="Clear watchlist"
                description={
                  watchlist.length > 0
                    ? `${watchlist.length} titles saved.`
                    : "Nothing saved yet."
                }
                disabled={watchlist.length === 0}
                onConfirm={() => {
                  watchlist.forEach((entry) =>
                    removeFromWatchlist(entry.id, entry.mediaType),
                  );
                  pushToast({ title: "Watchlist cleared", tone: "success" });
                }}
              />
            </div>
          </div>
          <div className="mt-4 border-t border-hairline pt-4">
            <h3 className="font-display text-sm font-semibold text-ink">
              Appearance
            </h3>
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink">Glass surfaces</p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  Translucent frosted panels across the app
                </p>
              </div>
              <Switch
                checked={glass}
                label="Glass surfaces"
                onToggle={() => {
                  setGlass(!glass);
                  pushToast({
                    title: !glass ? "Glass surfaces on" : "Glass surfaces off",
                  });
                }}
              />
            </div>
            <div className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="text-sm text-ink">Desktop window</p>
                <p className="mt-0.5 text-xs text-ink-dim">
                  The whole window turns frosted glass over your desktop
                </p>
              </div>
              <Switch
                checked={windowGlass}
                label="Desktop window"
                onToggle={() => {
                  setWindowGlass(!windowGlass);
                  pushToast({
                    title: !windowGlass
                      ? "Desktop glass on"
                      : "Desktop glass off",
                  });
                }}
              />
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function SourcesModal() {
  const sourcesOpen = useUIStore((state) => state.sourcesOpen);
  const setSourcesOpen = useUIStore((state) => state.setSourcesOpen);

  const close = useCallback(() => setSourcesOpen(false), [setSourcesOpen]);

  return (
    <AnimatePresence>
      {sourcesOpen && <SourcesPanel key="sources-modal" onClose={close} />}
    </AnimatePresence>
  );
}
