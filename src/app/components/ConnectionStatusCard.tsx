import { Link } from 'react-router';
import { Calendar, CheckSquare, MessageSquare, Plus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { useIntegrations } from '../contexts/IntegrationContext';

export function ConnectionStatusCard() {
  const { state } = useIntegrations();

  const connectedCalendars = state.calendars.filter(c => c.connected);
  const connectedTasks = state.tasks.filter(t => t.connected);
  const connectedChats = state.chats.filter(c => c.connected);

  const sections = [
    {
      title: 'Calendars',
      icon: Calendar,
      connected: connectedCalendars,
      total: state.calendars.length,
      link: '/integration/calendar',
      color: '#6366F1',
    },
    {
      title: 'Tasks',
      icon: CheckSquare,
      connected: connectedTasks,
      total: state.tasks.length,
      link: '/integration/tasks',
      color: '#22D3EE',
    },
    {
      title: 'Chat',
      icon: MessageSquare,
      connected: connectedChats,
      total: state.chats.length,
      link: '/integration/chat',
      color: '#6366F1',
    },
  ];

  return (
    <Card style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
      <CardHeader>
        <CardTitle style={{ color: '#E5E7EB' }}>Quick Connect</CardTitle>
        <CardDescription style={{ color: '#9CA3AF' }}>
          Manage your integrations
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Link
              key={section.title}
              to={section.link}
              className="block p-3 rounded-lg hover:bg-opacity-50 transition-all"
              style={{ backgroundColor: '#0F172A' }}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Icon className="w-5 h-5" style={{ color: section.color }} />
                  <div>
                    <p className="font-medium" style={{ color: '#E5E7EB' }}>{section.title}</p>
                    <p className="text-xs" style={{ color: '#9CA3AF' }}>
                      {section.connected.length} of {section.total} connected
                    </p>
                  </div>
                </div>
                {section.connected.length < section.total && (
                  <Plus className="w-4 h-4" style={{ color: section.color }} />
                )}
              </div>
            </Link>
          );
        })}
      </CardContent>
    </Card>
  );
}
