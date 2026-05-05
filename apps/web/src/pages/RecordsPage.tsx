import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, TrendingDown, TrendingUp, Minus, Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { RecordsListSkeleton } from '@/components/ui/Skeleton';
import { recordsApi, type BodyRecord } from '@/api/records.api';
import type { BodyRecordData } from '@nutriai/shared';
import { formatDate, formatWeight } from '@/lib/utils';

const EMPTY_FORM: BodyRecordData = { weightKg: 0, bodyFatPct: undefined, waistCm: undefined, neckCm: undefined, notes: '' };

function RecordForm({
  initial = EMPTY_FORM,
  onSubmit,
  onCancel,
  loading,
}: {
  initial?: Partial<BodyRecordData>;
  onSubmit: (d: BodyRecordData) => void;
  onCancel?: () => void;
  loading?: boolean;
}) {
  const [form, setForm] = useState<BodyRecordData>({ ...EMPTY_FORM, ...initial });
  const set = <K extends keyof BodyRecordData>(k: K, v: BodyRecordData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.weightKg) return;
    onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Input
          label="Peso (kg) *"
          type="number" min={30} max={300} step={0.1} required
          placeholder="70.0"
          value={form.weightKg || ''}
          onChange={e => set('weightKg', e.target.valueAsNumber)}
        />
        <Input
          label="% Grasa corporal"
          type="number" min={3} max={60} step={0.1}
          placeholder="15.0"
          value={form.bodyFatPct ?? ''}
          onChange={e => set('bodyFatPct', e.target.value ? e.target.valueAsNumber : undefined)}
        />
        <Input
          label="Cintura (cm)"
          type="number" min={40} max={200} step={0.5}
          placeholder="80"
          value={form.waistCm ?? ''}
          onChange={e => set('waistCm', e.target.value ? e.target.valueAsNumber : undefined)}
        />
        <Input
          label="Cuello (cm)"
          type="number" min={20} max={80} step={0.5}
          placeholder="38"
          value={form.neckCm ?? ''}
          onChange={e => set('neckCm', e.target.value ? e.target.valueAsNumber : undefined)}
        />
      </div>
      <Input
        label="Notas"
        placeholder="ej. post-ayuno, después del gym..."
        value={form.notes ?? ''}
        onChange={e => set('notes', e.target.value)}
      />
      <div className="flex gap-2">
        <Button type="submit" loading={loading}>
          {initial === EMPTY_FORM ? <><Plus size={14} /> Registrar</> : <><Check size={14} /> Guardar</>}
        </Button>
        {onCancel && (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancelar
          </Button>
        )}
      </div>
    </form>
  );
}

export default function RecordsPage() {
  const qc = useQueryClient();
  const [page, setPage]           = useState(1);
  const [editingId, setEditingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ['records', page, 20],
    queryFn:  () => recordsApi.list(page, 20),
    retry:    false,
  });

  const createMutation = useMutation({
    mutationFn: (d: BodyRecordData) => recordsApi.create(d),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['records', 'latest'] });
      toast.success('Registro guardado');
    },
    onError: () => toast.error('Error al guardar el registro'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<BodyRecordData> }) =>
      recordsApi.update(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['records', 'latest'] });
      setEditingId(null);
      toast.success('Registro actualizado');
    },
    onError: () => toast.error('Error al actualizar el registro'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => recordsApi.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['records'] });
      qc.invalidateQueries({ queryKey: ['records', 'latest'] });
      toast.success('Registro eliminado');
    },
    onError: () => toast.error('Error al eliminar el registro'),
  });

  const records   = data?.data ?? [];
  const totalPages = data?.meta.totalPages ?? 1;

  const weightDelta = (rec: BodyRecord, i: number) => {
    const prev = records[i + 1];
    if (!prev) return null;
    return rec.weightKg - prev.weightKg;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl mx-auto">
      <div className="mb-6 lg:mb-8 animate-fade-up">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink">Registros corporales</h1>
        <p className="text-sm text-ink-muted mt-1">Seguí la evolución de tu peso y composición corporal</p>
      </div>

      {/* New record form */}
      <Card className="mb-6 animate-fade-up">
        <CardHeader><CardTitle>Nuevo registro</CardTitle></CardHeader>
        <CardContent className="pt-4">
          <RecordForm
            onSubmit={d => createMutation.mutate(d)}
            loading={createMutation.isPending}
          />
        </CardContent>
      </Card>

      {/* Records list */}
      <Card className="animate-fade-up">
        <CardHeader>
          <CardTitle>Historial</CardTitle>
        </CardHeader>
        <CardContent className="pt-4">
          {isLoading ? (
            <RecordsListSkeleton />
          ) : records.length === 0 ? (
            <p className="text-center text-sm text-ink-muted py-8">No hay registros aún</p>
          ) : (
            <div className="divide-y divide-border">
              {records.map((rec, i) => {
                const diff = weightDelta(rec, i);
                const isEditing = editingId === rec.id;

                return (
                  <div key={rec.id} className="py-3">
                    {isEditing ? (
                      <div className="py-1">
                        <RecordForm
                          initial={{ weightKg: rec.weightKg, bodyFatPct: rec.bodyFatPct ?? undefined, waistCm: rec.waistCm ?? undefined, neckCm: rec.neckCm ?? undefined, notes: rec.notes ?? '' }}
                          onSubmit={d => updateMutation.mutate({ id: rec.id, data: d })}
                          onCancel={() => setEditingId(null)}
                          loading={updateMutation.isPending}
                        />
                      </div>
                    ) : (
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-3">
                            <div>
                              <p className="font-mono text-base text-ink font-medium">{formatWeight(rec.weightKg)}</p>
                              <p className="text-xs text-ink-faint mt-0.5">{formatDate(rec.recordedAt)}</p>
                            </div>
                            {diff !== null && (
                              <span className={`flex items-center gap-1 text-xs font-mono ${
                                diff < 0 ? 'text-accent' : diff > 0 ? 'text-danger' : 'text-ink-muted'
                              }`}>
                                {diff < 0 ? <TrendingDown size={12}/> : diff > 0 ? <TrendingUp size={12}/> : <Minus size={12}/>}
                                {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg` : 'igual'}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => setEditingId(rec.id)}
                              className="p-1.5 text-ink-faint hover:text-ink hover:bg-raised rounded-lg transition-colors"
                            >
                              <Pencil size={13} />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('¿Eliminar este registro?')) deleteMutation.mutate(rec.id);
                              }}
                              className="p-1.5 text-ink-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            >
                              <Trash2 size={13} />
                            </button>
                          </div>
                        </div>
                        {(rec.bodyFatPct || rec.waistCm || rec.notes) && (
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-xs font-mono text-ink-muted">
                            {rec.bodyFatPct && <span>{rec.bodyFatPct}% grasa</span>}
                            {rec.waistCm && <span>{rec.waistCm}cm cintura</span>}
                            {rec.notes && (
                              <span className="text-ink-faint truncate max-w-[200px]" title={rec.notes}>
                                {rec.notes}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-border mt-2">
              <Button
                variant="outline" size="sm"
                disabled={page === 1}
                onClick={() => setPage(p => p - 1)}
              >
                Anterior
              </Button>
              <span className="text-xs text-ink-muted">
                Página {page} de {totalPages}
              </span>
              <Button
                variant="outline" size="sm"
                disabled={page === totalPages}
                onClick={() => setPage(p => p + 1)}
              >
                Siguiente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
