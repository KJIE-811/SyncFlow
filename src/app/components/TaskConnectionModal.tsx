import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface TaskConnectionModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  onConnect: (credentials: any) => void;
  isConnecting?: boolean;
  connectError?: string | null;
  initialAuthMethod?: 'oauth' | 'apikey';
}

export function TaskConnectionModal({
  open,
  onClose,
  providerId,
  providerName,
  onConnect,
  isConnecting = false,
  connectError = null,
  initialAuthMethod = 'oauth',
}: TaskConnectionModalProps) {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'apikey'>(initialAuthMethod);
  const [credentials, setCredentials] = useState({
    apiKey: '',
    email: '',
  });

  useEffect(() => {
    if (open) {
      setAuthMethod(initialAuthMethod);
    }
  }, [open, providerId, initialAuthMethod]);

  const handleOAuthConnect = () => {
    const mockAccessToken = `${providerId}_access_${Date.now()}`;
    
    onConnect({
      accessToken: mockAccessToken,
      method: 'oauth',
    });
  };

  const handleApiKeyConnect = () => {
    onConnect({
      apiKey: credentials.apiKey,
      email: credentials.email,
      method: 'apikey',
      accessToken: `${providerId}_apikey_${Date.now()}`,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="max-w-md"
        style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#E5E7EB' }}>Connect {providerName}</DialogTitle>
          <DialogDescription style={{ color: '#9CA3AF' }}>
            Choose your preferred authentication method
          </DialogDescription>
        </DialogHeader>

        <Tabs value={authMethod} onValueChange={(v) => setAuthMethod(v as any)}>
          <TabsList data-onboarding="modal-auth-method" className="grid w-full grid-cols-2" style={{ backgroundColor: '#0F172A' }}>
            <TabsTrigger value="oauth" style={{ color: '#E5E7EB' }}>OAuth 2.0</TabsTrigger>
            <TabsTrigger value="apikey" style={{ color: '#E5E7EB' }}>API Key</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                Authenticate with {providerName} using OAuth 2.0 for secure, token-based access.
              </p>
              <ul className="text-xs space-y-1" style={{ color: '#9CA3AF' }}>
                <li>✓ Two-way sync enabled</li>
                <li>✓ Full task CRUD operations</li>
                <li>✓ Real-time updates</li>
              </ul>
            </div>

            <Button 
              data-onboarding="modal-authorize"
              onClick={handleOAuthConnect}
              disabled={isConnecting}
              className="w-full" 
              style={{ backgroundColor: '#6366F1', color: '#fff' }}
            >
              {isConnecting ? 'Connecting...' : `Authorize ${providerName}`}
            </Button>
          </TabsContent>

          <TabsContent value="apikey" className="space-y-4">
            {providerId === 'todoist' && (
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#6366F120', color: '#22D3EE' }}>
                💡 Find your API token in Todoist Settings → Integrations → API token
              </div>
            )}

            <div className="space-y-3" data-onboarding="modal-manual-field">
              <div>
                <Label style={{ color: '#E5E7EB' }}>API Key / Token</Label>
                <Input
                  type="password"
                  placeholder="Your API key"
                  value={credentials.apiKey}
                  onChange={(e) => setCredentials({ ...credentials, apiKey: e.target.value })}
                  className="mt-1"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                />
              </div>

              {providerId !== 'todoist' && (
                <div>
                  <Label style={{ color: '#E5E7EB' }}>Account Email (Optional)</Label>
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>
              )}
            </div>

            <Button 
              data-onboarding="modal-authorize"
              onClick={handleApiKeyConnect}
              disabled={isConnecting || !credentials.apiKey}
              className="w-full" 
              variant="outline"
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              {isConnecting ? 'Connecting...' : 'Connect with API Key'}
            </Button>
          </TabsContent>
        </Tabs>

        {connectError && (
          <div className="rounded-lg p-3" style={{ backgroundColor: '#EF444420', border: '1px solid #EF4444' }}>
            <p className="text-sm" style={{ color: '#FCA5A5' }}>
              {connectError}
            </p>
          </div>
        )}

        <div className="pt-2 border-t" style={{ borderColor: '#374151' }}>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            🔒 API keys are encrypted and stored locally in IndexedDB
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
