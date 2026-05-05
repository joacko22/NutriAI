import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth.store';
import { FullScreenSpinner } from '@/components/ui/Spinner';

export default function OAuthCallbackPage() {
  const navigate = useNavigate();
  const login    = useAuthStore((s) => s.login);

  useEffect(() => {
    const params       = new URLSearchParams(window.location.search);
    const accessToken  = params.get('accessToken');
    const refreshToken = params.get('refreshToken');
    const userId       = params.get('userId');
    const userEmail    = params.get('userEmail');
    const userRole     = params.get('userRole');
    const isNewUser    = params.get('isNewUser') === 'true';
    const error        = params.get('error');

    if (error || !accessToken || !refreshToken || !userId || !userEmail || !userRole) {
      navigate('/login?error=oauth_failed', { replace: true });
      return;
    }

    login({
      accessToken,
      refreshToken,
      user: { id: userId, email: userEmail, role: userRole },
    });
    navigate(isNewUser ? '/profile' : '/', { replace: true });
  }, [login, navigate]);

  return <FullScreenSpinner />;
}
