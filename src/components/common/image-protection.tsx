"use client";

import { useEffect } from "react";

/**
 * Discourages saving artwork images: no right-click "Save image", no dragging images to the desktop.
 * (CSS in globals.css also blocks the long-press save menu on phones.)
 *
 * This is a deterrent, not protection. Anything a browser can display can still be captured with a
 * screenshot or the developer tools, so originals should be uploaded at web resolution only.
 */
export function ImageProtection() {
  useEffect(() => {
    const isImage = (target: EventTarget | null) =>
      target instanceof Element && Boolean(target.closest("img, picture, [data-protected-image]"));
    const block = (event: Event) => {
      if (isImage(event.target)) event.preventDefault();
    };
    document.addEventListener("contextmenu", block);
    document.addEventListener("dragstart", block);
    return () => {
      document.removeEventListener("contextmenu", block);
      document.removeEventListener("dragstart", block);
    };
  }, []);
  return null;
}
