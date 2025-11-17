import { notFound } from 'next/navigation';

import type { SupabaseClient } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';
import type { TechnicianApplication } from '@/types/database.types';
import TechnicianApplicationDetail from './technician-application-detail';

type TechnicianApplicationPageProps = {
  params: Promise<{ id: string }>;
};

export default async function TechnicianApplicationPage({
  params,
}: TechnicianApplicationPageProps) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: application, error } = await supabase
    .from('technician_applications')
    .select('*')
    .eq('id', id)
    .single<TechnicianApplication>();

  if (error || !application) {
    console.error('Error fetching application detail', error);
    notFound();
  }

  const storageClient = supabase.storage.from('tech-docs');
  const expirySeconds = 60 * 60; // 1 hour

  const cvSignedUrl = await generateSignedUrl(storageClient, application.cv_url, expirySeconds);
  const certsSignedUrls = await generateCertSignedUrls(
    storageClient,
    application.certs_urls,
    expirySeconds,
  );

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8">
      <TechnicianApplicationDetail
        application={application}
        cvSignedUrl={cvSignedUrl}
        certsSignedUrls={certsSignedUrls}
      />
    </div>
  );
}

type StorageBucketClient = ReturnType<SupabaseClient['storage']['from']>;

async function generateSignedUrl(
  storageClient: StorageBucketClient,
  path: string | null,
  expiresIn: number,
): Promise<string | null> {
  if (!path) {
    return null;
  }

  try {
    const { data, error } = await storageClient.createSignedUrl(path, expiresIn);
    if (error || !data?.signedUrl) {
      console.error('Error creating signed URL', error);
      return null;
    }
    return data.signedUrl;
  } catch (err) {
    console.error('Unexpected error creating signed URL', err);
    return null;
  }
}

async function generateCertSignedUrls(
  storageClient: StorageBucketClient,
  certs: string[] | null,
  expiresIn: number,
): Promise<{ url: string; label: string }[]> {
  if (!certs || certs.length === 0) {
    return [];
  }

  const signedUrls = await Promise.all(
    certs.map(async (certPath, index) => {
      const url = await generateSignedUrl(storageClient, certPath, expiresIn);
      if (!url) return null;
      return {
        url,
        label: getDocumentLabel(certPath, index),
      };
    }),
  );

  return signedUrls.filter((item): item is { url: string; label: string } => Boolean(item));
}

function getDocumentLabel(path: string, index: number) {
  const filename = path.split('/').pop();
  if (filename) return filename;
  return `Certificado ${index + 1}`;
}
