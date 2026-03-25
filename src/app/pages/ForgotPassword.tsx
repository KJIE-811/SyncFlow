import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export function ForgotPassword() {
  const navigate = useNavigate();
  const { resetPassword } = useAuth();

  const [email, setEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const result = await resetPassword({ email, newPassword });

    if (result.success) {
      setSuccess('Password reset successfully. Redirecting to sign in...');
      setTimeout(() => {
        navigate('/login');
      }, 1200);
    } else {
      setError(result.error || 'Failed to reset password');
    }

    setIsLoading(false);
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: '#0F172A' }}
    >
      <Card className="w-full max-w-md" style={{ backgroundColor: '#1E293B', borderColor: '#334155' }}>
        <CardHeader className="space-y-2">
          <div className="flex items-center justify-center mb-4">
            <h1 className="text-3xl font-bold" style={{ color: '#6366F1' }}>SyncFlow</h1>
            <span className="ml-2 text-sm" style={{ color: '#22D3EE' }}>v1.0</span>
          </div>
          <CardTitle className="text-2xl text-center" style={{ color: '#E5E7EB' }}>
            Reset Password
          </CardTitle>
          <CardDescription className="text-center" style={{ color: '#9CA3AF' }}>
            Enter your account email and set a new password
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

            {success && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{success}</AlertDescription>
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
                  color: '#E5E7EB',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword" style={{ color: '#E5E7EB' }}>New Password</Label>
              <Input
                id="newPassword"
                type="password"
                placeholder="••••••••"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  color: '#E5E7EB',
                }}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={{ color: '#E5E7EB' }}>Confirm New Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={isLoading}
                style={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  color: '#E5E7EB',
                }}
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isLoading}
              style={{ backgroundColor: '#6366F1', color: '#FFFFFF' }}
            >
              {isLoading ? 'Resetting...' : 'Reset Password'}
            </Button>

            <div className="text-center text-sm" style={{ color: '#9CA3AF' }}>
              Remembered your password?{' '}
              <Link to="/login" className="font-medium hover:underline" style={{ color: '#6366F1' }}>
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}