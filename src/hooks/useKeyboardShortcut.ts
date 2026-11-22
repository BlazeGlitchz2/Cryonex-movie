import { useEffect, useRef } from "react";

const isMac =
  typeof navigator !== "undefined" && navigator.userAgent.includes("Mac");

function isTextEntry(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) {
    return false;
  }
  return (
    target.tagName === "INPUT" ||
    target.tagName === "TEXTAREA" ||
    target.isContentEditable
  );
}

/**
 * Registers a global keydown shortcut. Supports "mod+k" (metaKey on mac,
 * ctrlKey elsewhere) and plain keys like "k" or "Escape". Plain keys are
 * ignored while typing in inputs and textareas; mod combos are not.
 */
export function useKeyboardShortcut(key: string, handler: () => void): void {
  // Latest-ref so a new closure every render does not rebind the listener.
  const handlerRef = useRef(handler);

  useEffect(() => {
    handlerRef.current = handler;
  });

  useEffect(() => {
    const modCombo = key.startsWith("mod+");
    const plainKey = modCombo ? key.slice("mod+".length) : key;

    const onKeyDown = (event: KeyboardEvent) => {
      if (modCombo) {
        const modPressed = isMac ? event.metaKey : event.ctrlKey;
        if (!modPressed || event.key.toLowerCase() !== plainKey.toLowerCase()) {
          return;
        }
        event.preventDefault();
      } else {
        if (isTextEntry(event.target) || event.key !== plainKey) {
          return;
        }
      }
      handlerRef.current();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [key]);
}
