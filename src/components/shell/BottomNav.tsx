import { motion } from "framer-motion";
import { Flame, Home, Plus, Search, Users } from "lucide-react";
import type { ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { useProfileStore } from "../../store/useProfileStore";
import { useUIStore } from "../../store/useUIStore";

// same slide object as the sidebar pill: one continuous active surface below lg
const ACTIVE_SPRING = { type: "spring", stiffness: 180, damping: 24 } as const;

const TAB_CLASS =
  "relative flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 outline-offset-0 transition-colors duration-250 ease-in-out";

function TabIcon({ active, children }: { active: boolean; children: ReactNode }) {
  return (
    <span
      aria-hidden="true"
      className={`relative flex flex-col items-center gap-1 ${
        active ? "text-ink" : "text-ink-dim"
      }`}
    >
      {children}
    </span>
  );
}

export function BottomNav() {
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);
  const setPickerOpen = useProfileStore((state) => state.setPickerOpen);

  return (
    <nav
      aria-label="Primary"
      className="material-dock dock-bottom fixed left-1/2 z-40 flex w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 items-stretch gap-1 rounded-[24px] p-1.5"
    >
      <NavLink
        to="/"
        end
        aria-label="Home"
        className={({ isActive }) =>
          `${TAB_CLASS} ${isActive ? "text-ink" : "text-ink-dim"}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="side-active"
                transition={ACTIVE_SPRING}
                className="absolute inset-0 rounded-2xl bg-white/[0.11]"
                aria-hidden="true"
              />
            )}
            <TabIcon active={isActive}>
              <Home size={20} />
              <span className="text-[10px] font-medium">Home</span>
            </TabIcon>
          </>
        )}
      </NavLink>

      <NavLink
        to="/new"
        aria-label="New and popular"
        className={({ isActive }) =>
          `${TAB_CLASS} ${isActive ? "text-ink" : "text-ink-dim"}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="side-active"
                transition={ACTIVE_SPRING}
                className="absolute inset-0 rounded-2xl bg-white/[0.11]"
                aria-hidden="true"
              />
            )}
            <TabIcon active={isActive}>
              <Flame size={20} />
              <span className="text-[10px] font-medium">New</span>
            </TabIcon>
          </>
        )}
      </NavLink>

      <NavLink
        to="/my-list"
        aria-label="My list"
        className={({ isActive }) =>
          `${TAB_CLASS} ${isActive ? "text-ink" : "text-ink-dim"}`
        }
      >
        {({ isActive }) => (
          <>
            {isActive && (
              <motion.span
                layoutId="side-active"
                transition={ACTIVE_SPRING}
                className="absolute inset-0 rounded-2xl bg-white/[0.11]"
                aria-hidden="true"
              />
            )}
            <TabIcon active={isActive}>
              <Plus size={20} />
              <span className="text-[10px] font-medium">My List</span>
            </TabIcon>
          </>
        )}
      </NavLink>

      <button
        type="button"
        onClick={() => setCommandOpen(true)}
        aria-label="Search"
        className={`${TAB_CLASS} text-ink-dim hover:text-ink`}
      >
        <TabIcon active={false}>
          <Search size={20} />
          <span className="text-[10px] font-medium">Search</span>
        </TabIcon>
      </button>

      <button
        type="button"
        onClick={() => setPickerOpen(true)}
        aria-label="Switch profile"
        className={`${TAB_CLASS} text-ink-dim hover:text-ink`}
      >
        <TabIcon active={false}>
          <Users size={20} />
          <span className="text-[10px] font-medium">Profile</span>
        </TabIcon>
      </button>
    </nav>
  );
}

export default BottomNav;
