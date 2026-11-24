import { motion } from "framer-motion";
import {
  Clock,
  Film,
  Flame,
  History,
  Home,
  Monitor,
  Plus,
  Search,
  Settings2,
  Users,
} from "lucide-react";
import type { ComponentType } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { useAppearanceStore } from "../../store/useAppearanceStore";
import { useProfileStore } from "../../store/useProfileStore";
import { useUIStore } from "../../store/useUIStore";

interface NavItem {
  to: string;
  label: string;
  icon: ComponentType<{ size?: number | string; className?: string }>;
}

const BROWSE: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/new", label: "New & Popular", icon: Flame },
  { to: "/series", label: "TV Shows", icon: Monitor },
  { to: "/movies", label: "Movies", icon: Film },
  { to: "/my-list", label: "My List", icon: Plus },
];

const LIBRARY: NavItem[] = [
  { to: "/continue", label: "Continue Watching", icon: History },
  { to: "/my-list?sort=recent", label: "Recently Added", icon: Clock },
];

function NavRow({ item }: { item: NavItem }) {
  const { search } = useLocation();
  const isRecent = item.to === "/my-list?sort=recent";
  // NavLink ignores query strings, so the two my-list rows split on search
  const rowActive = (isActive: boolean) =>
    isActive && (isRecent ? search === "?sort=recent" : search !== "?sort=recent");
  return (
    <NavLink
      to={item.to}
      end
      className={({ isActive }) =>
        `group relative flex min-h-11 items-center gap-3 rounded-full px-3.5 text-sm outline-offset-0 transition-colors duration-250 ease-in-out ${
          rowActive(isActive)
            ? "text-white"
            : "text-ink-dim hover:bg-white/[0.05] hover:text-ink"
        }`
      }
    >
      {({ isActive }) => {
        const active = rowActive(isActive);
        return (
          <>
            {active && (
              <motion.span
                layoutId="side-active"
                transition={{ type: "spring", stiffness: 180, damping: 24 }}
                className="absolute inset-0 rounded-full bg-white/[0.11]"
                aria-hidden="true"
              />
            )}
            <item.icon
              size={18}
              aria-hidden="true"
              className={`relative shrink-0 transition-colors duration-250 ease-in-out ${
                active ? "fill-current" : "group-hover:text-ink"
              }`}
            />
            <span className="relative truncate">{item.label}</span>
          </>
        );
      }}
    </NavLink>
  );
}

function GroupLabel({ children }: { children: string }) {
  return (
    <p className="px-3.5 pb-1 pt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-dim">
      {children}
    </p>
  );
}

export function Sidebar() {
  const setCommandOpen = useUIStore((state) => state.setCommandOpen);
  const setPickerOpen = useProfileStore((state) => state.setPickerOpen);
  const windowGlass = useAppearanceStore((state) => state.windowGlass);

  return (
    <aside className="material-sidebar flex h-full w-[230px] shrink-0 flex-col">
      <div className="px-5 pt-12">
        <NavLink
          to="/"
          className="flex items-center gap-2.5 font-display text-base font-extrabold tracking-[0.18em] text-ink"
        >
          <span
            aria-hidden="true"
            className="grid size-5 place-items-center rounded-ctl border border-hairline bg-surface-2 font-display text-[11px] font-bold text-ink"
          >
            C
          </span>
          CRYONEX
        </NavLink>
      </div>

      <div className="mt-6 px-3">
        <button
          type="button"
          onClick={() => setCommandOpen(true)}
          aria-label="Open search"
          className="flex min-h-11 w-full items-center gap-2.5 rounded-full bg-white/[0.07] px-3.5 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:bg-white/[0.1] hover:text-ink"
        >
          <Search size={16} aria-hidden="true" />
          <span className="flex-1 text-left">Search...</span>
          <span
            aria-hidden="true"
            className="rounded-ctl bg-white/[0.08] px-1.5 py-0.5 text-[11px]"
          >
            ⌘K
          </span>
        </button>
      </div>

      <nav className="mt-4 px-3" aria-label="Primary">
        <GroupLabel>Browse</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {BROWSE.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </div>
        <GroupLabel>Library</GroupLabel>
        <div className="flex flex-col gap-0.5">
          {LIBRARY.map((item) => (
            <NavRow key={item.label} item={item} />
          ))}
        </div>
        <div className="mx-0.5 my-3 h-px bg-hairline" aria-hidden="true" />
        <NavLink
          to="/settings"
          className={({ isActive }) =>
            `group relative flex min-h-11 items-center gap-3 rounded-full px-3.5 text-sm outline-offset-0 transition-colors duration-250 ease-in-out ${
              isActive
                ? "text-white"
                : "text-ink-dim hover:bg-white/[0.05] hover:text-ink"
            }`
          }
        >
          {({ isActive }) => (
            <>
              {isActive && (
                <motion.span
                  layoutId="side-active"
                  transition={{ type: "spring", stiffness: 180, damping: 24 }}
                  className="absolute inset-0 rounded-full bg-white/[0.11]"
                  aria-hidden="true"
                />
              )}
              <Settings2
                size={18}
                aria-hidden="true"
                className={`relative shrink-0 transition-colors duration-250 ease-in-out ${
                  isActive ? "fill-current" : "group-hover:text-ink"
                }`}
              />
              <span className="relative truncate">Settings</span>
            </>
          )}
        </NavLink>
      </nav>

      <div className="mt-auto px-5 pb-5">
        <p className="flex items-center gap-2 text-xs text-ink-dim">
          {windowGlass && (
            <span
              aria-hidden="true"
              className="size-1.5 shrink-0 rounded-full bg-emerald"
            />
          )}
          <span>
            Window:{" "}
            {windowGlass ? "desktop glass on" : "desktop glass off"}
          </span>
        </p>
        <button
          type="button"
          onClick={() => setPickerOpen(true)}
          className="mt-3 flex min-h-11 w-full items-center gap-3 rounded-full px-3.5 text-sm text-ink-dim transition-colors duration-250 ease-in-out hover:bg-white/[0.05] hover:text-ink"
        >
          <Users size={18} aria-hidden="true" className="shrink-0" />
          <span className="truncate">Switch profile</span>
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
