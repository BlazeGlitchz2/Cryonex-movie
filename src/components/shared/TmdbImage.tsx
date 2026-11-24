import { Film } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { IMAGE_RETRY_DELAYS } from "../../services/imageRetry";
import { tmdbImageUrl } from "../../services/tmdb";

type TmdbSize = "w500" | "w780" | "w1280" | "original";

interface TmdbImageProps {
  path?: string | null;
  src?: string | null;
  size?: TmdbSize;
  alt?: string;
  className?: string;
  width?: number;
  height?: number;
  eager?: boolean;
  fetchPriority?: "high" | "low" | "auto";
}

export function TmdbImage({
  path,
  src,
  size = "w500",
  alt = "",
  className,
  width,
  height,
  fetchPriority,
}: TmdbImageProps) {
  // a poster that fails at a large size gets one more chance at w500:
  // the smallest file is the most likely to arrive on a weak network
  const [downgraded, setDowngraded] = useState(false);
  const base =
    src ?? (path ? tmdbImageUrl(path, downgraded ? "w500" : size) : null);
  const retryTimer = useRef<number | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  // every image loads immediately. The old viewport observer deferral
  // misbehaved inside the app webview: row art only appeared after a
  // hover transform jogged the scroller, then churned through the retry
  // ladder. Posters are small CDN files; eager beats clever here.
  useEffect(() => {
    return () => {
      if (retryTimer.current !== null) {
        window.clearTimeout(retryTimer.current);
      }
    };
  }, []);

  // a failed poster gets another chance when the network or the tab returns
  useEffect(() => {
    if (!failed) {
      return;
    }
    const revive = () => {
      setFailed(false);
      setAttempt(0);
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        revive();
      }
    };
    window.addEventListener("online", revive);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("online", revive);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [failed]);

  if (!base) {
    return null;
  }

  const resolved =
    attempt === 0
      ? base
      : `${base}${base.includes("?") ? "&" : "?"}retry=${attempt}`;

  if (failed) {
    // honest placeholder instead of an invisible frame: art failed, layout holds
    return (
      <div
        role="img"
        aria-label={alt}
        className={`grid place-items-center bg-surface-2 text-ink-dim ${className ?? ""}`}
        style={{
          aspectRatio:
            width !== undefined && height !== undefined
              ? `${width} / ${height}`
              : undefined,
        }}
      >
        <Film size={20} aria-hidden="true" />
      </div>
    );
  }

  return (
    <img
      src={resolved}
      alt={alt}
      width={width}
      height={height}
      fetchPriority={fetchPriority}
      decoding="async"
      draggable={false}
      onError={() => {
        if (attempt < IMAGE_RETRY_DELAYS.length && retryTimer.current === null) {
          retryTimer.current = window.setTimeout(() => {
            retryTimer.current = null;
            setAttempt((value) => value + 1);
          }, IMAGE_RETRY_DELAYS[attempt]);
          return;
        }
        // large sizes get one final chance at w500 before giving up
        if (
          !downgraded &&
          !src &&
          path &&
          size !== "w500" &&
          size !== "original"
        ) {
          setDowngraded(true);
          setAttempt(0);
          return;
        }
        setFailed(true);
      }}
      className={className}
    />
  );
}

export default TmdbImage;
