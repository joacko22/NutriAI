import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { authApi } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { ApiError } from '@/api/client';

export default function RegisterPage() {
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm]   = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Las contraseñas no coinciden'); return; }
    if (password.length < 6)  { setError('La contraseña debe tener al menos 6 caracteres'); return; }
    setLoading(true);
    try {
      const data = await authApi.register(email, password);
      login(data);
      navigate('/profile');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Error inesperado');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-8">
      <div className="w-full max-w-sm animate-fade-up">
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-6">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/15 border border-accent/25">
              <span className="text-accent font-serif text-sm font-bold">N</span>
            </div>
            <span className="font-serif text-base text-ink">NutriAI</span>
          </div>
          <h2 className="font-serif text-2xl text-ink mb-1">Creá tu cuenta</h2>
          <p className="text-sm text-ink-muted">Completá tu perfil después del registro para activar la IA</p>
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
            placeholder="Mínimo 6 caracteres"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="new-password"
          />
          <Input
            label="Confirmá la contraseña"
            type="password"
            placeholder="Repetí la contraseña"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
          />

          {error && (
            <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-3 py-2">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full" loading={loading}>
            Crear cuenta
          </Button>
        </form>

        <p className="mt-6 text-center text-sm text-ink-muted">
          ¿Ya tenés cuenta?{' '}
          <Link to="/login" className="text-accent hover:text-accent-light transition-colors">
            Iniciá sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
