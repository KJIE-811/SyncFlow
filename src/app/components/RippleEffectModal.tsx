import { AlertTriangle, Zap, Calendar, Clock } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from './ui/dialog';
import { Button } from './ui/button';
import { useAI } from '../contexts/AIContext';
import { toast } from 'sonner';
import { useState } from 'react';

export function RippleEffectModal() {
  const { rippleEffect, dismissRippleEffect, applyScheduleChanges, autoApplyEnabled } = useAI();
  const [isApplying, setIsApplying] = useState(false);

  if (!rippleEffect.active) return null;

  const handleApplyOptimizations = async () => {
    setIsApplying(true);
    
    try {
      const result = await applyScheduleChanges(false); // false = don't require confirmation, apply now
      
      if (result.success) {
        toast.success('Schedule Optimized!', {
          description: `${result.appliedChanges.length} change(s) applied. ${autoApplyEnabled ? 'Notifications sent to connected chat.' : 'Check your calendar for updates.'}`,
          duration: 4000,
        });
        dismissRippleEffect();
      } else {
        toast.error('No Changes Applied', {
          description: 'No schedule changes met the confidence threshold.',
          duration: 3000,
        });
      }
    } catch (error) {
      toast.error('Failed to Apply Changes', {
        description: 'Something went wrong. Please try again.',
        duration: 3000,
      });
    } finally {
      setIsApplying(false);
    }
  };

  return (
    <Dialog open={rippleEffect.active} onOpenChange={dismissRippleEffect}>
      <DialogContent 
        className="max-w-2xl"
        style={{ backgroundColor: '#1E293B', borderColor: '#F59E0B', border: '2px solid' }}
      >
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg" style={{ backgroundColor: '#F59E0B20' }}>
              <Zap className="w-6 h-6" style={{ color: '#F59E0B' }} />
            </div>
            <div>
              <DialogTitle style={{ color: '#E5E7EB' }}>⚡ Ripple Effect Triggered</DialogTitle>
              <DialogDescription style={{ color: '#9CA3AF' }}>
                {rippleEffect.trigger || 'Schedule change detected'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4">
          {/* AI Recommendations */}
          <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <h3 className="flex items-center gap-2 mb-3" style={{ color: '#E5E7EB' }}>
              <AlertTriangle className="w-4 h-4" style={{ color: '#F59E0B' }} />
              AI Analysis
            </h3>
            <div className="space-y-2">
              {rippleEffect.recommendations.map((rec, index) => (
                <p key={index} className="text-sm" style={{ color: '#9CA3AF' }}>
                  {rec}
                </p>
              ))}
            </div>
          </div>

          {/* Affected Events */}
          {rippleEffect.affectedEvents.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <h3 className="flex items-center gap-2 mb-3" style={{ color: '#E5E7EB' }}>
                <Calendar className="w-4 h-4" style={{ color: '#6366F1' }} />
                Affected Events ({rippleEffect.affectedEvents.length})
              </h3>
              <div className="space-y-2">
                {rippleEffect.affectedEvents.map((event, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded"
                    style={{ backgroundColor: '#1E293B' }}
                  >
                    <div>
                      <p className="text-sm font-medium" style={{ color: '#E5E7EB' }}>
                        Event {event.id}
                      </p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {event.action}
                      </p>
                    </div>
                    {event.suggestedTime && (
                      <span 
                        className="text-xs px-2 py-1 rounded"
                        style={{ backgroundColor: '#22D3EE20', color: '#22D3EE' }}
                      >
                        {event.suggestedTime}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Buffer Adjustments */}
          {rippleEffect.bufferAdjustments.length > 0 && (
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <h3 className="flex items-center gap-2 mb-3" style={{ color: '#E5E7EB' }}>
                <Clock className="w-4 h-4" style={{ color: '#22D3EE' }} />
                Smart Buffer Adjustments ({rippleEffect.bufferAdjustments.length})
              </h3>
              <div className="space-y-2">
                {rippleEffect.bufferAdjustments.map((adjustment, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 rounded"
                    style={{ backgroundColor: '#1E293B' }}
                  >
                    <p className="text-sm" style={{ color: '#E5E7EB' }}>
                      Before {adjustment.beforeEvent}
                    </p>
                    <span 
                      className="text-sm font-medium"
                      style={{ color: '#22D3EE' }}
                    >
                      {adjustment.newBuffer} min
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button
              className="flex-1"
              style={{ backgroundColor: '#6366F1', color: '#fff' }}
              onClick={handleApplyOptimizations}
              disabled={isApplying}
            >
              {isApplying ? 'Applying...' : 'Apply Optimizations'}
            </Button>
            <Button
              className="flex-1"
              variant="outline"
              style={{ borderColor: '#374151', color: '#E5E7EB' }}
              onClick={dismissRippleEffect}
              disabled={isApplying}
            >
              Review Manually
            </Button>
          </div>

          <p className="text-xs text-center" style={{ color: '#9CA3AF' }}>
            💡 The Ripple Effect automatically re-balances your schedule when delays or changes occur
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
