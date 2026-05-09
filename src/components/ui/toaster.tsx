import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"
import { AlertCircle, CheckCircle2, Info } from "lucide-react"

export function Toaster() {
  const { toasts } = useToast()

  return (
    <ToastProvider duration={4500}>
      {toasts.map(function ({ id, title, description, action, variant, ...props }) {
        const Icon =
          variant === "destructive"
            ? AlertCircle
            : variant === "success"
              ? CheckCircle2
              : Info
        const iconClass =
          variant === "destructive"
            ? "bg-white/15 text-white"
            : variant === "success"
              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
              : "bg-primary/10 text-primary"

        return (
          <Toast key={id} variant={variant} {...props}>
            <div className="flex shrink-0 pt-0.5 [&_svg]:h-5 [&_svg]:w-5" aria-hidden>
              <span className={cn("flex rounded-xl p-2", iconClass)}>
                <Icon />
              </span>
            </div>
            <div className="grid min-w-0 flex-1 gap-1 pt-0.5">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        )
      })}
      <ToastViewport />
    </ToastProvider>
  )
}
