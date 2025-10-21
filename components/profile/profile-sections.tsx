"use client";

import { useMemo, useRef } from "react";
import type { ChangeEvent, ReactNode } from "react";
import Image from "next/image";
import { BadgeCheck, LogOut, MapPin, ShieldCheck, Upload } from "lucide-react";
import type { UseFormReturn } from "react-hook-form";

import { Button } from "@/components/ui/button";
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";

import type { ProfileFormValues } from "@/app/perfil/profile-form";

export type SessionItem = {
  id: string;
  device: string;
  lastActive: string;
};

export type VerificationDocument = {
  name: string;
  url: string;
};

export function SectionCard({
  children,
  className,
  contentClassName,
  title,
  description,
  icon,
  actions,
}: {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  title?: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  actions?: ReactNode;
}): JSX.Element {
  return (
    <section
      className={cn(
        "rounded-3xl border border-slate-200 bg-white/90 p-6 shadow-sm",
        className,
      )}
    >
      {(title || description || icon || actions) && (
        <header className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-2">
            {icon}
            <div>
              {title ? (
                <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
              ) : null}
              {description ? (
                <p className="text-sm text-slate-500">{description}</p>
              ) : null}
            </div>
          </div>
          {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
        </header>
      )}
      <div className={cn(title || description ? "mt-4" : undefined, contentClassName)}>
        {children}
      </div>
    </section>
  );
}

function AvatarUploader({
  previewUrl,
  onSelect,
  disabled,
}: {
  previewUrl: string | null;
  onSelect: (file: File) => void;
  disabled?: boolean;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    onSelect(file);
    event.target.value = "";
  };

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="relative h-32 w-32 overflow-hidden rounded-2xl border border-slate-200">
        {previewUrl ? (
          <Image src={previewUrl} alt="Avatar" fill className="object-cover" unoptimized sizes="128px" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-slate-100 text-sm text-slate-400">
            Sin foto
          </div>
        )}
      </div>
      <div className="space-y-2 text-center">
        <p className="text-sm font-medium text-slate-700">Foto de perfil</p>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleChange}
        />
        <Button
          type="button"
          variant="outline"
          className="gap-2"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
        >
          <Upload className="h-4 w-4" /> Cambiar imagen
        </Button>
      </div>
    </div>
  );
}

function MultiSelectField({
  value,
  onChange,
  options,
  emptyLabel,
}: {
  value: string[];
  onChange: (nextValue: string[]) => void;
  options: string[];
  emptyLabel: string;
}): JSX.Element {
  const availableOptions = useMemo(
    () => options.filter((option) => !value.includes(option)),
    [options, value],
  );

  const toggleItem = (item: string) => {
    if (value.includes(item)) {
      onChange(value.filter((option) => option !== item));
      return;
    }

    onChange([...value, item]);
  };

  return (
    <div className="space-y-4">
      <div
        className={cn(
          "flex flex-wrap gap-2",
          value.length === 0 && "text-sm text-slate-500",
        )}
        aria-live="polite"
      >
        {value.length === 0 ? (
          <span>{emptyLabel}</span>
        ) : (
          value.map((item) => (
            <span
              key={item}
              className="inline-flex items-center gap-2 rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-sm font-medium text-[#5B21B6]"
            >
              {item}
              <button
                type="button"
                onClick={() => toggleItem(item)}
                className="rounded-full bg-white/50 px-2 py-0.5 text-xs text-[#5B21B6] transition hover:bg-white"
                aria-label={`Quitar ${item}`}
              >
                ×
              </button>
            </span>
          ))
        )}
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => {
          const isSelected = value.includes(option);
          return (
            <button
              type="button"
              key={option}
              onClick={() => toggleItem(option)}
              aria-pressed={isSelected}
              className={cn(
                "flex items-center justify-between rounded-lg border px-3 py-2 text-sm transition",
                isSelected
                  ? "border-[#8B5CF6] bg-[#8B5CF6]/10 text-[#5B21B6]"
                  : "border-slate-200 bg-white text-slate-600 hover:border-slate-300",
              )}
            >
              <span>{option}</span>
              <span className="text-xs uppercase">{isSelected ? "Quitar" : "Agregar"}</span>
            </button>
          );
        })}

        {availableOptions.length === 0 && (
          <p className="col-span-full text-sm text-slate-500">
            No hay más opciones disponibles. Puedes quitar alguna para agregar nuevas.
          </p>
        )}
      </div>
    </div>
  );
}

