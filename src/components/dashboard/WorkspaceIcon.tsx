import { Building2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

type WorkspaceIconProps = {
  name?: string;
  imageUrl?: string | null;
  className?: string;
};

export function WorkspaceIcon({ name, imageUrl, className }: WorkspaceIconProps) {
  const initials = (name || "?").slice(0, 2).toUpperCase();

  if (imageUrl) {
    return (
      <Avatar className={cn("h-8 w-8 shrink-0 rounded-md", className)}>
        <AvatarImage src={imageUrl} alt="" className="object-cover" />
        <AvatarFallback className="rounded-md bg-muted text-xs font-bold uppercase">
          {initials}
        </AvatarFallback>
      </Avatar>
    );
  }

  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-gradient-to-br from-brand to-brand-dark text-white shadow-sm",
        className
      )}
    >
      <Building2 className="h-4 w-4" strokeWidth={2.25} />
    </span>
  );
}
