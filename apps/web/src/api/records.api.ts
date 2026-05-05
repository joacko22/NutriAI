import { api } from './client';
import type { BodyRecordData } from '@nutriai/shared';

export interface BodyRecord extends BodyRecordData {
  id:         string;
  userId:     string;
  recordedAt: string;
}

export interface RecordsPage {
  data: BodyRecord[];
  meta: { total: number; page: number; limit: number; totalPages: number };
}

export const recordsApi = {
  list:   (page = 1, limit = 20) =>
    api.get<RecordsPage>(`/api/v1/records?page=${page}&limit=${limit}`),

  latest: () =>
    api.get<BodyRecord>('/api/v1/records/latest'),

  create: (data: BodyRecordData) =>
    api.post<BodyRecord>('/api/v1/records', data),

  update: (id: string, data: Partial<BodyRecordData>) =>
    api.patch<BodyRecord>(`/api/v1/records/${id}`, data),

  remove: (id: string) =>
    api.delete<void>(`/api/v1/records/${id}`),
};
