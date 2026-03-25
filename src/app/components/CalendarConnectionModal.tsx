import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';

interface CalendarConnectionModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  onConnect: (credentials: any) => void;
  isConnecting?: boolean;
  connectError?: string | null;
  initialAuthMethod?: 'oauth' | 'manual';
}

export function CalendarConnectionModal({
  open,
  onClose,
  providerId,
  providerName,
  onConnect,
  isConnecting = false,
  connectError = null,
  initialAuthMethod = 'oauth',
}: CalendarConnectionModalProps) {
  const [authMethod, setAuthMethod] = useState<'oauth' | 'manual'>(initialAuthMethod);
  const [credentials, setCredentials] = useState({
    clientId: '',
    clientSecret: '',
    iCalUrl: '',
    email: '',
  });

  useEffect(() => {
    if (open) {
      setAuthMethod(initialAuthMethod);
    }
  }, [open, providerId, initialAuthMethod]);

  const handleOAuthConnect = () => {
    // Simulate OAuth flow
    const mockAccessToken = `${providerId}_access_${Date.now()}`;
    const mockRefreshToken = `${providerId}_refresh_${Date.now()}`;
    
    onConnect({
      accessToken: mockAccessToken,
      refreshToken: mockRefreshToken,
      method: 'oauth',
    });
  };

  const handleManualConnect = () => {
    onConnect({
      ...credentials,
      method: 'manual',
      accessToken: `${providerId}_manual_${Date.now()}`,
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
            <TabsTrigger value="manual" style={{ color: '#E5E7EB' }}>Manual Config</TabsTrigger>
          </TabsList>

          <TabsContent value="oauth" className="space-y-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm mb-3" style={{ color: '#9CA3AF' }}>
                Click below to authenticate with {providerName}. You'll be redirected to authorize SyncFlow.
              </p>
              <div className="flex items-center gap-2 text-xs" style={{ color: '#22D3EE' }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#22D3EE' }}></div>
                <span>Secure OAuth 2.0 Flow</span>
              </div>
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

          <TabsContent value="manual" className="space-y-4">
            {providerId === 'apple' ? (
              <div className="space-y-3" data-onboarding="modal-manual-field">
                <div>
                  <Label style={{ color: '#E5E7EB' }}>iCal Feed URL</Label>
                  <Input
                    placeholder="webcal://..."
                    value={credentials.iCalUrl}
                    onChange={(e) => setCredentials({ ...credentials, iCalUrl: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>
              </div>
            ) : (
              <div className="space-y-3" data-onboarding="modal-manual-field">
                <div>
                  <Label style={{ color: '#E5E7EB' }}>Client ID</Label>
                  <Input
                    placeholder="Your client ID"
                    value={credentials.clientId}
                    onChange={(e) => setCredentials({ ...credentials, clientId: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>
                <div>
                  <Label style={{ color: '#E5E7EB' }}>Client Secret</Label>
                  <Input
                    type="password"
                    placeholder="Your client secret"
                    value={credentials.clientSecret}
                    onChange={(e) => setCredentials({ ...credentials, clientSecret: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>
              </div>
            )}

            <Button 
              data-onboarding="modal-authorize"
              onClick={handleManualConnect}
              disabled={isConnecting}
              className="w-full" 
              variant="outline"
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              {isConnecting ? 'Connecting...' : 'Connect Manually'}
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
            🔒 All credentials are stored locally using AES-256 encryption
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
