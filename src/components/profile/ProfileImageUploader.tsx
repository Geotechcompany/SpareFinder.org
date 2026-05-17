import React, { useRef, useState } from "react";
import { Camera, Loader2, Trash2 } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileImageUploaderProps = {
  imageUrl?: string | null;
  fallbackLabel?: string;
  onUpload: (file: File) => Promise<string | null>;
  onRemove?: () => Promise<void>;
  disabled?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizeClasses = {
  sm: "h-14 w-14",
  md: "h-20 w-20",
  lg: "h-24 w-24",
};

export function ProfileImageUploader({
  imageUrl,
  fallbackLabel = "?",
  onUpload,
  onRemove,
  disabled = false,
  size = "md",
  className,
}: ProfileImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleFile = async (file: File | null) => {
    if (!file || disabled) return;
    setIsUploading(true);
    try {
      await onUpload(file);
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const initials = fallbackLabel.trim().slice(0, 2).toUpperCase() || "?";

  return (
    <div className={cn("flex items-center gap-4", className)}>
      <div className="relative">
        <Avatar className={cn(sizeClasses[size], "ring-2 ring-border/60")}>
          <AvatarImage src={imageUrl || undefined} alt="" />
          <AvatarFallback className="bg-gradient-to-br from-brand to-brand-dark text-sm font-semibold text-white">
            {initials}
          </AvatarFallback>
        </Avatar>
        <button
          type="button"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
          className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-background bg-brand text-white shadow-md transition hover:bg-brand-dark disabled:opacity-50"
          aria-label="Upload photo"
        >
          {isUploading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Camera className="h-4 w-4" />
          )}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
        />
      </div>
      <div className="flex flex-col gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled || isUploading}
          onClick={() => inputRef.current?.click()}
        >
          {isUploading ? "Uploading…" : "Upload photo"}
        </Button>
        {imageUrl && onRemove ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-destructive"
            disabled={disabled || isUploading}
            onClick={() => void onRemove()}
          >
            <Trash2 className="mr-1.5 h-3.5 w-3.5" />
            Remove
          </Button>
        ) : null}
        <p className="text-xs text-muted-foreground">JPEG, PNG, or WebP · max 4 MB</p>
      </div>
    </div>
  );
}
