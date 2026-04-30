import { AppError } from '../../shared/middleware/error.middleware';
import { profileService } from '../profile/profile.service';
import { recordsRepository, type RecordFilters } from './records.repository';

export interface CreateRecordInput {
  weightKg:    number;
  bodyFatPct?: number;
  waistCm?:    number;
  neckCm?:     number;
  notes?:      string;
  recordedAt?: Date;
}

export interface UpdateRecordInput {
  weightKg?:   number;
  bodyFatPct?: number | null;
  waistCm?:    number | null;
  neckCm?:     number | null;
  notes?:      string | null;
  recordedAt?: Date;
}

export const recordsService = {
  async list(userId: string, filters: RecordFilters) {
    const { data, total } = await recordsRepository.findByUser(userId, filters);
    return {
      data,
      meta: {
        total,
        page:       filters.page,
        limit:      filters.limit,
        totalPages: Math.ceil(total / filters.limit),
      },
    };
  },

  async create(userId: string, input: CreateRecordInput) {
    const record = await recordsRepository.create({ userId, ...input });

    // Sync the new weight into the profile and recalculate TDEE/macros if profile exists.
    // profileService.patch merges with existing data before recalculating — safe to call even
    // if only weightKg is being updated.
    await profileService.patch(userId, { weightKg: record.weightKg }).catch(() => {
      // No profile yet — silently skip. The record is still persisted.
    });

    return record;
  },

  async patch(userId: string, recordId: string, input: UpdateRecordInput) {
    const record = await recordsRepository.findById(recordId);
    if (!record) throw new AppError(404, 'Registro no encontrado', 'RECORD_NOT_FOUND');
    if (record.userId !== userId) throw new AppError(403, 'No tenés permiso para editar este registro', 'FORBIDDEN');

    return recordsRepository.update(recordId, input);
  },

  async remove(userId: string, recordId: string) {
    const record = await recordsRepository.findById(recordId);
    if (!record) throw new AppError(404, 'Registro no encontrado', 'RECORD_NOT_FOUND');
    if (record.userId !== userId) throw new AppError(403, 'No tenés permiso para eliminar este registro', 'FORBIDDEN');

    await recordsRepository.deleteById(recordId);
  },

  async latest(userId: string) {
    const record = await recordsRepository.findLatestByUser(userId);
    if (!record) throw new AppError(404, 'No hay registros aún', 'NO_RECORDS');
    return record;
  },
};
