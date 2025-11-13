'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import type { ApplicationStatus, TechnicianApplication } from '@/types/database.types';

type Decision = 'approved' | 'rejected';

type TechnicianApplicationDetailProps = {
  application: TechnicianApplication;
  cvSignedUrl: string | null;
  certsSignedUrls: { url: string; label: string }[];
};

const STATUS_LABELS: Record<ApplicationStatus, string> = {
  submitted: 'Enviada',
  under_review: 'En revisión',
  approved: 'Aprobada',
  rejected: 'Rechazada',
};

const STATUS_CLASSES: Record<ApplicationStatus, string> = {
  submitted: 'bg-gray-100 text-gray-800',
  under_review: 'bg-blue-100 text-blue-800',
  approved: 'bg-emerald-100 text-emerald-800',
  rejected: 'bg-rose-100 text-rose-800',
};

export default function TechnicianApplicationDetail({
  application,
  cvSignedUrl,
  certsSignedUrls,
}: TechnicianApplicationDetailProps) {
  const router = useRouter();
  const [modalDecision, setModalDecision] = useState<Decision | null>(null);
  const [reviewNotes, setReviewNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const actionsDisabled = useMemo(
    () => application.status === 'approved' || application.status === 'rejected',
    [application.status],
  );

  const formattedCreatedAt = formatDate(application.created_at);
  const formattedUpdatedAt = formatDate(application.updated_at);

  const openModal = (decision: Decision) => {
    setModalDecision(decision);
    setReviewNotes(application.review_notes ?? '');
  };

  const closeModal = () => {
    if (isSubmitting) return;
    setModalDecision(null);
    setReviewNotes('');
  };

  const handleSubmitDecision = async () => {
    if (!modalDecision) return;
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/admin/approve-application', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          applicationId: application.id,
          decision: modalDecision,
          reviewNotes: reviewNotes.trim() || undefined,
        }),
      });

      if (!response.ok) {
        throw new Error('Request failed');
      }

      const payload = await response.json();
      if (!payload?.ok) {
        throw new Error('Unexpected payload');
      }

      toast.success(
        modalDecision === 'approved'
          ? 'Postulación aprobada correctamente.'
          : 'Postulación rechazada correctamente.',
      );
      closeModal();
      router.push('/admin/technicians');
    } catch (error) {
      console.error('Error updating application status', error);
      toast.error('No se pudo completar la acción. Intenta nuevamente.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-gray-500">Postulación #{application.id.slice(0, 8)}</p>
          <h1 className="text-2xl font-semibold text-gray-900">
            {application.full_name ?? 'Sin nombre registrado'}
          </h1>
        </div>
        <Link
          href="/admin/technicians"
          className="inline-flex items-center rounded-md border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
        >
          Volver
        </Link>
      </div>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm text-gray-500">Estado actual</p>
            <span
              className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${STATUS_CLASSES[application.status]}`}
            >
              {STATUS_LABELS[application.status]}
            </span>
          </div>
          <div className="text-sm text-gray-600">
            <p>
              Creada: <span className="font-medium text-gray-900">{formattedCreatedAt}</span>
            </p>
            <p>
              Actualizada: <span className="font-medium text-gray-900">{formattedUpdatedAt}</span>
            </p>
          </div>
        </div>

        <dl className="mt-6 grid gap-4 sm:grid-cols-2">
          <InfoItem label="Nombre completo" value={application.full_name ?? 'Sin información'} />
          <InfoItem label="Email" value={application.email} />
          <InfoItem label="Teléfono" value={application.phone ?? 'Sin información'} />
          <InfoItem label="ID del usuario" value={application.user_id ?? '—'} />
        </dl>
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Información de la postulación</h2>
        <div className="mt-4">
          <h3 className="text-sm font-medium text-gray-700">Habilidades</h3>
          {application.skills && application.skills.length > 0 ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {application.skills.map((skill) => (
                <span
                  key={skill}
                  className="rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-800"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-500">No se registraron habilidades.</p>
          )}
        </div>

        <div className="mt-6">
          <h3 className="text-sm font-medium text-gray-700">Experiencia</h3>
          <p className="mt-2 whitespace-pre-line text-sm text-gray-800">
            {application.experience ?? 'No se agregó una descripción de experiencia.'}
          </p>
        </div>

        {application.review_notes && (
          <div className="mt-6 rounded-lg bg-gray-50 p-4">
            <h3 className="text-sm font-semibold text-gray-800">Notas de revisión</h3>
            <p className="mt-2 text-sm text-gray-700 whitespace-pre-line">
              {application.review_notes}
            </p>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-900">Documentos</h2>
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-sm font-medium text-gray-700">Currículum</p>
            {cvSignedUrl ? (
              <a
                href={cvSignedUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-flex items-center text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                Ver CV
              </a>
            ) : (
              <p className="mt-1 text-sm text-gray-500">No se adjuntó un CV.</p>
            )}
          </div>

          <div>
            <p className="text-sm font-medium text-gray-700">Certificados</p>
            {certsSignedUrls.length > 0 ? (
              <ul className="mt-2 space-y-1 text-sm text-indigo-600">
                {certsSignedUrls.map((cert) => (
                  <li key={cert.url}>
                    <a
                      href={cert.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-indigo-800"
                    >
                      {cert.label}
                    </a>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-1 text-sm text-gray-500">No se adjuntaron certificados.</p>
            )}
          </div>
        </div>
      </section>

      {!actionsDisabled && (
        <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900">Acciones de revisión</h2>
          <p className="mt-1 text-sm text-gray-600">
            Selecciona una acción para aprobar o rechazar la postulación. Podrás agregar notas
            para el registro interno.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              onClick={() => openModal('rejected')}
            >
              Rechazar
            </button>
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
              onClick={() => openModal('approved')}
            >
              Aprobar
            </button>
          </div>
        </section>
      )}

      {modalDecision && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-semibold text-gray-900">
              {modalDecision === 'approved' ? 'Confirmar aprobación' : 'Confirmar rechazo'}
            </h3>
            <p className="mt-2 text-sm text-gray-600">
              Añade notas para registrar el contexto de tu decisión. Este texto quedará en el
              historial de la postulación.
            </p>
            <textarea
              className="mt-4 w-full rounded-md border border-gray-300 p-3 text-sm text-gray-900 focus:border-indigo-500 focus:outline-none"
              rows={4}
              placeholder="Notas de revisión (opcional)"
              value={reviewNotes}
              onChange={(event) => setReviewNotes(event.target.value)}
              disabled={isSubmitting}
            />
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                onClick={closeModal}
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={`rounded-md px-4 py-2 text-sm font-semibold text-white ${
                  modalDecision === 'approved' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                } ${isSubmitting ? 'opacity-70' : ''}`}
                onClick={handleSubmitDecision}
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Procesando…' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-sm font-medium text-gray-500">{label}</dt>
      <dd className="mt-1 text-sm text-gray-900">{value}</dd>
    </div>
  );
}

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  try {
    return new Date(value).toLocaleString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch (error) {
    console.error('Error formatting date', error);
    return value;
  }
}
