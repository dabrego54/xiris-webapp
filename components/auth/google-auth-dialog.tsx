"use client"

import { useMemo, useState, useTransition } from "react"
import { Loader2, ShieldCheck, User, Wrench } from "lucide-react"
import { toast } from "sonner"

import { signInWithGoogle } from "@/app/actions/auth.actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { RadioGroup } from "@/components/ui/radio-group"
import { cn } from "@/lib/utils"
import type { UserType } from "@/types/database.types"
import * as RadioGroupPrimitive from "@radix-ui/react-radio-group"

interface GoogleAuthDialogProps {
  flow: "login" | "register"
  redirectTo?: string
  brandGradientClassName?: string
  className?: string
}

export function GoogleAuthDialog({
  flow,
  redirectTo,
  brandGradientClassName,
  className,
}: GoogleAuthDialogProps): JSX.Element {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [userType, setUserType] = useState<UserType>("cliente")

  const description =
    flow === "register"
      ? "Selecciona el tipo de usuario con el que deseas crear tu cuenta."
      : "Elige cómo deseas ingresar para que podamos mostrarte la experiencia adecuada."

  const googleIcon = useMemo(
    () => (
      <svg aria-hidden className="h-5 w-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path
          d="M12.24 10.8v3.84h5.36c-.22 1.23-.96 2.27-2.06 2.97l3.33 2.58c1.95-1.8 3.07-4.44 3.07-7.59 0-.73-.07-1.44-.2-2.12z"
          fill="#4285F4"
        />
        <path
          d="M6.7 14.32l-.84.64-2.64 2.05C4.93 20.5 8.31 22.8 12.24 22.8c2.94 0 5.4-.97 7.2-2.61l-3.33-2.58c-.9.6-2.06.96-3.87.96-2.97 0-5.49-1.98-6.4-4.74z"
          fill="#34A853"
        />
        <path
          d="M3.22 6.99A10.5 10.5 0 0 0 1.44 12c0 1.86.48 3.61 1.32 5.13 0 .04 3.94-3.05 3.94-3.05-.24-.72-.38-1.49-.38-2.3 0-.8.14-1.57.38-2.29z"
          fill="#FBBC05"
        />
        <path
          d="M12.24 5.4c1.61 0 3.05.56 4.19 1.64l3.12-3.11C17.62 1.7 15.18.6 12.24.6 8.31.6 4.93 2.91 3.22 6.99l3.94 3.06c.91-2.76 3.43-4.65 6.4-4.65z"
          fill="#EA4335"
        />
      </svg>
    ),
    []
  )

  const handleContinue = () => {
    startTransition(async () => {
      const { data, error } = await signInWithGoogle({
        flow,
        userType,
        redirectTo,
      })

      if (error || !data) {
        toast.error(error ?? "No pudimos conectar con Google. Inténtalo más tarde.")
        return
      }

      toast.dismiss()
      setOpen(false)
      window.location.href = data
    })
  }

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => (!isPending ? setOpen(nextOpen) : undefined)}>
      <DialogTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "h-12 w-full border-slate-200 bg-white text-slate-700 shadow-[0_14px_30px_rgba(15,23,42,0.08)] transition hover:bg-slate-50",
            className
          )}
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 aria-hidden className="mr-3 h-4 w-4 animate-spin" />
          ) : (
            <span className="mr-3 flex items-center justify-center">{googleIcon}</span>
          )}
          Continuar con Google
        </Button>
      </DialogTrigger>

      <DialogContent aria-describedby={undefined} className="max-w-xl p-10">
        <DialogHeader className="space-y-3">
          <DialogTitle className="text-2xl font-semibold text-slate-900">
            {flow === "register" ? "Crea tu cuenta con Google" : "Inicia sesión con Google"}
          </DialogTitle>
          <DialogDescription className="text-base text-slate-500">{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <span className="text-sm font-medium text-slate-700">Selecciona tu tipo de usuario</span>
          <RadioGroup
            aria-label="Tipo de usuario"
            className="grid gap-3 sm:grid-cols-2"
            value={userType}
            onValueChange={(value) => setUserType(value as UserType)}
          >
            <UserTypeOption
              description="Solicita servicios técnicos"
              icon={<User className="h-5 w-5 text-[#8B5CF6]" />}
              title="Cliente"
              value="cliente"
              isSelected={userType === "cliente"}
            />
            <UserTypeOption
              description="Ofrece servicios técnicos"
              icon={<Wrench className="h-5 w-5 text-[#8B5CF6]" />}
              title="Técnico"
              value="tecnico"
              isSelected={userType === "tecnico"}
            />
          </RadioGroup>
        </div>

        {userType === "tecnico" ? (
          <div className="flex items-center gap-3 rounded-2xl border border-[#8B5CF6]/20 bg-[#F5F3FF] p-4 text-sm text-slate-600">
            <ShieldCheck className="h-5 w-5 text-[#8B5CF6]" aria-hidden />
            <p>
              Como técnico registraremos tu cuenta con las preferencias adecuadas para ofrecer servicios y podremos solicitar datos
              adicionales más adelante.
            </p>
          </div>
        ) : null}

        <DialogFooter className="mt-4">
          <Button
            type="button"
            onClick={handleContinue}
            className={cn(
              "h-12 w-full text-base font-semibold",
              brandGradientClassName ??
                "bg-gradient-to-r from-[#8B5CF6] via-[#7C3AED] to-[#5B21B6] text-white shadow-[0_20px_45px_rgba(88,28,135,0.25)]"
            )}
            disabled={isPending}
          >
            {isPending ? <Loader2 aria-hidden className="mr-2 h-4 w-4 animate-spin" /> : null}
            Continuar con Google
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface UserTypeOptionProps {
  value: UserType
  title: string
  description: string
  icon: React.ReactNode
  isSelected: boolean
}

function UserTypeOption({ value, title, description, icon, isSelected }: UserTypeOptionProps): JSX.Element {
  return (
    <RadioGroupPrimitive.Item value={value} asChild>
      <Label
        className={cn(
          "relative flex cursor-pointer flex-col gap-2 rounded-2xl border border-slate-200 bg-white p-5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5CF6]/60 focus-visible:ring-offset-2",
          "hover:border-[#8B5CF6]/50 hover:shadow-[0_18px_45px_rgba(99,102,241,0.15)]",
          isSelected && "border-[#8B5CF6] shadow-[0_20px_50px_rgba(99,102,241,0.18)]"
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 text-slate-900">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#8B5CF6]/10">{icon}</span>
            <span className="text-base font-semibold">{title}</span>
          </div>
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-[#8B5CF6] bg-white">
            <RadioGroupPrimitive.Indicator className={cn("h-3 w-3 rounded-full bg-[#8B5CF6]", !isSelected && "scale-0")} />
          </span>
        </div>
        <p className="text-sm text-slate-500">{description}</p>
      </Label>
    </RadioGroupPrimitive.Item>
  )
}
