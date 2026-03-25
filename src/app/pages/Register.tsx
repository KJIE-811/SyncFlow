import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';
import { AlertCircle } from 'lucide-react';

export function Register() {
  const navigate = useNavigate();
  const { register } = useAuth();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password length
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    const result = await register({ name, email, password });

    if (result.success) {
      navigate('/register/success', { state: { email } });
    } else {
      setError(result.error || 'Registration failed');
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
            Create Account
          </CardTitle>
          <CardDescription className="text-center" style={{ color: '#9CA3AF' }}>
            Sign up to start using SyncFlow
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
              <Label htmlFor="name" style={{ color: '#E5E7EB' }}>Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
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
              <Label htmlFor="email" style={{ color: '#E5E7EB' }}>Email</Label>
              <Input
                id="email"
                type="email"
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
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" style={{ color: '#E5E7EB' }}>
                Confirm Password
              </Label>
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
                  color: '#E5E7EB'
                }}
              />
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
              {isLoading ? 'Creating account...' : 'Create Account'}
            </Button>

            <div className="text-center text-sm" style={{ color: '#9CA3AF' }}>
              Already have an account?{' '}
              <Link 
                to="/login" 
                className="font-medium hover:underline"
                style={{ color: '#6366F1' }}
              >
                Sign in
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
