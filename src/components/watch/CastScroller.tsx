import { motion } from "framer-motion";
import type { CastMember } from "../../types/media";
import TmdbImage from "../shared/TmdbImage";

const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

export default function CastScroller({ cast }: { cast: CastMember[] }) {
  return (
    <div className="flex gap-4 overflow-x-auto overflow-y-hidden overscroll-x-contain pb-3">
      {cast.map((member) => (
        <motion.figure
          key={member.id}
          className="group w-24 shrink-0 text-center"
          initial="rest"
          animate="rest"
          whileHover="hover"
        >
          <motion.div
            variants={{ rest: { scale: 1 }, hover: { scale: 1.08 } }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            {member.profilePath ? (
              <TmdbImage
                path={member.profilePath}
                size="w500"
                alt=""
                width={96}
                height={96}
                className="h-24 w-24 rounded-full border border-hairline object-cover"
              />
            ) : (
              <div
                aria-hidden="true"
                className="flex h-24 w-24 items-center justify-center rounded-full border border-hairline bg-surface-2 font-display text-2xl text-ink-dim"
              >
                {member.name.charAt(0).toUpperCase()}
              </div>
            )}
          </motion.div>
          <figcaption className="mt-2">
            <p className="line-clamp-2 text-xs font-medium text-ink transition-colors duration-[350ms] ease-in-out group-hover:text-white">
              {member.name}
            </p>
            {member.character && (
              <span className="material-card mt-0.5 block truncate rounded-full px-2 py-0.5 text-[11px] text-ink-dim">
                {member.character}
              </span>
            )}
          </figcaption>
        </motion.figure>
      ))}
    </div>
  );
}
