import { motion } from "framer-motion";
import type { Variants } from "framer-motion";
import { Plus, Users, UserRound } from "lucide-react";
import { useEffect } from "react";
import { switchProfile } from "../../services/profileStorage";
import {
  GUEST_ID,
  PROFILE_HEX,
  profileInitial,
  profileInitialInk,
  useProfileStore,
} from "../../store/useProfileStore";
import { useToastStore } from "../../store/useToastStore";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

const tileStagger: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

const tileRise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE } },
};

export function WhoIsWatchingGate() {
  const profiles = useProfileStore((state) => state.profiles);
  const setManageOpen = useProfileStore((state) => state.setManageOpen);
  const ensureGuestProfile = useProfileStore(
    (state) => state.ensureGuestProfile,
  );
  const pushToast = useToastStore((state) => state.pushToast);

  useEffect(() => {
    // the gate owns the screen, so lock the canvas scroller like the modals do
    const canvas = document.getElementById("canvas-scroll");
    const previousOverflow = canvas?.style.overflow ?? "";
    if (canvas) {
      canvas.style.overflow = "hidden";
    }
    return () => {
      if (canvas) {
        canvas.style.overflow = previousOverflow;
      }
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-[45] flex overflow-y-auto bg-canvas px-6 py-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, transition: { duration: 0.3, ease: EASE } }}
      transition={{ duration: 0.45, ease: EASE }}
    >
      <div className="m-auto flex flex-col items-center">
      <h1 className="font-display text-2xl font-bold text-ink">
        Who&apos;s watching?
      </h1>
      {profiles.length === 0 && (
        <p className="mt-2 text-sm text-ink-dim">
          Create a profile to make this cinema yours
        </p>
      )}
      <motion.div
        variants={tileStagger}
        initial="hidden"
        animate="show"
        className="mt-10 flex flex-wrap items-start justify-center gap-8"
      >
        {profiles.length === 0 ? (
          <motion.button
            variants={tileRise}
            whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE } }}
            whileTap={{ scale: 0.96, transition: { duration: 0.25, ease: EASE } }}
            type="button"
            autoFocus
            onClick={() => setManageOpen(true)}
            className="group flex w-[120px] flex-col items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="grid size-[120px] place-items-center rounded-[12px] border-2 border-dashed border-white/25 text-ink-dim transition-colors duration-[250ms] ease-in-out group-hover:border-white/60 group-hover:text-ink"
            >
              <Plus size={28} aria-hidden="true" />
            </span>
            <span className="text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out group-hover:text-ink">
              Create profile
            </span>
          </motion.button>
        ) : (
          profiles.map((profile, index) => (
          <motion.button
            key={profile.id}
            variants={tileRise}
            whileHover={{ y: -4, transition: { duration: 0.25, ease: EASE } }}
            whileTap={{ scale: 0.96, transition: { duration: 0.25, ease: EASE } }}
            type="button"
            autoFocus={index === 0}
            onClick={() => {
              switchProfile(profile.id);
              pushToast({ title: `Watching as ${profile.name}` });
            }}
            className="group flex w-[120px] flex-col items-center gap-3"
          >
            <span
              aria-hidden="true"
              className="grid size-[120px] place-items-center rounded-[12px] border-2 border-transparent font-display text-4xl font-bold transition-colors duration-[250ms] ease-in-out group-hover:border-white"
              style={{
                backgroundColor: PROFILE_HEX[profile.color],
                color: profileInitialInk(profile.color),
              }}
            >
              {profileInitial(profile.name)}
            </span>
            <span className="text-sm text-ink">{profile.name}</span>
          </motion.button>
          ))
        )}
      </motion.div>
      {profiles.length > 0 && (
        <button
          type="button"
          onClick={() => setManageOpen(true)}
          className="mt-12 flex items-center gap-2 text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out hover:text-ink"
        >
          <Users size={16} aria-hidden="true" />
          Manage profiles
        </button>
      )}
      <button
        type="button"
        onClick={() => {
          ensureGuestProfile();
          switchProfile(GUEST_ID);
          pushToast({ title: "Watching as Guest" });
        }}
        className="mt-5 flex items-center gap-2 text-sm text-ink-dim transition-colors duration-[250ms] ease-in-out hover:text-ink"
      >
        <UserRound size={16} aria-hidden="true" />
        Continue as guest
      </button>
      </div>
    </motion.div>
  );
}

export default WhoIsWatchingGate;