function MapPreview({ location }: { location: { lat: number; lng: number } | null }): JSX.Element {
  if (!location) {
    return (
      <div className="flex h-48 items-center justify-center rounded-xl border border-dashed border-slate-300 bg-slate-50 text-sm text-slate-500">
        No hay una ubicación compartida actualmente.
      </div>
    );
  }

  const mapUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lng - 0.01}%2C${location.lat - 0.01}%2C${location.lng + 0.01}%2C${location.lat + 0.01}&layer=mapnik&marker=${location.lat}%2C${location.lng}`;

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <iframe title="Ubicación actual" src={mapUrl} className="h-48 w-full" allowFullScreen />
    </div>
  );
}

export function GeneralInfoSection({
  form,
  avatarPreview,
  onAvatarSelect,
  email,
  userTypeLabel,
  disableAvatar,
}: {
  form: UseFormReturn<ProfileFormValues>;
  avatarPreview: string | null;
  onAvatarSelect: (file: File) => void;
  email: string;
  userTypeLabel: string;
  disableAvatar?: boolean;
}): JSX.Element {
  return (
    <SectionCard>
      <div className="flex flex-col gap-6 lg:flex-row">
        <AvatarUploader previewUrl={avatarPreview} onSelect={onAvatarSelect} disabled={disableAvatar} />
        <div className="flex-1 space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="full_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nombre completo</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Tu nombre" autoComplete="name" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <Label htmlFor="profile-email">Correo electrónico</Label>
              <Input id="profile-email" value={email} readOnly disabled className="bg-slate-100" />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Teléfono</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="+56 9 1234 5678" autoComplete="tel" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium text-slate-700">Tipo de usuario</span>
              <span className="inline-flex w-fit items-center rounded-full bg-[#8B5CF6]/10 px-3 py-1 text-sm font-semibold text-[#5B21B6]">
                {userTypeLabel}
              </span>
            </div>
          </div>
        </div>
      </div>
    </SectionCard>
  );
}

export function ClientInfoSection({
  form,
  paymentMethods,
  serviceHistory,
}: {
  form: UseFormReturn<ProfileFormValues>;
  paymentMethods: string[];
  serviceHistory: number;
}): JSX.Element {
  const historyItems = useMemo(() => {
    if (serviceHistory <= 0) {
      return [];
    }

    return Array.from({ length: Math.min(serviceHistory, 5) }).map((_, index) => ({
      id: `${serviceHistory - index}`,
      label: `Solicitud #${serviceHistory - index}`,
      status: index === 0 ? "Completada" : "Finalizada",
    }));
  }, [serviceHistory]);

  return (
    <div className="space-y-6">
      <SectionCard title="Datos de contacto">
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem className="sm:col-span-2">
                <FormLabel>Dirección</FormLabel>
                <FormControl>
                  <Input {...field} placeholder="Calle, número, comuna" autoComplete="street-address" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="preferred_payment_method"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Método de pago preferido</FormLabel>
                <FormControl>
                  <select
                    {...field}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#8B5CF6]"
                  >
                    <option value="">Selecciona una opción</option>
                    {paymentMethods.map((method) => (
                      <option key={method} value={method}>
                        {method}
                      </option>
                    ))}
                  </select>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Historial de servicios"
        description="Consulta tus servicios recientes y verifica su estado."
        icon={<ShieldCheck className="h-5 w-5 text-[#8B5CF6]" />}
      >
        {historyItems.length === 0 ? (
          <p className="text-sm text-slate-500">Aún no registras servicios completados.</p>
        ) : (
          <ul className="space-y-3">
            {historyItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between rounded-lg border border-slate-200 p-3 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-900">{item.label}</p>
                  <p className="text-xs text-slate-500">Solicitudes totales: {serviceHistory}</p>
                </div>
                <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">
                  {item.status}
                </span>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export function TechnicianInfoSection({
  form,
  specialtyOptions,
  serviceAreaOptions,
  isVerified,
  documents,
  onUploadDocuments,
  onRemoveDocument,
  isUploading,
  selectedDocuments,
  location,
  rating,
  totalServices,
}: {
  form: UseFormReturn<ProfileFormValues>;
  specialtyOptions: string[];
  serviceAreaOptions: string[];
  isVerified: boolean;
  documents: VerificationDocument[];
  onUploadDocuments: (files: File[]) => void;
  onRemoveDocument: (fileName: string) => void;
  isUploading: boolean;
  selectedDocuments: File[];
  location: { lat: number; lng: number } | null;
  rating: number;
  totalServices: number;
}): JSX.Element {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDocuments = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length > 0) {
      onUploadDocuments(files);
    }
    event.target.value = "";
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Experiencia" description="Comparte las especialidades y zonas en las que trabajas.">
        <div className="grid gap-6 lg:grid-cols-2">
          <FormField
            control={form.control}
            name="specialties"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Especialidades</FormLabel>
                <FormControl>
                  <MultiSelectField
                    value={field.value ?? []}
                    onChange={field.onChange}
                    options={specialtyOptions}
                    emptyLabel="Selecciona las especialidades en las que destacas"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="service_areas"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Áreas de servicio</FormLabel>
                <FormControl>
                  <MultiSelectField
                    value={field.value ?? []}
                    onChange={field.onChange}
                    options={serviceAreaOptions}
                    emptyLabel="Selecciona las comunas en las que trabajas"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Estado de verificación"
        description={isVerified ? "Tu perfil ha sido verificado correctamente." : "Sube tus documentos para completar la verificación."}
        icon={<BadgeCheck className={cn("h-5 w-5", isVerified ? "text-emerald-500" : "text-slate-400")} />}
        actions={
          <Button
            type="button"
            variant="outline"
            className="gap-2"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="h-4 w-4" /> {isUploading ? "Subiendo…" : "Agregar documentos"}
          </Button>
        }
      >
        <input ref={inputRef} type="file" multiple className="hidden" onChange={handleDocuments} />
        <div className="space-y-4">
          <div>
            <p className="text-sm text-slate-500">
              Aceptamos archivos PDF, JPG o PNG con un máximo de 10MB cada uno.
            </p>
          </div>

          <div className="space-y-2">
            {documents.length === 0 && selectedDocuments.length === 0 ? (
              <p className="text-sm text-slate-500">No has cargado documentos de verificación todavía.</p>
            ) : null}

            {documents.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Documentos aprobados</p>
                <ul className="mt-2 space-y-2">
                  {documents.map((document) => (
                    <li
                      key={document.name}
                      className="flex items-center justify-between rounded-lg border border-slate-200 px-3 py-2 text-sm"
                    >
                      <a
                        href={document.url}
                        className="text-[#5B21B6] transition hover:underline"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {document.name}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {selectedDocuments.length > 0 ? (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500">Pendientes por subir</p>
                <ul className="mt-2 space-y-2">
                  {selectedDocuments.map((file) => (
                    <li
                      key={file.name}
                      className="flex items-center justify-between rounded-lg border border-dashed border-slate-300 px-3 py-2 text-sm"
                    >
                      <span className="truncate pr-4" title={file.name}>
                        {file.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => onRemoveDocument(file.name)}
                        className="text-xs font-semibold text-rose-600 hover:underline"
                      >
                        Quitar
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </SectionCard>

      <SectionCard
        title="Ubicación actual"
        description="Comparte tu posición para recibir servicios cercanos."
        icon={<MapPin className="h-5 w-5 text-[#8B5CF6]" />}
      >
        <MapPreview location={location} />
      </SectionCard>

      <SectionCard title="Calificaciones" description="Resumen de tus servicios completados.">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-3xl font-semibold text-slate-900">{rating.toFixed(1)} / 5</p>
            <p className="text-sm text-slate-500">Promedio basado en reseñas de clientes.</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-semibold text-slate-900">{totalServices}</p>
            <p className="text-sm text-slate-500">Servicios completados</p>
          </div>
        </div>
      </SectionCard>
    </div>
  );
}

export function SecuritySection({
  form,
  onOpenPasswordDialog,
  sessions,
  onCloseSession,
}: {
  form: UseFormReturn<ProfileFormValues>;
  onOpenPasswordDialog: () => void;
  sessions: SessionItem[];
  onCloseSession: (id: string) => void;
}): JSX.Element {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Contraseña"
        description="Mantén tu contraseña segura y actualizada."
        actions={
          <Button type="button" onClick={onOpenPasswordDialog} className="gap-2">
            Cambiar contraseña
          </Button>
        }
      >
        <p className="text-sm text-slate-500">
          Te recomendamos cambiar tu contraseña periódicamente y utilizar combinaciones únicas.
        </p>
      </SectionCard>

      <SectionCard title="Protección adicional">
        <div className="space-y-3">
          <FormField
            control={form.control}
            name="twoFactorEnabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
                <div>
                  <FormLabel className="text-base">Autenticación de dos factores</FormLabel>
                  <p className="text-sm text-slate-500">
                    Añade una capa adicional de seguridad utilizando códigos únicos.
                  </p>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Activar 2FA" />
                </FormControl>
              </FormItem>
            )}
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Sesiones activas"
        description="Cierra las sesiones que no reconozcas para proteger tu cuenta."
      >
        <ul className="space-y-2">
          {sessions.length === 0 ? (
            <li className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">
              No hay sesiones activas adicionales.
            </li>
          ) : (
            sessions.map((session) => (
              <li
                key={session.id}
                className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
              >
                <div>
                  <p className="font-medium text-slate-700">{session.device}</p>
                  <p className="text-xs text-slate-500">Último acceso: {session.lastActive}</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  className="gap-1 text-sm text-rose-600 hover:bg-rose-50"
                  onClick={() => onCloseSession(session.id)}
                >
                  <LogOut className="h-4 w-4" /> Cerrar sesión
                </Button>
              </li>
            ))
          )}
        </ul>
      </SectionCard>
    </div>
  );
}

export function NotificationsSection({
  form,
}: {
  form: UseFormReturn<ProfileFormValues>;
}): JSX.Element {
  return (
    <SectionCard
      title="Preferencias de notificación"
      description="Controla cómo quieres recibir alertas sobre tus servicios y actualizaciones."
    >
      <div className="space-y-3">
        <FormField
          control={form.control}
          name="emailNotifications"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <FormLabel className="text-base">Notificaciones por correo</FormLabel>
                <p className="text-sm text-slate-500">
                  Recibe confirmaciones y resúmenes de actividad en tu email.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Notificaciones por correo" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="pushNotifications"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <FormLabel className="text-base">Notificaciones push</FormLabel>
                <p className="text-sm text-slate-500">
                  Mantente al tanto en tiempo real de nuevos servicios.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Notificaciones push" />
              </FormControl>
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="smsNotifications"
          render={({ field }) => (
            <FormItem className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4">
              <div>
                <FormLabel className="text-base">Notificaciones SMS</FormLabel>
                <p className="text-sm text-slate-500">
                  Recibe recordatorios y avisos urgentes por mensaje de texto.
                </p>
              </div>
              <FormControl>
                <Switch checked={field.value} onCheckedChange={field.onChange} aria-label="Notificaciones por SMS" />
              </FormControl>
            </FormItem>
          )}
        />
      </div>
    </SectionCard>
  );
}
