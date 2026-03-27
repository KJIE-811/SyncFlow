import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';

interface ChatConnectionModalProps {
  open: boolean;
  onClose: () => void;
  providerId: string;
  providerName: string;
  onConnect: (credentials: any) => void;
  isConnecting?: boolean;
  connectError?: string | null;
}

export function ChatConnectionModal({
  open,
  onClose,
  providerId,
  providerName,
  onConnect,
  isConnecting = false,
  connectError = null,
}: ChatConnectionModalProps) {
  const requiredFieldGuidance: Record<string, string[]> = {
    whatsapp: ['QR Code Scan'],
    telegram: ['QR Code Scan'],
    messenger: ['Page Access Token'],
  };

  const [credentials, setCredentials] = useState({
    apiToken: '',
    webhookUrl: '',
    phoneNumberId: '',
    botToken: '',
    verifyToken: '',
  });

  const showQrConnect = providerId === 'whatsapp' || providerId === 'telegram';
  const qrConnectPayload = `syncflow-${providerId}-connect:${providerName.toLowerCase()}`;
  const qrCodeUrl = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(qrConnectPayload)}`;

  const handleConnect = () => {
    if (showQrConnect) return;
    onConnect(credentials);
  };

  const handleMockQrScanned = () => {
    if (providerId === 'whatsapp') {
      onConnect({
        ...credentials,
        apiToken: credentials.apiToken || 'mock_whatsapp_access_token',
        phoneNumberId: credentials.phoneNumberId || '1234567890123456',
        webhookUrl: credentials.webhookUrl || 'https://mock.syncflow.local/webhook/whatsapp',
        verifyToken: credentials.verifyToken || 'mock_whatsapp_verify_token',
      });
      return;
    }

    if (providerId === 'telegram') {
      onConnect({
        ...credentials,
        botToken: credentials.botToken || 'mock_telegram_bot_token',
        webhookUrl: credentials.webhookUrl || 'https://mock.syncflow.local/webhook/telegram',
      });
    }
  };

  return (
    <Dialog
      open={open}
      modal={false}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose();
      }}
    >
      <DialogContent 
        className="max-w-md max-h-[90vh] overflow-y-auto"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#E5E7EB' }}>Configure {providerName}</DialogTitle>
          <DialogDescription style={{ color: '#9CA3AF' }}>
            {showQrConnect
              ? 'Scan QR code to connect and enable chat-to-task conversion'
              : 'Enter your API credentials to enable chat-to-task conversion'}
          </DialogDescription>
        </DialogHeader>

        <div
          className="rounded-lg p-3"
          style={{ backgroundColor: '#22D3EE20', border: '1px solid #22D3EE40' }}
        >
          <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: '#22D3EE' }}>
            Required fields
          </p>
          <p className="mt-1 text-sm" style={{ color: '#E5E7EB' }}>
            {(requiredFieldGuidance[providerId] || []).join(' and ')}
          </p>
        </div>

        {showQrConnect && (
          <div
            data-onboarding="qr-connect-panel"
            className="rounded-lg p-4 space-y-3"
            style={{ backgroundColor: '#0F172A', border: '1px solid #374151' }}
          >
            <div className="flex items-center justify-between gap-2">
              <div>
                <p className="text-sm font-semibold" style={{ color: '#E5E7EB' }}>Scan QR to Connect</p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Open {providerName} on your phone and scan this code to link your channel.
                </p>
              </div>
              <div className="rounded-md px-2 py-1 text-xs font-medium" style={{ backgroundColor: '#22D3EE20', color: '#22D3EE' }}>
                Scan Option
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <img
                src={qrCodeUrl}
                alt={`${providerName} connection QR code`}
                className="h-40 w-40 rounded-md border bg-white p-2"
                style={{ borderColor: '#374151' }}
              />

              <div className="flex-1 space-y-2">
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  This is a mock QR connection flow for demo and testing.
                </p>
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  QR scan is the only supported connection method for {providerName} in this screen.
                </p>
                <Button
                  data-onboarding="qr-mock-connect"
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={handleMockQrScanned}
                  disabled={isConnecting}
                  style={{ borderColor: '#22D3EE', color: '#22D3EE' }}
                >
                  Mock: Already Scanned QR
                </Button>
              </div>
            </div>
          </div>
        )}

        {!showQrConnect && (
          <div className="space-y-4" data-onboarding="modal-credentials">
          {/* Messenger Configuration */}
            {providerId === 'messenger' && (
              <>
                <div className="p-2 rounded-lg text-xs" style={{ backgroundColor: '#6366F120', color: '#22D3EE' }}>
                  Get credentials from Meta for Developers.
                </div>

                <div data-onboarding="required-field-messenger">
                  <Label style={{ color: '#E5E7EB' }}>Page Access Token</Label>
                  <Input
                    type="password"
                    placeholder="EAAxxxxxxxxxx..."
                    value={credentials.apiToken}
                    onChange={(e) => setCredentials({ ...credentials, apiToken: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>

                <div>
                  <Label style={{ color: '#E5E7EB' }}>Verify Token</Label>
                  <Input
                    placeholder="Your verification token"
                    value={credentials.verifyToken}
                    onChange={(e) => setCredentials({ ...credentials, verifyToken: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>

                <div>
                  <Label style={{ color: '#E5E7EB' }}>Webhook URL</Label>
                  <Input
                    placeholder="https://your-domain.com/messenger-webhook"
                    value={credentials.webhookUrl}
                    onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                    className="mt-1"
                    style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                  />
                </div>
              </>
            )}

            <Button
              data-onboarding="modal-authorize"
              onClick={handleConnect}
              className="w-full"
              style={{ backgroundColor: '#6366F1', color: '#fff' }}
              disabled={isConnecting || !credentials.apiToken}
            >
              {isConnecting ? 'Connecting...' : `Connect ${providerName}`}
            </Button>
          </div>
        )}

        {connectError && (
          <div className="rounded-lg p-3" style={{ backgroundColor: '#EF444420', border: '1px solid #EF4444' }}>
            <p className="text-sm" style={{ color: '#FCA5A5' }}>
              {connectError}
            </p>
          </div>
        )}

        <div className="pt-2 border-t" style={{ borderColor: '#374151' }}>
          <p className="text-xs" style={{ color: '#9CA3AF' }}>
            🔒 All tokens are encrypted with AES-256 and stored locally
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
