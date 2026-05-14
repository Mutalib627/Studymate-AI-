import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";

export const ThemeToggle = () => {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" || "light";
    setTheme(savedTheme);
    document.documentElement.classList.toggle("dark", savedTheme === "dark");
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    localStorage.setItem("theme", newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
  };

  return (
    <Button
      variant="outline"
      size="icon"
      onClick={toggleTheme}
      className="rounded-xl border-2 hover:bg-muted transition-all h-10 w-10"
      title={theme === "light" ? "Dark Mode" : "Light Mode"}
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5" strokeWidth={2.5} />
      ) : (
        <Sun className="h-5 w-5" strokeWidth={2.5} />
      )}
    </Button>
  );
};