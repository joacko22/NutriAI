import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Skeleton } from '@/components/ui/Skeleton';
import { profileApi } from '@/api/profile.api';
import type { ProfileData, GoalType, ActivityLevel, Sex } from '@nutriai/shared';

const ACTIVITY_OPTIONS: { value: ActivityLevel; label: string; sub: string }[] = [
  { value: 'sedentary',   label: 'Sedentario',       sub: 'Sin ejercicio' },
  { value: 'light',       label: 'Ligero',            sub: '1–3 días/semana' },
  { value: 'moderate',    label: 'Moderado',          sub: '3–5 días/semana' },
  { value: 'active',      label: 'Activo',            sub: '6–7 días/semana' },
  { value: 'very_active', label: 'Muy activo',        sub: '2 veces al día' },
];

const GOAL_OPTIONS: { value: GoalType; label: string }[] = [
  { value: 'fat_loss',    label: 'Pérdida de grasa' },
  { value: 'muscle_gain', label: 'Ganancia muscular' },
  { value: 'recomp',      label: 'Recomposición' },
  { value: 'maintain',    label: 'Mantenimiento' },
];

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very_active: 1.9,
};

function calcLiveTDEE(d: Partial<ProfileData>): { bmr: number; tdee: number } | null {
  const { sex, weightKg, heightCm, birthDate, activityLevel } = d;
  if (!sex || !weightKg || !heightCm || !birthDate || !activityLevel) return null;
  const age = Math.floor((Date.now() - new Date(birthDate).getTime()) / (365.25 * 24 * 3600 * 1000));
  if (age < 10 || age > 120) return null;
  const bmr = sex === 'male'
    ? 88.362 + (13.397 * weightKg) + (4.799 * heightCm) - (5.677 * age)
    : 447.593 + (9.247 * weightKg) + (3.098 * heightCm) - (4.330 * age);
  return { bmr: Math.round(bmr), tdee: Math.round(bmr * ACTIVITY_FACTORS[activityLevel]) };
}

const EMPTY: ProfileData = {
  name: '', birthDate: '', sex: undefined, heightCm: undefined, weightKg: undefined,
  goalWeightKg: undefined, goalType: undefined, activityLevel: undefined,
  mealsPerDay: 3, dietaryRestrictions: [], mealSchedule: '', observations: '',
};

