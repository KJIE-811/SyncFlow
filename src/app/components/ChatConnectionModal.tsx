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
    whatsapp: ['Access Token', 'Phone Number ID'],
    telegram: ['Bot Token'],
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
        className="max-w-md"
        onInteractOutside={(event) => event.preventDefault()}
        onPointerDownOutside={(event) => event.preventDefault()}
        style={{ backgroundColor: '#1E293B', borderColor: '#6366F1' }}
      >
        <DialogHeader>
          <DialogTitle style={{ color: '#E5E7EB' }}>Configure {providerName}</DialogTitle>
          <DialogDescription style={{ color: '#9CA3AF' }}>
            Enter your API credentials to enable chat-to-task conversion
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

        <div className="space-y-4" data-onboarding="modal-credentials">
          {/* WhatsApp Configuration */}
          {providerId === 'whatsapp' && (
            <>
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#6366F120', color: '#22D3EE' }}>
                💡 Get credentials from Meta for Developers → WhatsApp Business Platform
              </div>

              <div data-onboarding="required-field-whatsapp">
                <Label style={{ color: '#E5E7EB' }}>Access Token</Label>
                <Input
                  type="password"
                  placeholder="EAAxxxxxxxxxx..."
                  value={credentials.apiToken}
                  onChange={(e) => setCredentials({ ...credentials, apiToken: e.target.value })}
                  className="mt-1"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                />
              </div>

              <div data-onboarding="required-field-whatsapp">
                <Label style={{ color: '#E5E7EB' }}>Phone Number ID</Label>
                <Input
                  placeholder="1234567890123456"
                  value={credentials.phoneNumberId}
                  onChange={(e) => setCredentials({ ...credentials, phoneNumberId: e.target.value })}
                  className="mt-1"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                />
              </div>

              <div>
                <Label style={{ color: '#E5E7EB' }}>Webhook URL</Label>
                <Input
                  placeholder="https://your-domain.com/webhook"
                  value={credentials.webhookUrl}
                  onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
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
            </>
          )}

          {/* Telegram Configuration */}
          {providerId === 'telegram' && (
            <>
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#6366F120', color: '#22D3EE' }}>
                💡 Create a bot with @BotFather on Telegram to get your token
              </div>

              <div data-onboarding="required-field-telegram">
                <Label style={{ color: '#E5E7EB' }}>Bot Token</Label>
                <Input
                  type="password"
                  placeholder="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"
                  value={credentials.botToken}
                  onChange={(e) => setCredentials({ ...credentials, botToken: e.target.value })}
                  className="mt-1"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                />
              </div>

              <div>
                <Label style={{ color: '#E5E7EB' }}>Webhook URL (Optional)</Label>
                <Input
                  placeholder="https://your-domain.com/telegram-webhook"
                  value={credentials.webhookUrl}
                  onChange={(e) => setCredentials({ ...credentials, webhookUrl: e.target.value })}
                  className="mt-1"
                  style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
                />
                <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>
                  Leave empty to use long polling
                </p>
              </div>
            </>
          )}

          {/* Messenger Configuration */}
          {providerId === 'messenger' && (
            <>
              <div className="p-3 rounded-lg text-xs" style={{ backgroundColor: '#6366F120', color: '#22D3EE' }}>
                💡 Get credentials from Meta for Developers → Messenger Platform
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
            disabled={
              isConnecting ||
              (
                providerId === 'whatsapp' 
                  ? !credentials.apiToken || !credentials.phoneNumberId
                  : providerId === 'telegram'
                  ? !credentials.botToken
                  : !credentials.apiToken
              )
            }
          >
            {isConnecting ? 'Connecting...' : `Connect ${providerName}`}
          </Button>
        </div>

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
