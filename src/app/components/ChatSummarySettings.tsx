import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { Label } from './ui/label';
import { Switch } from './ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Input } from './ui/input';
import { useIntegrations } from '../contexts/IntegrationContext';

interface ChatSummarySettingsProps {
  open: boolean;
  onClose: () => void;
}

const MALAYSIA_TIMEZONE = 'Asia/Kuala_Lumpur';

const getMalaysiaClock = () => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: MALAYSIA_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).formatToParts(new Date());

  const readPart = (type: 'hour' | 'minute' | 'second') =>
    Number(parts.find(part => part.type === type)?.value ?? '0');

  return {
    hour: readPart('hour'),
    minute: readPart('minute'),
    second: readPart('second'),
  };
};

const formatCountdown = (totalSeconds: number) => {
  const safeSeconds = Math.max(0, totalSeconds);
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;

  return [hours, minutes, seconds]
    .map(value => value.toString().padStart(2, '0'))
    .join(':');
};

const formatHourTarget = (hour24: number) => {
  const normalized = ((hour24 % 24) + 24) % 24;
  const hour12 = normalized % 12 === 0 ? 12 : normalized % 12;
  const period = normalized >= 12 ? 'PM' : 'AM';
  return `${hour12.toString().padStart(2, '0')}:00 ${period} MYT`;
};

