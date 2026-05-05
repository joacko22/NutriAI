import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Sparkles, Trash2, ChevronRight, ChevronDown, CalendarDays, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { PlansSkeleton } from '@/components/ui/Skeleton';
import { plansApi, type MealDay, type MealItem } from '@/api/plans.api';
import { formatDate } from '@/lib/utils';

const MEAL_LABELS: Record<string, string> = {
  breakfast:       'Desayuno',
  morning_snack:   'Colación mañana',
  lunch:           'Almuerzo',
  afternoon_snack: 'Merienda',
  dinner:          'Cena',
  evening_snack:   'Colación noche',
};

const MEAL_ORDER = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'evening_snack'];

const DAY_LABELS: Record<number, string> = {
  1: 'Lunes', 2: 'Martes', 3: 'Miércoles', 4: 'Jueves',
  5: 'Viernes', 6: 'Sábado', 7: 'Domingo',
};

function MacroBadge({ label, value, unit }: { label: string; value?: number; unit: string }) {
  if (!value) return null;
  return (
    <span className="text-xs font-mono text-ink-faint">
      {label}: <span className="text-ink-muted">{value}{unit}</span>
    </span>
  );
}

function MealItemCard({ item }: { item: MealItem }) {
  return (
    <div className="rounded-lg bg-raised border border-border p-3">
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm text-ink font-medium">{item.name}</p>
        <Badge className="shrink-0 text-xs">{item.optionLabel}</Badge>
      </div>
      {item.description && (
        <p className="text-xs text-ink-muted leading-relaxed mb-2">{item.description}</p>
      )}
      {(item.calories || item.proteinG || item.carbsG || item.fatG) && (
        <div className="flex flex-wrap gap-2 mt-1">
          <MacroBadge label="Cal" value={item.calories} unit=" kcal" />
          <MacroBadge label="P" value={item.proteinG} unit="g" />
          <MacroBadge label="C" value={item.carbsG} unit="g" />
          <MacroBadge label="G" value={item.fatG} unit="g" />
        </div>
      )}
    </div>
  );
}

