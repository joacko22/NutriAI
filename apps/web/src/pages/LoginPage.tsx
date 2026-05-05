import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/api/client';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" aria-hidden="true">
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  const navigate   = useNavigate();
  const login      = useAuthStore((s) => s.login);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      login(data);
      navigate('/');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-surface border-r border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,hsl(120_25%_12%),transparent_60%)]" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-16">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent/15 border border-accent/25">
              <span className="text-accent font-serif text-base font-bold">N</span>
            </div>
            <span className="font-serif text-xl text-ink">NutriAI</span>
          </div>
          <h1 className="font-serif text-4xl text-ink leading-tight mb-4">
            Tu nutricionista<br />
            <span className="italic text-accent">inteligente</span>
          </h1>
          <p className="text-ink-muted leading-relaxed max-w-sm">
            Planes alimentarios personalizados, seguimiento de composición corporal y asesoramiento clínico con IA.
          </p>
        </div>
        <div className="relative flex gap-6">
          {[
            { value: 'Harris-Benedict', label: 'Fórmula nutricional' },
            { value: 'SSE',            label: 'Streaming en tiempo real' },
            { value: 'Gemini 2.0',     label: 'AI provider primario' },
          ].map((stat) => (
            <div key={stat.label}>
              <p className="font-mono text-sm text-accent">{stat.value}</p>
              <p className="text-xs text-ink-faint mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-sm animate-fade-up">
          <div className="mb-8">
            <h2 className="font-serif text-2xl text-ink mb-1">Bienvenido de vuelta</h2>
            <p className="text-sm text-ink-muted">Ingresá tus credenciales para continuar</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Email"
              type="email"
              placeholder="vos@ejemplo.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
            <Input
              label="Contraseña"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />

            {error && (
              <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <Button type="submit" className="w-full" loading={loading}>
              Iniciar sesión
            </Button>
          </form>

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-base px-3 text-ink-faint">o continuá con</span>
            </div>
          </div>

          <Button
            type="button"
            variant="outline"
            className="w-full"
            onClick={() => { window.location.href = `${import.meta.env.VITE_API_URL}/api/v1/auth/google`; }}
          >
            <GoogleIcon />
            Continuar con Google
          </Button>

          <p className="mt-6 text-center text-sm text-ink-muted">
            ¿No tenés cuenta?{' '}
            <Link to="/register" className="text-accent hover:text-accent-light transition-colors">
              Registrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