export default function ProfilePage() {
  const qc = useQueryClient();
  const [form, setForm] = useState<ProfileData>(EMPTY);
  const [saved, setSaved] = useState(false);
  const [restrictionInput, setRestrictionInput] = useState('');

  const { data: profile, isLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  profileApi.get,
    retry:    false,
  });

  useEffect(() => {
    if (profile) {
      setForm({
        name:                 profile.name ?? '',
        birthDate:            profile.birthDate ?? '',
        sex:                  profile.sex,
        heightCm:             profile.heightCm,
        weightKg:             profile.weightKg,
        goalWeightKg:         profile.goalWeightKg,
        goalType:             profile.goalType,
        activityLevel:        profile.activityLevel,
        mealsPerDay:          profile.mealsPerDay ?? 3,
        dietaryRestrictions:  profile.dietaryRestrictions ?? [],
        mealSchedule:         profile.mealSchedule ?? '',
        observations:         profile.observations ?? '',
      });
    }
  }, [profile]);

  const mutation = useMutation({
    mutationFn: (data: ProfileData) => profileApi.upsert(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['profile'] });
      toast.success('Perfil guardado');
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    },
    onError: () => toast.error('Error al guardar el perfil'),
  });

  const set = <K extends keyof ProfileData>(k: K, v: ProfileData[K]) =>
    setForm(f => ({ ...f, [k]: v }));

  const addRestriction = () => {
    const val = restrictionInput.trim();
    if (!val) return;
    const current = form.dietaryRestrictions ?? [];
    if (!current.includes(val)) set('dietaryRestrictions', [...current, val]);
    setRestrictionInput('');
  };

  const removeRestriction = (r: string) =>
    set('dietaryRestrictions', (form.dietaryRestrictions ?? []).filter(x => x !== r));

  const live = calcLiveTDEE(form);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate(form);
  };

  if (isLoading) return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="space-y-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-4 w-64" />
      </div>
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border border-border bg-surface p-5 space-y-4">
              <Skeleton className="h-5 w-40" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
                <Skeleton className="h-10 w-full" />
              </div>
            </div>
          ))}
        </div>
        <div className="rounded-xl border border-border bg-surface p-5 space-y-4 h-fit">
          <Skeleton className="h-5 w-28" />
          <Skeleton className="h-24 w-full rounded-lg" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto">
      <div className="mb-6 lg:mb-8 animate-fade-up">
        <h1 className="font-serif text-2xl sm:text-3xl text-ink">Mi perfil</h1>
        <p className="text-sm text-ink-muted mt-1">Tus datos personales y objetivos nutricionales</p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Left — form */}
          <div className="lg:col-span-2 space-y-6">

            {/* Personal */}
            <Card className="animate-fade-up">
              <CardHeader><CardTitle>Datos personales</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4">
                <Input
                  label="Nombre"
                  placeholder="Nombre completo"
                  value={form.name ?? ''}
                  onChange={e => set('name', e.target.value)}
                />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Fecha de nacimiento"
                    type="date"
                    value={form.birthDate ?? ''}
                    onChange={e => set('birthDate', e.target.value)}
                  />
                  <div>
                    <label className="block text-xs text-ink-muted mb-1.5">Sexo biológico</label>
                    <div className="flex gap-2">
                      {(['male', 'female'] as Sex[]).map(s => (
                        <button
                          key={s} type="button"
                          onClick={() => set('sex', s)}
                          className={`flex-1 rounded-lg border py-2 text-sm transition-colors ${
                            form.sex === s
                              ? 'border-accent bg-accent/15 text-accent-light'
                              : 'border-border text-ink-muted hover:border-accent/40 hover:text-ink'
                          }`}
                        >
                          {s === 'male' ? 'Masculino' : 'Femenino'}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <Input
                    label="Altura (cm)"
                    type="number" min={100} max={250}
                    placeholder="175"
                    value={form.heightCm ?? ''}
                    onChange={e => set('heightCm', e.target.valueAsNumber || undefined)}
                  />
                  <Input
                    label="Peso actual (kg)"
                    type="number" min={30} max={300} step={0.1}
                    placeholder="70.0"
                    value={form.weightKg ?? ''}
                    onChange={e => set('weightKg', e.target.valueAsNumber || undefined)}
                  />
                  <Input
                    label="Peso objetivo (kg)"
                    type="number" min={30} max={300} step={0.1}
                    placeholder="65.0"
                    value={form.goalWeightKg ?? ''}
                    onChange={e => set('goalWeightKg', e.target.valueAsNumber || undefined)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Goals */}
            <Card className="animate-fade-up">
              <CardHeader><CardTitle>Objetivo y actividad</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Objetivo principal</label>
                  <div className="grid grid-cols-2 gap-2">
                    {GOAL_OPTIONS.map(g => (
                      <button
                        key={g.value} type="button"
                        onClick={() => set('goalType', g.value)}
                        className={`rounded-lg border py-2.5 px-3 text-sm text-left transition-colors ${
                          form.goalType === g.value
                            ? 'border-accent bg-accent/15 text-accent-light'
                            : 'border-border text-ink-muted hover:border-accent/40 hover:text-ink'
                        }`}
                      >
                        {g.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Nivel de actividad</label>
                  <div className="space-y-1.5">
                    {ACTIVITY_OPTIONS.map(a => (
                      <button
                        key={a.value} type="button"
                        onClick={() => set('activityLevel', a.value)}
                        className={`w-full flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm transition-colors ${
                          form.activityLevel === a.value
                            ? 'border-accent bg-accent/15'
                            : 'border-border hover:border-accent/40'
                        }`}
                      >
                        <div className={`h-3.5 w-3.5 rounded-full border flex items-center justify-center shrink-0 ${
                          form.activityLevel === a.value ? 'border-accent bg-accent' : 'border-ink-faint'
                        }`}>
                          {form.activityLevel === a.value && <div className="h-1.5 w-1.5 rounded-full bg-base" />}
                        </div>
                        <span className={form.activityLevel === a.value ? 'text-accent-light' : 'text-ink-muted'}>
                          {a.label}
                        </span>
                        <span className="ml-auto text-xs text-ink-faint">{a.sub}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <Input
                  label="Comidas por día"
                  type="number" min={1} max={8}
                  value={form.mealsPerDay ?? 3}
                  onChange={e => set('mealsPerDay', e.target.valueAsNumber)}
                />
              </CardContent>
            </Card>

            {/* Dietary */}
            <Card className="animate-fade-up">
              <CardHeader><CardTitle>Preferencias alimentarias</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4">
                <div>
                  <label className="block text-xs text-ink-muted mb-1.5">Restricciones dietéticas</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      value={restrictionInput}
                      onChange={e => setRestrictionInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addRestriction())}
                      placeholder="vegetariano, sin gluten..."
                      className="flex-1 bg-raised border border-border rounded-lg px-3 py-2 text-sm text-ink placeholder:text-ink-faint outline-none focus:border-accent/50 transition-colors"
                    />
                    <Button type="button" variant="outline" size="sm" onClick={addRestriction}>
                      Agregar
                    </Button>
                  </div>
                  {(form.dietaryRestrictions ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {(form.dietaryRestrictions ?? []).map(r => (
                        <span
                          key={r}
                          className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent-light text-xs px-2.5 py-1"
                        >
                          {r}
                          <button
                            type="button"
                            onClick={() => removeRestriction(r)}
                            className="text-accent/60 hover:text-danger transition-colors"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <Input
                  label="Horario de comidas"
                  placeholder="ej. desayuno 8:00, almuerzo 13:00..."
                  value={form.mealSchedule ?? ''}
                  onChange={e => set('mealSchedule', e.target.value)}
                />

                <Textarea
                  label="Observaciones adicionales"
                  placeholder="Intolerancias, preferencias, historial médico relevante..."
                  rows={3}
                  value={form.observations ?? ''}
                  onChange={e => set('observations', e.target.value)}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right — TDEE preview */}
          <div className="space-y-4">
            <Card className="animate-fade-up sticky top-8">
              <CardHeader><CardTitle>Vista previa</CardTitle></CardHeader>
              <CardContent className="pt-4 space-y-4">
                {live ? (
                  <>
                    <div className="rounded-lg bg-accent/10 border border-accent/20 p-4 text-center">
                      <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">TDEE estimado</p>
                      <p className="font-mono text-3xl text-accent font-medium">{live.tdee}</p>
                      <p className="text-xs text-ink-faint mt-0.5">kcal / día</p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-ink-muted">BMR</span>
                        <span className="font-mono text-ink">{live.bmr} kcal</span>
                      </div>
                      {form.activityLevel && (
                        <div className="flex justify-between text-sm">
                          <span className="text-ink-muted">Factor actividad</span>
                          <span className="font-mono text-ink">× {ACTIVITY_FACTORS[form.activityLevel]}</span>
                        </div>
                      )}
                    </div>

                    <div className="border-t border-border pt-3 space-y-1.5 text-xs text-ink-faint">
                      <p className="font-medium text-ink-muted">Macros estimados</p>
                      {form.goalType === 'fat_loss' && (
                        <>
                          <p>Proteína: ~{Math.round(live.tdee * 0.30 / 4)}g</p>
                          <p>Carbos: ~{Math.round((live.tdee - 500) * 0.40 / 4)}g</p>
                          <p>Grasa: ~{Math.round((live.tdee - 500) * 0.30 / 9)}g</p>
                          <p className="text-accent/70 mt-1">Déficit de 500 kcal aplicado</p>
                        </>
                      )}
                      {form.goalType === 'muscle_gain' && (
                        <>
                          <p>Proteína: ~{Math.round(live.tdee * 0.25 / 4)}g</p>
                          <p>Carbos: ~{Math.round((live.tdee + 300) * 0.50 / 4)}g</p>
                          <p>Grasa: ~{Math.round((live.tdee + 300) * 0.25 / 9)}g</p>
                          <p className="text-accent/70 mt-1">Superávit de 300 kcal aplicado</p>
                        </>
                      )}
                      {(form.goalType === 'maintain' || form.goalType === 'recomp' || !form.goalType) && (
                        <>
                          <p>Proteína: ~{Math.round(live.tdee * 0.30 / 4)}g</p>
                          <p>Carbos: ~{Math.round(live.tdee * 0.40 / 4)}g</p>
                          <p>Grasa: ~{Math.round(live.tdee * 0.30 / 9)}g</p>
                        </>
                      )}
                    </div>

                    <p className="text-xs text-ink-faint">
                      Fórmula Harris-Benedict (Roza & Shizgal 1984). Los valores exactos los calcula el servidor al guardar.
                    </p>
                  </>
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-ink-faint">
                      Completá sexo, peso, altura, fecha de nacimiento y nivel de actividad para ver el cálculo en tiempo real.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Submit */}
        <div className="flex items-center justify-end gap-3 mt-6">
          <Button type="submit" loading={mutation.isPending}>
            {saved ? (
              <span className="flex items-center gap-1.5">
                <Check size={15} /> Guardado
              </span>
            ) : 'Guardar perfil'}
          </Button>
        </div>
      </form>
    </div>
  );
}