function DaySection({ day, defaultOpen = false }: { day: MealDay; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  const byMeal = day.items.reduce<Record<string, { A?: MealItem; B?: MealItem }>>((acc, item) => {
    acc[item.mealType] ??= {};
    acc[item.mealType][item.optionLabel] = item;
    return acc;
  }, {});

  const mealTypes = MEAL_ORDER.filter(m => byMeal[m]);

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-surface hover:bg-raised transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="font-medium text-sm text-ink">
            {DAY_LABELS[day.dayNumber] ?? day.dayName}
          </span>
          <span className="text-xs text-ink-faint">{day.items.length / 2} comidas</span>
        </div>
        {open ? <ChevronDown size={15} className="text-ink-muted" /> : <ChevronRight size={15} className="text-ink-muted" />}
      </button>

      {open && (
        <div className="px-4 pb-4 bg-base space-y-4 pt-3">
          {mealTypes.map(mealType => {
            const opts = byMeal[mealType];
            return (
              <div key={mealType}>
                <p className="text-xs text-ink-muted uppercase tracking-wide mb-2">
                  {MEAL_LABELS[mealType] ?? mealType}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {opts.A && <MealItemCard item={opts.A} />}
                  {opts.B && <MealItemCard item={opts.B} />}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PlanDetail({ planId, onClose }: { planId: string; onClose: () => void }) {
  const { data: plan, isLoading } = useQuery({
    queryKey: ['plans', planId],
    queryFn:  () => plansApi.get(planId),
  });

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-end">
      <div className="absolute inset-0 bg-base/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative h-full w-full max-w-2xl bg-surface border-l border-border overflow-y-auto">
        <div className="sticky top-0 bg-surface border-b border-border px-6 py-4 flex items-center justify-between z-10">
          <div>
            <p className="font-medium text-ink">{plan?.title ?? 'Plan semanal'}</p>
            {plan?.weekStart && (
              <p className="text-xs text-ink-muted mt-0.5">Semana del {formatDate(plan.weekStart)}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-ink-muted hover:text-ink hover:bg-raised rounded-lg transition-colors"
          >
            ✕
          </button>
        </div>

        <div className="p-6 space-y-3">
          {isLoading && <div className="flex justify-center py-8"><Spinner /></div>}
          {plan?.days?.map((day, i) => (
            <DaySection key={day.id} day={day} defaultOpen={i === 0} />
          ))}
          {plan && !plan.days?.length && (
            <p className="text-sm text-ink-muted text-center py-8">No hay días en este plan</p>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PlansPage() {
  const qc = useQueryClient();
  const [viewingId, setViewingId] = useState<string | null>(null);

  const { data: plans, isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn:  plansApi.list,
    retry:    false,
  });

  const generateMutation = useMutation({
    mutationFn: plansApi.generate,
    onSuccess:  (newPlan) => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      setViewingId(newPlan.id);
    },
  });

  const handleGenerate = () => {
    toast.promise(generateMutation.mutateAsync(), {
      loading: 'La IA está creando tu plan personalizado...',
      success: 'Plan generado exitosamente',
      error:   (err) => err?.message || 'Asegurate de tener tu perfil completo e intentá de nuevo',
    });
  };

  const deleteMutation = useMutation({
    mutationFn: (id: string) => plansApi.remove(id),
    onSuccess:  () => {
      qc.invalidateQueries({ queryKey: ['plans'] });
      toast.success('Plan eliminado');
    },
    onError: () => toast.error('Error al eliminar el plan'),
  });

  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="mb-8 flex items-start justify-between animate-fade-up">
        <div>
          <h1 className="font-serif text-3xl text-ink">Planes alimentarios</h1>
          <p className="text-sm text-ink-muted mt-1">Planes semanales generados con IA adaptados a tu perfil</p>
        </div>
        <Button
          onClick={handleGenerate}
          loading={generateMutation.isPending}
          className="shrink-0"
        >
          <Sparkles size={15} />
          Generar plan
        </Button>
      </div>

      {isLoading ? (
        <PlansSkeleton />
      ) : !plans?.length ? (
        <Card className="animate-fade-up">
          <CardContent className="py-16 text-center">
            <CalendarDays size={32} className="text-ink-faint mx-auto mb-4" />
            <p className="text-ink font-medium mb-1">No tenés planes aún</p>
            <p className="text-sm text-ink-muted mb-6 max-w-xs mx-auto">
              Generá tu primer plan semanal personalizado. Vas a ver opciones A y B para cada comida.
            </p>
            <Button
              onClick={handleGenerate}
              loading={generateMutation.isPending}
            >
              <Sparkles size={15} />
              Generar mi primer plan
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {plans.map(plan => (
            <Card
              key={plan.id}
              className="cursor-pointer hover:border-accent/30 transition-colors animate-fade-up group"
              onClick={() => setViewingId(plan.id)}
            >
              <CardContent className="py-4 px-5 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-lg bg-accent/10 border border-accent/20 flex items-center justify-center">
                    <Utensils size={16} className="text-accent" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-ink">{plan.title}</p>
                    <p className="text-xs text-ink-faint mt-0.5">
                      Semana del {formatDate(plan.weekStart)} · Creado {formatDate(plan.createdAt)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={e => {
                      e.stopPropagation();
                      if (confirm('¿Eliminar este plan?')) deleteMutation.mutate(plan.id);
                    }}
                    className="p-1.5 text-ink-faint hover:text-danger hover:bg-danger/10 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                  >
                    <Trash2 size={13} />
                  </button>
                  <ChevronRight size={15} className="text-ink-faint group-hover:text-ink transition-colors" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {viewingId && (
        <PlanDetail planId={viewingId} onClose={() => setViewingId(null)} />
      )}
    </div>
  );
}
