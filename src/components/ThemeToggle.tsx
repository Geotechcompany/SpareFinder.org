import React from "react";
import { Check, Columns2, Moon, Sun, Monitor } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useTheme } from "@/contexts/ThemeContext";
import { cn } from "@/lib/utils";
import { getThemeLabel } from "@/lib/theme";

const ThemeToggle = () => {
  const { theme, setTheme } = useTheme();

  const items: {
    value: typeof theme;
    icon: React.ReactNode;
    label: string;
    isDefault?: boolean;
  }[] = [
    {
      value: "split",
      icon: <Columns2 className="mr-2 h-4 w-4" />,
      label: getThemeLabel("split"),
      isDefault: true,
    },
    { value: "light", icon: <Sun className="mr-2 h-4 w-4" />, label: getThemeLabel("light") },
    { value: "dark", icon: <Moon className="mr-2 h-4 w-4" />, label: getThemeLabel("dark") },
    {
      value: "system",
      icon: <Monitor className="mr-2 h-4 w-4" />,
      label: getThemeLabel("system"),
    },
  ];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-9 w-9 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Toggle theme"
        >
          <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
          <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
          <span className="sr-only">Toggle theme</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="min-w-[11rem] border-border bg-popover text-foreground shadow-soft-elevated dark:border-gray-700 dark:bg-gray-900/95"
      >
        {items.map((item, index) => (
          <React.Fragment key={item.value}>
            {index === 1 ? <DropdownMenuSeparator /> : null}
            <DropdownMenuItem
              onClick={() => setTheme(item.value)}
              className={cn(
                "text-muted-foreground hover:text-foreground focus:text-foreground dark:text-gray-300 dark:hover:text-white dark:focus:text-white",
                theme === item.value && "bg-brand/10 text-foreground dark:bg-brand/20"
              )}
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.isDefault && theme !== item.value ? (
                <span className="ml-2 text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                  Default
                </span>
              ) : null}
              {theme === item.value ? (
                <Check className="ml-2 h-4 w-4 text-brand" aria-hidden />
              ) : null}
            </DropdownMenuItem>
          </React.Fragment>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ThemeToggle;
