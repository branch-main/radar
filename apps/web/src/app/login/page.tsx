import { Radar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { PasswordInput } from "@/components/password-input";
import { SubmitButton } from "@/components/submit-button";
import { login, loginWithGoogle } from "./actions";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="flex min-h-screen">
      {/* Left: dark brand panel with radar visualization */}
      <div className="relative hidden w-1/2 overflow-hidden bg-[#091520] lg:block">
        {/* Radial glow behind circles */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(0,179,224,0.18)_0%,transparent_55%)]" />

        {/* Concentric radar rings */}
        <div className="absolute inset-0 flex items-center justify-center -translate-y-[10%]">
          <div className="relative size-95">
            <div className="absolute inset-0 rounded-full border border-primary/6" />
            <div className="absolute inset-9.5 rounded-full border border-primary/9" />
            <div className="absolute inset-19 rounded-full border border-primary/[0.14]" />
            <div className="absolute inset-28.5 rounded-full border border-primary/22" />
            <div className="absolute inset-38 rounded-full border border-primary/32" />

            {/* Cross-hairs */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-full w-px bg-linear-to-b from-transparent via-primary/8 to-transparent" />
            </div>
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="h-px w-full bg-linear-to-r from-transparent via-primary/8 to-transparent" />
            </div>

            {/* Rotating sweep beam */}
            <div
              className="absolute inset-0 animate-[radar-sweep_5s_linear_infinite] rounded-full"
              style={{
                background:
                  "conic-gradient(from 0deg at 50% 50%, transparent 0deg, rgba(0,179,224,0.12) 25deg, transparent 60deg)",
              }}
            />

            {/* Center ping */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="size-2.5 rounded-full bg-primary shadow-[0_0_30px_10px_rgba(0,179,224,0.4)]" />
              <div className="absolute size-2.5 animate-[radar-ping_3s_ease-out_infinite] rounded-full bg-primary/70" />
            </div>
          </div>
        </div>

        {/* Brand text overlay */}
        <div className="relative z-10 flex h-full flex-col justify-end px-12 py-10">
          <div className="mb-4">
            <p className="text-xs font-semibold tracking-[0.25em] uppercase text-primary">
              Panel de administración
            </p>
            <h1 className="mt-3 text-[1.75rem] font-light leading-snug tracking-tight text-white">
              Gestión centralizada
              <br />
              <span className="text-white/40">del campus universitario</span>
            </h1>
            <p className="mt-5 max-w-55 text-[13px] leading-relaxed text-white/25">
              Monitoreo, mantenimiento y control en un solo lugar.
            </p>
          </div>
        </div>
      </div>

      {/* Right: login form */}
      <div className="flex flex-1 flex-col px-6 lg:px-12">
        <div className="flex items-center gap-2.5 py-10">
          <Radar className="size-5 text-primary" />
          <span className="text-sm font-semibold tracking-[0.15em] uppercase text-foreground">
            Radar
          </span>
        </div>

        <div className="flex flex-1 items-center justify-center">
          <div className="w-full max-w-95">
            <h2 className="text-[1.75rem] font-semibold tracking-tight">
              Iniciar sesión
            </h2>
            <p className="mt-1.5 mb-10 text-sm text-muted-foreground">
              Ingresa tus credenciales para continuar
            </p>

            <form action={login} className="grid gap-6">
              {error && (
                <div className="rounded-xl border border-destructive/50 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
                  {error}
                </div>
              )}

              <div className="grid gap-2">
                <Label htmlFor="email" className="text-sm font-medium">
                  Correo electrónico
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="tu@correo.com"
                  required
                  autoComplete="email"
                  autoFocus
                  className="h-12 rounded-xl border-transparent bg-secondary placeholder:text-muted-foreground/50 focus:border-primary/30"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="password" className="text-sm font-medium">
                  Contraseña
                </Label>
                <PasswordInput />
              </div>

              <SubmitButton className="mt-1 h-12 w-full rounded-xl">
                Ingresar
              </SubmitButton>
            </form>

            <div className="mt-6 flex items-center gap-3">
              <div className="h-px flex-1 bg-border" />
              <span className="text-xs text-muted-foreground">O</span>
              <div className="h-px flex-1 bg-border" />
            </div>

            <form action={loginWithGoogle} className="mt-6">
              <Button
                type="submit"
                variant="outline"
                size="lg"
                className="h-12 w-full rounded-xl"
              >
                <svg
                  viewBox="0 0 24 24"
                  className="mr-2 size-5"
                  aria-hidden="true"
                >
                  <path
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                    fill="#4285F4"
                  />
                  <path
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    fill="#34A853"
                  />
                  <path
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    fill="#FBBC05"
                  />
                  <path
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    fill="#EA4335"
                  />
                </svg>
                Google
              </Button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
