import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';

export function RegisterSuccessLoading() {
  const navigate = useNavigate();
  const location = useLocation();

  const email = (location.state as { email?: string } | null)?.email;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      navigate('/login', { state: { email } });
    }, 1500);

    return () => window.clearTimeout(timer);
  }, [navigate, email]);

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0F172A' }}
    >
      <div className="text-center">
        <div
          className="animate-spin rounded-full h-14 w-14 border-b-2 mx-auto mb-4"
          style={{ borderColor: '#6366F1' }}
        />
        <h1 className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>
          Account Created Successfully
        </h1>
        <p className="mt-2" style={{ color: '#9CA3AF' }}>
          Preparing your login page...
        </p>
      </div>
    </div>
  );
}
