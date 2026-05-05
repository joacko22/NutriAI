import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid,
} from 'recharts';
import { MessageSquare, Activity, CalendarDays, ChevronRight, TrendingDown, TrendingUp, Minus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { DashboardSkeleton } from '@/components/ui/Skeleton';
import { profileApi } from '@/api/profile.api';
import { recordsApi } from '@/api/records.api';
import type { BodyRecord } from '@/api/records.api';
import { useAuthStore } from '@/stores/auth.store';
import { formatWeight, formatDate } from '@/lib/utils';

const GOAL_LABELS: Record<string, string> = {
  fat_loss:    'Pérdida de grasa',
  muscle_gain: 'Ganancia muscular',
  recomp:      'Recomposición',
  maintain:    'Mantenimiento',
};

function WeightChart({ records }: { records: BodyRecord[] }) {
  if (records.length < 2) return null;

  const data = [...records]
    .reverse()
    .map(r => ({
      fecha: new Date(r.recordedAt).toLocaleDateString('es-AR', { month: 'short', day: 'numeric' }),
      peso:  r.weightKg,
    }));

  const weights  = data.map(d => d.peso);
  const min      = Math.min(...weights);
  const max      = Math.max(...weights);
  const padding  = (max - min) * 0.15 || 0.5;

  return (
    <ResponsiveContainer width="100%" height={150}>
      <LineChart data={data} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(120 8% 14%)" vertical={false} />
        <XAxis
          dataKey="fecha"
          tick={{ fontSize: 10, fill: 'hsl(120 6% 28%)', fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={false}
          tickLine={false}
          interval="preserveStartEnd"
        />
        <YAxis
          domain={[min - padding, max + padding]}
          tick={{ fontSize: 10, fill: 'hsl(120 6% 28%)', fontFamily: '"JetBrains Mono", monospace' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}kg`}
          width={48}
        />
        <Tooltip
          contentStyle={{
            background:   'hsl(120 10% 8%)',
            border:       '1px solid hsl(120 8% 16%)',
            borderRadius: '8px',
            fontSize:     '12px',
            fontFamily:   '"JetBrains Mono", monospace',
            color:        'hsl(120 10% 91%)',
          }}
          formatter={(v) => [`${v ?? '—'} kg`, 'Peso']}
          labelStyle={{ color: 'hsl(120 6% 28%)', marginBottom: '2px' }}
          cursor={{ stroke: 'hsl(120 8% 20%)', strokeWidth: 1 }}
        />
        <Line
          type="monotone"
          dataKey="peso"
          stroke="hsl(120 35% 57%)"
          strokeWidth={2}
          dot={{ r: 3, fill: 'hsl(120 35% 57%)', strokeWidth: 0 }}
          activeDot={{ r: 5, fill: 'hsl(120 30% 72%)', strokeWidth: 0 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

export default function DashboardPage() {
  const user = useAuthStore((s) => s.user);

  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ['profile'],
    queryFn:  profileApi.get,
    retry:    false,
  });

  const { data: latest } = useQuery({
    queryKey: ['records', 'latest'],
    queryFn:  recordsApi.latest,
    retry:    false,
  });

  const { data: records } = useQuery({
    queryKey: ['records', 1, 5],
    queryFn:  () => recordsApi.list(1, 5),
    retry:    false,
  });

  const { data: chartData } = useQuery({
    queryKey: ['records', 1, 30],
    queryFn:  () => recordsApi.list(1, 30),
    retry:    false,
  });

  if (profileLoading) return <DashboardSkeleton />;

  const hasProfile  = !!profile?.name;
  const weight      = latest?.weightKg ?? profile?.weightKg;
  const macros      = profile?.macrosJson;
  const chartPoints = chartData?.data ?? [];

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? 'Buenos días' : greetingHour < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-8 animate-fade-up">
        <p className="text-ink-muted text-sm mb-1">{greeting}</p>
        <h1 className="font-serif text-3xl text-ink">
          {profile?.name ?? user?.email?.split('@')[0] ?? 'Usuario'}
        </h1>
        {profile?.goalType && (
          <Badge className="mt-2">{GOAL_LABELS[profile.goalType]}</Badge>
        )}
      </div>

      {/* Profile incomplete banner */}
      {!hasProfile && (
        <div className="mb-6 rounded-xl border border-warn/30 bg-warn/10 p-4 flex items-center justify-between animate-fade-up">
          <div>
            <p className="text-sm font-medium text-warn">Completá tu perfil</p>
            <p className="text-xs text-ink-muted mt-0.5">La IA necesita tus datos para personalizar el asesoramiento</p>
          </div>
          <Link to="/profile">
            <Button variant="outline" size="sm">
              Completar <ChevronRight size={14} />
            </Button>
          </Link>
        </div>
      )}

      {/* Metric cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <MetricCard
          label="Peso actual"
          value={weight ? formatWeight(weight) : '—'}
          sub={latest ? `Actualizado ${formatDate(latest.recordedAt)}` : 'Sin registros aún'}
        />
        <MetricCard
          label="TDEE"
          value={profile?.tdeeCalculated ? `${profile.tdeeCalculated} kcal` : '—'}
          sub="Calorías diarias totales"
        />
        <MetricCard
          label="Proteína"
          value={macros ? `${macros.proteinG}g` : '—'}
          sub="Objetivo diario"
        />
        <MetricCard
          label="IMC"
          value={
            weight && profile?.heightCm
              ? (weight / Math.pow(profile.heightCm / 100, 2)).toFixed(1)
              : '—'
          }
          sub="Índice de masa corporal"
        />
      </div>

      {/* Weight evolution chart */}
      {chartPoints.length >= 2 && (
        <Card className="mb-6 animate-fade-up">
          <CardHeader>
            <CardTitle>Evolución del peso</CardTitle>
          </CardHeader>
          <CardContent className="pt-2 pb-3">
            <WeightChart records={chartPoints} />
          </CardContent>
        </Card>
      )}

      {/* Main content grid */}
      <div className="grid lg:grid-cols-3 gap-4">
        {/* Quick actions */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle>Acciones rápidas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pt-4">
            <QuickAction to="/chat"    icon={<MessageSquare size={15}/>} label="Hablar con NutriAI" />
            <QuickAction to="/records" icon={<Activity size={15}/>}      label="Registrar peso" />
            <QuickAction to="/plans"   icon={<CalendarDays size={15}/>}  label="Generar plan semanal" />
          </CardContent>
        </Card>

        {/* Recent records */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Historial reciente</CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            {!records?.data.length ? (
              <div className="text-center py-6">
                <p className="text-sm text-ink-muted">No hay registros aún</p>
                <Link to="/records">
                  <Button variant="outline" size="sm" className="mt-3">
                    Registrar primer peso
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-2">
                {records.data.map((rec, i) => {
                  const prev = records.data[i + 1];
                  const diff = prev ? rec.weightKg - prev.weightKg : 0;
                  return (
                    <div key={rec.id} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
                      <div>
                        <p className="text-sm font-mono text-ink">{formatWeight(rec.weightKg)}</p>
                        {rec.bodyFatPct && <p className="text-xs text-ink-muted">{rec.bodyFatPct}% grasa</p>}
                      </div>
                      <div className="flex items-center gap-3">
                        {prev && (
                          <span className={`flex items-center gap-1 text-xs font-mono ${diff < 0 ? 'text-accent' : diff > 0 ? 'text-danger' : 'text-ink-muted'}`}>
                            {diff < 0 ? <TrendingDown size={12}/> : diff > 0 ? <TrendingUp size={12}/> : <Minus size={12}/>}
                            {diff !== 0 ? `${diff > 0 ? '+' : ''}${diff.toFixed(1)}kg` : 'igual'}
                          </span>
                        )}
                        <span className="text-xs text-ink-faint">{formatDate(rec.recordedAt)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card>
      <CardContent className="py-4">
        <p className="text-xs text-ink-muted uppercase tracking-wide mb-1">{label}</p>
        <p className="font-mono text-xl text-ink font-medium">{value}</p>
        <p className="text-xs text-ink-faint mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({ to, icon, label }: { to: string; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-ink-muted hover:text-ink hover:bg-raised transition-colors"
    >
      <span className="text-accent">{icon}</span>
      {label}
      <ChevronRight size={14} className="ml-auto opacity-40" />
    </Link>
  );
}