export function ChatSummarySettings({ open, onClose }: ChatSummarySettingsProps) {
  const { state, updateChatSummarySettings } = useIntegrations();
  const settings = state.chatSummarySettings || {
    enableAutoSummary: false,
    summaryInterval: 'realtime' as const,
    selectedChannels: [],
    keywordFilters: [],
    autoConvertTasks: false,
  };

  const [localSettings, setLocalSettings] = useState(settings);
  const [summaryCountdown, setSummaryCountdown] = useState('');
  const [nextSummaryTarget, setNextSummaryTarget] = useState('');

  const connectedChats = state.chats.filter(c => c.connected);

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings, open]);

  useEffect(() => {
    if (!open || !localSettings.enableAutoSummary || localSettings.summaryInterval === 'realtime') {
      setSummaryCountdown('');
      setNextSummaryTarget('');
      return;
    }

    const updateCountdown = () => {
      const { hour, minute, second } = getMalaysiaClock();

      if (localSettings.summaryInterval === 'hourly') {
        const elapsedThisHour = minute * 60 + second;
        const secondsUntilNextHour = elapsedThisHour === 0 ? 3600 : 3600 - elapsedThisHour;
        const nextHour = (hour + 1) % 24;
        setSummaryCountdown(formatCountdown(secondsUntilNextHour));
        setNextSummaryTarget(formatHourTarget(nextHour));
        return;
      }

      const elapsedToday = hour * 3600 + minute * 60 + second;
      const secondsUntilMidnight = elapsedToday === 0 ? 86400 : 86400 - elapsedToday;
      setSummaryCountdown(formatCountdown(secondsUntilMidnight));
      setNextSummaryTarget('12:00 AM MYT (00:00)');
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);

    return () => {
      window.clearInterval(timer);
    };
  }, [open, localSettings.enableAutoSummary, localSettings.summaryInterval]);

  const handleSave = () => {
    updateChatSummarySettings(localSettings);
    onClose();
  };

  const toggleChannel = (channelId: string) => {
    setLocalSettings(prev => ({
      ...prev,
      selectedChannels: prev.selectedChannels.includes(channelId)
        ? prev.selectedChannels.filter(id => id !== channelId)
        : [...prev.selectedChannels, channelId],
    }));
  };

  const handleKeywordAdd = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && e.currentTarget.value.trim()) {
      setLocalSettings(prev => ({
        ...prev,
        keywordFilters: [...prev.keywordFilters, e.currentTarget.value.trim()],
      }));
      e.currentTarget.value = '';
    }
  };

  const removeKeyword = (keyword: string) => {
    setLocalSettings(prev => ({
      ...prev,
      keywordFilters: prev.keywordFilters.filter(k => k !== keyword),
    }));
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent style={{ backgroundColor: '#1E293B', borderColor: '#374151', maxWidth: '500px' }}>
        <DialogHeader>
          <DialogTitle style={{ color: '#E5E7EB', fontSize: '1.5rem' }}>
            Chat Summary Settings
          </DialogTitle>
          <DialogDescription style={{ color: '#9CA3AF' }}>
            Customize how SyncFlow analyzes and summarizes your chat messages
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Enable Auto Summary */}
          <div className="flex items-center justify-between">
            <div>
              <Label style={{ color: '#E5E7EB' }}>Enable Auto-Summary</Label>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Automatically generate message summaries
              </p>
            </div>
            <Switch
              checked={localSettings.enableAutoSummary}
              onCheckedChange={(checked) =>
                setLocalSettings(prev => ({ ...prev, enableAutoSummary: checked }))
              }
            />
          </div>

          {/* Summary Interval */}
          <div className="space-y-2">
            <Label style={{ color: '#E5E7EB' }}>Summary Interval</Label>
            <Select
              value={localSettings.summaryInterval}
              onValueChange={(value: 'hourly' | 'daily' | 'realtime') =>
                setLocalSettings(prev => ({ ...prev, summaryInterval: value }))
              }
              disabled={!localSettings.enableAutoSummary}
            >
              <SelectTrigger style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
                <SelectItem value="realtime" className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white cursor-pointer" style={{ color: '#E5E7EB' }}>Real-time</SelectItem>
                <SelectItem value="hourly" className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white cursor-pointer" style={{ color: '#E5E7EB' }}>Every Hour</SelectItem>
                <SelectItem value="daily" className="hover:bg-slate-700 focus:bg-slate-700 focus:text-white cursor-pointer" style={{ color: '#E5E7EB' }}>Daily</SelectItem>
              </SelectContent>
            </Select>

            {localSettings.enableAutoSummary && localSettings.summaryInterval !== 'realtime' && (
              <div
                className="p-3 rounded-lg"
                style={{ backgroundColor: '#0F172A', border: '1px solid #374151' }}
              >
                <p className="text-xs" style={{ color: '#9CA3AF' }}>
                  Malaysia schedule preview (MYT)
                </p>
                <p className="text-sm mt-1" style={{ color: '#E5E7EB' }}>
                  Target: {nextSummaryTarget}
                </p>
                <p className="text-sm" style={{ color: '#22D3EE' }}>
                  Countdown: {summaryCountdown}
                </p>
              </div>
            )}
          </div>

          {/* Selected Channels */}
          <div className="space-y-2">
            <Label style={{ color: '#E5E7EB' }}>Summarize Channels</Label>
            <div className="space-y-2">
              {connectedChats.length > 0 ? (
                connectedChats.map(chat => (
                  <div
                    key={chat.id}
                    className="flex items-center justify-between p-3 rounded-lg"
                    style={{ backgroundColor: '#0F172A' }}
                  >
                    <span style={{ color: '#E5E7EB' }}>{chat.name}</span>
                    <Switch
                      checked={localSettings.selectedChannels.includes(chat.id)}
                      onCheckedChange={() => toggleChannel(chat.id)}
                      disabled={!localSettings.enableAutoSummary}
                    />
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  No chat channels connected
                </p>
              )}
            </div>
          </div>

          {/* Auto Convert Tasks */}
          <div className="flex items-center justify-between">
            <div>
              <Label style={{ color: '#E5E7EB' }}>Auto-Convert /task Commands</Label>
              <p className="text-sm mt-1" style={{ color: '#9CA3AF' }}>
                Automatically create tasks from /task mentions
              </p>
            </div>
            <Switch
              checked={localSettings.autoConvertTasks}
              onCheckedChange={(checked) =>
                setLocalSettings(prev => ({ ...prev, autoConvertTasks: checked }))
              }
            />
          </div>

          {/* Keyword Filters */}
          <div className="space-y-2">
            <Label style={{ color: '#E5E7EB' }}>Keyword Filters</Label>
            <Input
              placeholder="Type keyword and press Enter"
              onKeyDown={handleKeywordAdd}
              style={{ backgroundColor: '#0F172A', borderColor: '#374151', color: '#E5E7EB' }}
              disabled={!localSettings.enableAutoSummary}
            />
            <div className="flex flex-wrap gap-2 mt-2">
              {localSettings.keywordFilters.map(keyword => (
                <span
                  key={keyword}
                  className="px-3 py-1 rounded-full text-sm flex items-center gap-2"
                  style={{ backgroundColor: '#6366F120', color: '#6366F1' }}
                >
                  {keyword}
                  <button
                    onClick={() => removeKeyword(keyword)}
                    className="hover:opacity-70"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button
            variant="outline"
            onClick={onClose}
            style={{ borderColor: '#374151', color: '#9CA3AF' }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            style={{ backgroundColor: '#6366F1', color: '#fff' }}
          >
            Save Settings
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
