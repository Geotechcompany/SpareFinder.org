import type { ComponentProps } from "react"
import { useTheme } from "@/contexts/ThemeContext"
import { Toaster as Sonner } from "sonner"

type ToasterProps = ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { actualTheme } = useTheme()

  return (
    <Sonner
      theme={actualTheme}
      position="bottom-right"
      offset={20}
      gap={12}
      expand={false}
      closeButton
      richColors
      toastOptions={{
        duration: 4500,
        classNames: {
          toast:
            "group toast !rounded-2xl !border !border-border/50 !bg-background/90 !p-4 !pr-10 !text-foreground !shadow-2xl !backdrop-blur-xl dark:!border-white/10 dark:!bg-zinc-950/90",
          title: "!text-[0.9375rem] !font-semibold !leading-snug",
          description: "!text-sm !leading-relaxed opacity-90",
          actionButton:
            "!h-9 !rounded-xl !bg-primary !px-4 !text-primary-foreground !text-sm !font-medium",
          cancelButton:
            "!h-9 !rounded-xl !border !border-border/80 !bg-transparent !px-4 !text-sm !font-medium dark:!border-white/15",
          closeButton:
            "!left-auto !right-2 !top-2 !h-8 !w-8 !rounded-full !border-0 !bg-transparent !text-foreground/50 hover:!bg-muted/80 hover:!text-foreground",
          error:
            "!border-red-500/25 !bg-red-600 !text-white dark:!bg-red-950/95",
          success:
            "!border-emerald-500/25 !bg-emerald-600 !text-white dark:!bg-emerald-950/95",
          warning: "!border-amber-500/25",
          info: "!border-primary/20",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
