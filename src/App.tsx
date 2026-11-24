import { lazy, Suspense, useEffect } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AnimatePresence, MotionConfig, motion } from "framer-motion";
import { MiniPlayerDock } from "./components/dock/MiniPlayerDock";
import { AmbientBackdrop } from "./components/shell/AmbientBackdrop";
import { AppShell } from "./components/shell/AppShell";
import CommandPalette from "./components/search/CommandPalette";
import SourcesModal from "./components/settings/SourcesModal";
import TitleDetailModal from "./components/detail/TitleDetailModal";
import { ErrorBoundary } from "./components/shared/ErrorBoundary";
import Toaster from "./components/shared/Toaster";
import { useAppStore } from "./store/useAppStore";
import { useAppearanceStore } from "./store/useAppearanceStore";
import { syncEmbedHosts } from "./services/embedHosts";
import { TmdbError } from "./services/tmdb";

// Route-level code splitting: each page becomes its own chunk, the shell stays eager for first paint identity.
const ContinueWatchingPage = lazy(() => import("./pages/ContinueWatchingPage"));
const HomePage = lazy(() => import("./pages/HomePage"));
const MoviesPage = lazy(() => import("./pages/MoviesPage"));
const MyListPage = lazy(() => import("./pages/MyListPage"));
const NewAndPopularPage = lazy(() => import("./pages/NewAndPopularPage"));
const SeriesPage = lazy(() => import("./pages/SeriesPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const WatchPage = lazy(() => import("./pages/WatchPage"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60_000,
      refetchOnWindowFocus: false,
      // only retry reachable API hiccups; code bugs surface immediately
      retry: (failureCount, error) => {
        if (error instanceof TmdbError && error.retryable && failureCount < 2) {
          return true;
        }
        return false;
      },
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 4000),
    },
  },
});

// Motion v2 token from DESIGN.md
const EASE: [number, number, number, number] = [0.4, 0, 0.2, 1];

// Honest cold-chunk fallback: one shimmer block sized like a content row, screen-reader text says Loading
function RouteFallback() {
  return (
    <div className="px-8 pt-6">
      <div className="shimmer h-56 w-full rounded-card" aria-hidden="true" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    // the shell owns scrolling, so reset its canvas instead of the window
    document.getElementById("canvas-scroll")?.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

// cryonex://watch/... links from the Nova assistant land here and become router navigations.
function DeepLinkHandler() {
  const navigate = useNavigate();
  useEffect(() => {
    const route = (url: unknown) => {
      try {
        const u = new URL(String(url));
        if (u.protocol !== "cryonex:") return;
        // Non-special schemes put the first segment in host: cryonex://watch/x/1 => host "watch", pathname "/x/1".
        const path = `${u.host ? `/${u.host}` : ""}${u.pathname}${u.search}`;
        if (path !== "/" && !path.startsWith("/watch/") && !/^\/(movies|series|new|my-list|continue)(\/|$)/.test(path)) return;
        void import("@tauri-apps/api/core").then(({ invoke }) => invoke("log_nav", { url: path })).catch(() => {});
        navigate(path);
      } catch { /* not a valid link; ignore */ }
    };
    let un: (() => void) | undefined;
    // pure web has no Tauri internals: every bridge call must stay silent there
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      import("@tauri-apps/plugin-deep-link")
        .then(({ getCurrent }) => void getCurrent().then(route))
        .catch(() => {});
      import("@tauri-apps/api/event")
        .then(({ listen }) =>
          listen("deep-link://new-url", (e) =>
            route((e as { payload?: unknown }).payload),
          ).then((f) => (un = f)),
        )
        .catch(() => {});
    }
    return () => un?.();
  }, [navigate]);
  return null;
}

function RoutedApp() {
  const location = useLocation();
  const providers = useAppStore((s) => s.providers);
  const windowGlass = useAppearanceStore((s) => s.windowGlass);
  const compatibilityMode = useAppearanceStore(
    (s) => s.compatibilityMode,
  );

  useEffect(() => {
    if (windowGlass) {
      document.documentElement.dataset.windowGlass = "true";
    } else {
      delete document.documentElement.dataset.windowGlass;
    }
  }, [windowGlass]);

  useEffect(() => {
    // compatibility mode kills the native blocker at the webview level;
    // pure web has no blocker, so the bridge call stays silent there
    if (typeof window !== "undefined" && "__TAURI_INTERNALS__" in window) {
      void import("@tauri-apps/api/core")
        .then(({ invoke }) =>
          invoke("set_adblock", { enabled: !compatibilityMode }),
        )
        .catch(() => {});
    }
  }, [compatibilityMode]);

  useEffect(() => {
    void syncEmbedHosts(
      providers.flatMap((provider) => [
        provider.movieTemplate,
        provider.tvTemplate,
      ]),
    );
  }, [providers]);

  return (
    <>
      <AmbientBackdrop />
      <ScrollToTop />
      <DeepLinkHandler />
      <AppShell>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={location.pathname}
            initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{
              opacity: 1,
              y: 0,
              filter: "blur(0px)",
              transition: { duration: 0.65, ease: EASE },
            }}
            exit={{
              opacity: 0,
              y: -16,
              filter: "blur(6px)",
              transition: { duration: 0.3, ease: EASE },
            }}
          >
            {/* keyed per route so a crashed page mounts a fresh boundary on the next navigation */}
            <ErrorBoundary key={location.pathname}>
              {/* Suspense inside the keyed motion div so route exits keep animating the committed old tree; the fallback shows only on cold chunk loads */}
              <Suspense fallback={<RouteFallback />}>
                <Routes location={location}>
                  <Route path="/" element={<HomePage />} />
                  <Route path="/new" element={<NewAndPopularPage />} />
                  <Route path="/series" element={<SeriesPage />} />
                  <Route path="/movies" element={<MoviesPage />} />
                  <Route path="/my-list" element={<MyListPage />} />
                  <Route
                    path="/continue"
                    element={<ContinueWatchingPage />}
                  />
                  <Route path="/settings" element={<SettingsPage />} />
                  <Route path="/watch/movie/:id" element={<WatchPage />} />
                  <Route path="/watch/tv/:id" element={<WatchPage />} />
                  <Route path="*" element={<Navigate to="/" replace />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </motion.div>
        </AnimatePresence>
      </AppShell>
      <MiniPlayerDock />
      <CommandPalette />
      <SourcesModal />
      <TitleDetailModal />
      <div className="grain" aria-hidden="true" />
      <Toaster />
    </>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <BrowserRouter>
          <RoutedApp />
        </BrowserRouter>
      </MotionConfig>
    </QueryClientProvider>
  );
}
