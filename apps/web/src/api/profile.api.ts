import { api } from './client';
import type { ProfileData, MacroTarget } from '@nutriai/shared';

export interface ProfileResponse extends ProfileData {
  userId:         string;
  bmrCalculated?: number;
  tdeeCalculated?: number;
  macrosJson?:    MacroTarget;
  updatedAt:      string;
}

export interface MacrosResponse {
  bmr:    number;
  tdee:   number;
  macros: MacroTarget;
}

export const profileApi = {
  get:      ()                    => api.get<ProfileResponse>('/api/v1/profile'),
  upsert:   (data: ProfileData)   => api.put<ProfileResponse>('/api/v1/profile', data),
  patch:    (data: Partial<ProfileData>) => api.patch<ProfileResponse>('/api/v1/profile', data),
  getMacros: ()                   => api.get<MacrosResponse>('/api/v1/profile/macros'),
};
