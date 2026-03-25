import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const state = location.state as { email?: string } | null;
    if (state?.email) {
      setEmail(state.email);
    }
  }, [location.state]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    const result = await login({ email, password });

    if (result.success) {
      navigate('/');
    } else {
      setError(result.error || 'Login failed');
    }

    setIsLoading(false);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4" 
      style={{ backgroundColor: '#0F172A' }}
    >
      <Card className="w-full max-w-md" style={{ 
        backgroundColor: '#1E293B', 
        borderColor: '#334155' 
      }}>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-bold" style={{ color: '#6366F1' }}>SyncFlow</h1>
            <span className="ml-2 text-sm" style={{ color: '#22D3EE' }}>v1.0</span>
          </div>
          <CardTitle className="text-2xl text-center" style={{ color: '#E5E7EB' }}>
            Welcome Back
          </CardTitle>
          <CardDescription className="text-center" style={{ color: '#9CA3AF' }}>
            Sign in to your account to continue
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="email" style={{ color: '#E5E7EB' }}>Email</Label>
              <Input
                id="email"
                type="text"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                style={{ 
                  backgroundColor: '#0F172A', 
                  borderColor: '#334155',
                  color: '#E5E7EB'
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" style={{ color: '#E5E7EB' }}>Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{ 
                  backgroundColor: '#0F172A', 
                  borderColor: '#334155',
                  color: '#E5E7EB'
                }}
              />
              <div className="text-right">
                <Link
                  to="/forgot-password"
                  className="text-sm font-medium hover:underline"
                  style={{ color: '#22D3EE' }}
                >
                  Forgot password?
                </Link>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full"
              disabled={isLoading}
              style={{ 
                backgroundColor: '#6366F1',
                color: '#FFFFFF'
              }}
            >
              {isLoading ? 'Signing in...' : 'Sign In'}
            </Button>

            <div className="text-center text-sm" style={{ color: '#9CA3AF' }}>
              Don't have an account?{' '}
              <Link 
                to="/register" 
                className="font-medium hover:underline"
                style={{ color: '#6366F1' }}
              >
                Sign up
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
