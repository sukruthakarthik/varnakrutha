"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

type Theme = "light" | "dark";

/** Switches between the ivory gallery and "gallery at night"; the root layout re-applies the choice before paint. */
export function ThemeToggle() {
  // Unknown until mounted: the server can't see the stored choice.
  const [theme, setTheme] = useState<Theme | null>(null);

  useEffect(() => {
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    const root = document.documentElement;
    if (next === "dark") root.dataset.theme = "dark";
    else delete root.dataset.theme;
    try {
      localStorage.setItem("theme", next);
    } catch {
      // Private mode or blocked storage: the choice just won't persist.
    }
    setTheme(next);
  }

  const label = theme === "dark" ? "Switch to light gallery" : "Switch to gallery at night";
  return (
    <Button variant="ghost" size="icon" onClick={toggle} aria-label={label} title={label} className="rounded-full">
      {theme === "dark" ? <Sun /> : <Moon />}
    </Button>
  );
}
