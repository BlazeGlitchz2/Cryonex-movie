import { AnimatePresence, motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Pencil, Plus, X } from "lucide-react";
import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
} from "react";
import { rehydrateForActiveProfile, switchProfile } from "../../services/profileStorage";
import {
  PROFILE_COLORS,
  PROFILE_HEX,
  profileInitial,
  profileInitialInk,
  useProfileStore,
  type ProfileColor,
} from "../../store/useProfileStore";
import { useToastStore } from "../../store/useToastStore";;

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const gridStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const tileRise: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: EASE } },
};

type Editing = { id: string } | "new" | null;

function ProfileEditor({
  initialName,
  initialColor,
  isNew,
  isLast,
  onSubmit,
  onDelete,
  onBack,
}: {
  initialName: string;
  initialColor: ProfileColor;
  isNew: boolean;
  isLast: boolean;
  onSubmit: (name: string, color: ProfileColor) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const formId = useId();
  const [name, setName] = useState(initialName);
  const [color, setColor] = useState<ProfileColor>(initialColor);
  const [touchedName, setTouchedName] = useState(false);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (!armed) {
      return;
    }
    // armed delete is destructive intent, it expires on its own
    const timer = setTimeout(() => setArmed(false), 4000);
    return () => clearTimeout(timer);
  }, [armed]);

  const trimmed = name.trim();
  const valid = trimmed.length > 0;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) {
      setTouchedName(true);
      return;
    }
    onSubmit(trimmed, color);
  };

  return (
    <form onSubmit={submit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={`${formId}-name`} className="block text-xs text-ink-dim">
          Name
        </label>
        <input
          id={`${formId}-name`}
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          onBlur={() => setTouchedName(true)}
          autoFocus
          placeholder={isNew ? "Example: Sara" : "Example: Hamza"}
          className="mt-1 w-full rounded-ctl border border-hairline bg-canvas px-3 py-2 text-sm text-ink placeholder:text-ink-dim"
        />
        {touchedName && !valid && (
          <p className="mt-1 text-xs text-ink">Name is required.</p>
        )}
      </div>
      <fieldset>
        <legend className="text-xs text-ink-dim">Tile color</legend>
        <div className="mt-2 flex items-center gap-2.5">
          {PROFILE_COLORS.map((entry) => (
            <button
              key={entry.id}
              type="button"
              aria-pressed={color === entry.id}
              aria-label={`Set tile color to ${entry.label}`}
              title={entry.label}
              onClick={() => setColor(entry.id)}
              className={`size-8 rounded-[10px] border-2 transition-colors duration-[250ms] ease-in-out ${
                color === entry.id
                  ? "border-white"
                  : "border-transparent hover:border-white/30"
              }`}
              style={{ backgroundColor: entry.hex }}
            />
          ))}
        </div>
      </fieldset>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="submit"
          disabled={!valid}
          className="rounded-ctl bg-accent px-3 py-2 text-sm font-medium text-canvas transition-colors duration-[250ms] ease-in-out disabled:opacity-40"
        >
          {isNew ? "Add profile" : "Save"}
        </button>
        {!isNew && (
          <button
            type="button"
            disabled={isLast}
            title={isLast ? "The last profile cannot be deleted." : undefined}
            aria-label={armed ? "Confirm delete profile" : "Delete profile"}
            onClick={() => {
              if (isLast) {
                return;
              }
              if (armed) {
                onDelete();
                return;
              }
              setArmed(true);
            }}
            className={`rounded-ctl border px-3 py-2 text-sm transition-colors duration-[250ms] ease-in-out disabled:cursor-not-allowed disabled:opacity-40 ${
              armed
                ? "border-red-400/40 text-red-400"
                : "border-hairline text-ink-dim hover:bg-surface-2 hover:text-ink"
            }`}
          >
            {armed ? "Confirm delete" : "Delete profile"}
          </button>
        )}
        <button
          type="button"
          onClick={onBack}
          className="rounded-ctl border border-hairline px-3 py-2 text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out hover:bg-surface-2"
        >
          Back
        </button>
      </div>
      {!isNew && isLast && (
        <p className="text-xs text-ink-dim">
          The last profile cannot be deleted.
        </p>
      )}
    </form>
  );
}

