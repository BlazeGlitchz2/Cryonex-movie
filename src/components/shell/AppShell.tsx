import { AnimatePresence } from "framer-motion";
import { useSyncExternalStore } from "react";
import type { ReactNode } from "react";
import ManageProfilesModal from "../profile/ManageProfilesModal";
import { WhoIsWatchingGate } from "../profile/WhoIsWatchingGate";
import { useProfileStore } from "../../store/useProfileStore";
import { BottomNav } from "./BottomNav";
import { Sidebar } from "./Sidebar";
import { TopBar } from "./TopBar";

const DESKTOP_QUERY = window.matchMedia("(min-width: 1024px)");

function subscribeDesktop(onChange: () => void) {
  DESKTOP_QUERY.addEventListener("change", onChange);
  return () => DESKTOP_QUERY.removeEventListener("change", onChange);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pickerOpen = useProfileStore((state) => state.pickerOpen);
  // one nav surface at a time: both share layoutId "side-active", so they must never mount together
  const isDesktop = useSyncExternalStore(subscribeDesktop, () => DESKTOP_QUERY.matches);

  // dvh keeps the bottom nav clear of mobile browser chrome; vh fallback for old WebKit
  return (
    <div className="flex h-screen overflow-hidden [@supports(height:100dvh)]:h-dvh">
      {isDesktop && <Sidebar />}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopBar />
        <main
          id="canvas-scroll"
          // bottom clearance keeps the floating dock off the last row; mobile clears the nav too
          className="min-h-0 flex-1 overflow-y-auto pb-24 max-lg:pb-canvas-safe"
        >
          {children}
        </main>
      </div>
      {!isDesktop && <BottomNav />}
      <AnimatePresence>
        {pickerOpen && <WhoIsWatchingGate key="who-is-watching" />}
      </AnimatePresence>
      <ManageProfilesModal />
    </div>
  );
}

export default AppShell;
