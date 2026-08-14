import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();
  const nextTheme = theme === "dark" ? "light" : "dark";

  return (
    <button
      type="button"
      aria-label={`Switch to ${nextTheme} mode`}
      title={`Switch to ${nextTheme} mode`}
      className="theme-toggle"
      onClick={() => toggleTheme?.()}
    >
      {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
      <span className="theme-toggle-label">
        {theme === "dark" ? "Light" : "Dark"}
      </span>
    </button>
  );
}
