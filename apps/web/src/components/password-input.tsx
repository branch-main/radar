"use client";

import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { Input } from "@/components/ui/input";

export function PasswordInput() {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        id="password"
        name="password"
        type={visible ? "text" : "password"}
        placeholder="Ingresa tu contraseña"
        required
        autoComplete="current-password"
        className="h-12 rounded-xl border-transparent bg-secondary pr-11 placeholder:text-muted-foreground/50 focus:border-primary/30"
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground/60 hover:text-muted-foreground transition-colors"
      >
        {visible ? (
          <EyeOff className="size-4.5" />
        ) : (
          <Eye className="size-4.5" />
        )}
      </button>
    </div>
  );
}
