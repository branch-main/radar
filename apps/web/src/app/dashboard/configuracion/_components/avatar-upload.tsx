"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

type AvatarUploadProps = {
  avatarUrl: string | null;
  alt: string;
  fallback: string;
};

export function AvatarUpload({ avatarUrl, alt, fallback }: AvatarUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  function clearSelection() {
    const input = inputRef.current;
    if (!input) return;

    input.value = "";
    setSelectedFileName(null);
    setPreviewUrl((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return null;
    });
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  }

  function openFileDialog() {
    inputRef.current?.click();
  }

  function updatePreview() {
    const file = inputRef.current?.files?.[0] ?? null;
    setSelectedFileName(file?.name ?? null);

    setPreviewUrl((currentPreview) => {
      if (currentPreview) URL.revokeObjectURL(currentPreview);
      return file ? URL.createObjectURL(file) : null;
    });
  }

  return (
    <div className="grid gap-4 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-start">
      <div className="grid justify-items-start gap-1.5 text-sm">
        <span>Avatar</span>
        <Avatar className="size-12">
          {(previewUrl || avatarUrl) && (
            <AvatarImage src={previewUrl ?? avatarUrl ?? undefined} alt={alt} />
          )}
          <AvatarFallback>{fallback}</AvatarFallback>
        </Avatar>
      </div>

      <div className="grid gap-1.5 text-sm sm:pt-[1.625rem]">
        <input
          ref={inputRef}
          name="avatar_file"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={updatePreview}
          className="hidden"
        />
        {selectedFileName ? (
          <div className="inline-flex min-w-0 max-w-full items-center gap-2">
            <button
              type="button"
              onClick={openFileDialog}
              title={selectedFileName}
              className="min-w-0 max-w-[calc(100%-1.75rem)] truncate text-left text-sm font-medium text-foreground underline underline-offset-2"
            >
              {selectedFileName}
            </button>
            <button
              type="button"
              onClick={clearSelection}
              aria-label="Quitar imagen seleccionada"
              className="inline-flex size-4 shrink-0 items-center justify-center text-destructive transition hover:text-destructive/80"
            >
              <X className="size-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={openFileDialog}
            className="w-fit text-sm font-medium text-primary hover:underline disabled:pointer-events-none disabled:opacity-50"
          >
            Haz clic para seleccionar una imagen
          </button>
        )}
        <span className="text-xs text-muted-foreground">
          Sube una imagen JPG, PNG o WebP de hasta 5 MB.
        </span>
      </div>
    </div>
  );
}
