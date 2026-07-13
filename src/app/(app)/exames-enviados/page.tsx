import { backendFetchOrRedirect } from '@/lib/backend';
import { SentExamsView } from '@/components/sent-exams-view';
import type { SentFileResponse } from '@/types/api';

export default async function SentExamsPage() {
  const files = await backendFetchOrRedirect<SentFileResponse[]>('/api/bloodtests/files');
  return <SentExamsView files={files} />;
}
