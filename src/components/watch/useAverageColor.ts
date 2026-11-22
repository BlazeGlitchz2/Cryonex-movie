import { useEffect, useState } from "react";
import { FastAverageColor } from "fast-average-color";

const fac = new FastAverageColor();

async function averageColor(url: string): Promise<string | null> {
  const result = await fac.getColorAsync(url, {
    silent: true,
    crossOrigin: "anonymous",
    defaultColor: [7, 8, 10, 1],
  });
  return result.error ? null : result.hex;
}

export function useAverageColor(url: string | null): string | null {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!url) {
      setColor(null);
      return;
    }
    averageColor(url)
      .then((hex) => {
        if (!cancelled) {
          setColor(hex);
        }
      })
      .catch(() => {
        // ambient spill is decorative, a failed read is skipped silently
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return color;
}