function ManageProfilesPanel({ onClose }: { onClose: () => void }) {
  const panelRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const profiles = useProfileStore((state) => state.profiles);
  const addProfile = useProfileStore((state) => state.addProfile);
  const renameProfile = useProfileStore((state) => state.renameProfile);
  const setProfileColor = useProfileStore((state) => state.setProfileColor);
  const deleteProfile = useProfileStore((state) => state.deleteProfile);
  const pushToast = useToastStore((state) => state.pushToast);

  const [editing, setEditing] = useState<Editing>(null);

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

  const editingProfile =
    editing !== null && editing !== "new"
      ? profiles.find((profile) => profile.id === editing.id) ?? null
      : null;

  const isNew = editing === "new";

  // keep keyboard focus inside the dialog after every view switch
  const finishEditing = () => {
    setEditing(null);
    closeRef.current?.focus();
  };

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-md"
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
        aria-label="Manage profiles"
        className="flex max-h-[80vh] w-[560px] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-[24px] material-modal"
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{
          opacity: 1,
          // 2% overshoot on settle, one gentle keyframe pass, no bounce
          scale: [0.96, 1.008, 1],
          transition: { duration: 0.55, ease: EASE, times: [0, 0.7, 1] },
        }}
        exit={{
          opacity: 0,
          scale: 0.96,
          transition: { duration: 0.3, ease: EASE },
        }}
        onKeyDown={onPanelKeyDown}
      >
        <div className="flex items-start justify-between gap-3 border-b border-hairline px-5 pb-4 pt-5">
          <div>
            <h2 className="font-display text-lg text-ink">
              {editing === null
                ? "Manage profiles"
                : isNew
                  ? "Add profile"
                  : "Edit profile"}
            </h2>
            {editing === null && (
              <p className="mt-1 max-w-90 text-sm text-ink-dim">
                Each profile keeps its own watchlist, continue watching,
                search history and servers.
              </p>
            )}
          </div>
          <button
            ref={closeRef}
            type="button"
            autoFocus
            aria-label="Close manage profiles"
            onClick={onClose}
            className="rounded-ctl p-1.5 text-ink-dim transition-colors duration-[250ms] ease-in-out hover:bg-surface-2 hover:text-ink"
          >
            <X size={16} aria-hidden="true" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-5">
          <AnimatePresence mode="wait" initial={false}>
            {editing === null ? (
              <motion.div
                key="grid"
                variants={gridStagger}
                initial="hidden"
                animate="show"
                exit={{
                  opacity: 0,
                  y: -8,
                  transition: { duration: 0.25, ease: EASE },
                }}
                className="flex flex-wrap gap-x-6 gap-y-6 pt-5"
              >
                {profiles.map((profile) => (
                  <motion.button
                    key={profile.id}
                    variants={tileRise}
                    type="button"
                    aria-label={`Edit ${profile.name}`}
                    onClick={() => setEditing({ id: profile.id })}
                    className="group flex w-[120px] flex-col items-center gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="relative grid size-[120px] place-items-center overflow-hidden rounded-[12px] font-display text-4xl font-bold"
                      style={{
                        backgroundColor: PROFILE_HEX[profile.color],
                        color: profileInitialInk(profile.color),
                      }}
                    >
                      {profileInitial(profile.name)}
                      <span className="absolute inset-0 grid place-items-center bg-black/40 opacity-0 transition-opacity duration-[250ms] ease-in-out group-hover:opacity-100">
                        <Pencil size={22} aria-hidden="true" />
                      </span>
                    </span>
                    <span className="text-sm text-ink">{profile.name}</span>
                  </motion.button>
                ))}
                <motion.button
                  key="add-profile"
                  variants={tileRise}
                  type="button"
                  onClick={() => setEditing("new")}
                  className="group flex w-[120px] flex-col items-center gap-3"
                >
                  <span
                    aria-hidden="true"
                    className="grid size-[120px] place-items-center rounded-[12px] border-2 border-dashed border-white/25 text-ink-dim transition-colors duration-[250ms] ease-in-out group-hover:border-white/60 group-hover:text-ink"
                  >
                    <Plus size={28} aria-hidden="true" />
                  </span>
                  <span className="text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out group-hover:text-ink">
                    Add profile
                  </span>
                </motion.button>
              </motion.div>
            ) : (
              <motion.div
                key="editor"
                initial={{ opacity: 0, y: 8 }}
                animate={{
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.35, ease: EASE },
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                  transition: { duration: 0.25, ease: EASE },
                }}
                className="pt-5"
              >
                <ProfileEditor
                  initialName={editingProfile?.name ?? ""}
                  initialColor={editingProfile?.color ?? "crimson"}
                  isNew={isNew}
                  isLast={profiles.length <= 1}
                  onBack={finishEditing}
                  onSubmit={(name, color) => {
                    if (editingProfile) {
                      renameProfile(editingProfile.id, name);
                      setProfileColor(editingProfile.id, color);
                    } else {
                      // the very first profile drops straight into the app:
                      // there is nobody else it could be watching for
                      const isFirst = profiles.length === 0;
                      const newId = addProfile(name, color);
                      if (isFirst) {
                        switchProfile(newId);
                        useProfileStore.getState().setManageOpen(false);
                        pushToast({ title: `Watching as ${name}` });
                      } else {
                        pushToast({ title: "Profile added", tone: "success" });
                      }
                    }
                    finishEditing();
                  }}
                  onDelete={() => {
                    if (!editingProfile) {
                      return;
                    }
                    const deletedId = editingProfile.id;
                    const wasActive =
                      useProfileStore.getState().activeProfileId === deletedId;
                    deleteProfile(deletedId);
                    if (wasActive) {
                      rehydrateForActiveProfile();
                    }
                    pushToast({ title: "Profile deleted" });
                    finishEditing();
                  }}
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  );
}

export default function ManageProfilesModal() {
  const manageOpen = useProfileStore((state) => state.manageOpen);
  const setManageOpen = useProfileStore((state) => state.setManageOpen);

  return (
    <AnimatePresence>
      {manageOpen && (
        <ManageProfilesPanel
          key="manage-profiles"
          onClose={() => setManageOpen(false)}
        />
      )}
    </AnimatePresence>
  );
}
