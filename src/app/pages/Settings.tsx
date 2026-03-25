import { Shield, Database, Download, Trash2, Eye, EyeOff, Brain, Zap } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useIntegrations } from '../contexts/IntegrationContext';
import { useAI } from '../contexts/AIContext';
import { toast } from 'sonner';

export function Settings() {
  type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';
  type OnboardingStep = {
    id:
      | 'local-mode-banner'
      | 'privacy-security'
      | 'incognito-mode'
      | 'ai-automation'
      | 'auto-apply'
      | 'auto-apply-threshold'
      | 'learned-habits'
      | 'data-management'
      | 'data-exports'
      | 'smart-buffers'
      | 'danger-zone';
    action: string;
    instruction: string;
    microcopy: string;
    targetSelector: string;
    fallbackMessage: string;
  };

  const { state, toggleForceLocalOnly, updateCalendarTaskSync } = useIntegrations();
  const { 
    autoApplyEnabled, 
    toggleAutoApply, 
    autoApplyThreshold, 
    setAutoApplyThreshold,
    learnedHabits,
    refreshHabits 
  } = useAI();
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(true);
  const [hasUserRequestedTutorial, setHasUserRequestedTutorial] = useState(false);
  const [onboardingStepIndex, setOnboardingStepIndex] = useState(0);
  const [spotlightRect, setSpotlightRect] = useState<{ top: number; left: number; width: number; height: number } | null>(null);
  const [spotlightTargetMissing, setSpotlightTargetMissing] = useState(false);
  const [spotlightFallbackMessage, setSpotlightFallbackMessage] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState<{ top: number; left: number; placement: OnboardingPlacement }>({
    top: 24,
    left: 24,
    placement: 'bottom',
  });
  const tooltipRef = useRef<HTMLDivElement | null>(null);

  const onboardingSteps = useMemo<OnboardingStep[]>(() => [
    {
      id: 'local-mode-banner',
      action: 'Review processing mode',
      instruction: 'Use this banner to switch between Local-Only and API Sync modes.',
      microcopy: 'Local-Only is ideal when privacy is the top priority.',
      targetSelector: '[data-onboarding="local-mode-banner"]',
      fallbackMessage: 'Processing mode banner is unavailable.',
    },
    {
      id: 'privacy-security',
      action: 'Open Privacy & Security',
      instruction: 'Configure core privacy controls like encryption and tracking settings.',
      microcopy: 'Start here when tuning data visibility and protection.',
      targetSelector: '[data-onboarding="privacy-security"]',
      fallbackMessage: 'Privacy section is unavailable.',
    },
    {
      id: 'incognito-mode',
      action: 'Use Incognito Work Mode',
      instruction: 'Temporarily pause logging and tracking while keeping your session active.',
      microcopy: 'Quick toggle for sensitive work windows.',
      targetSelector: '[data-onboarding="incognito-mode"]',
      fallbackMessage: 'Incognito mode control is unavailable.',
    },
    {
      id: 'ai-automation',
      action: 'Review AI & Automation',
      instruction: 'This section controls automatic schedule decisions and learning behavior.',
      microcopy: 'Use with confidence controls to match your risk tolerance.',
      targetSelector: '[data-onboarding="ai-automation"]',
      fallbackMessage: 'AI & Automation section is unavailable.',
    },
    {
      id: 'auto-apply',
      action: 'Toggle auto-apply',
      instruction: 'Enable to let SyncFlow apply scheduling improvements automatically.',
      microcopy: 'Disable if you want manual confirmation before changes.',
      targetSelector: '[data-onboarding="auto-apply"]',
      fallbackMessage: 'Auto-apply control is unavailable.',
    },
    {
      id: 'auto-apply-threshold',
      action: 'Set confidence threshold',
      instruction: 'Adjust how confident AI must be before auto-apply triggers.',
      microcopy: 'Higher thresholds are safer, lower thresholds are more proactive.',
      targetSelector: '[data-onboarding="auto-apply-threshold"]',
      fallbackMessage: 'Confidence threshold control is unavailable.',
    },
    {
      id: 'learned-habits',
      action: 'Inspect learned habits',
      instruction: 'Review behavior patterns SyncFlow has learned and refresh them on demand.',
      microcopy: 'Great for validating whether recommendations match your real workflow.',
      targetSelector: '[data-onboarding="learned-habits"]',
      fallbackMessage: 'Learned habits panel is unavailable.',
    },
    {
      id: 'data-management',
      action: 'Review Data Management',
      instruction: 'Track storage and backup status before exporting or cleaning data.',
      microcopy: 'Use this as your central data-control panel.',
      targetSelector: '[data-onboarding="data-management"]',
      fallbackMessage: 'Data management section is unavailable.',
    },
    {
      id: 'data-exports',
      action: 'Export your data',
      instruction: 'Choose an export format for full data, tasks, calendar, or backup archive.',
      microcopy: 'Export regularly before major account or workflow changes.',
      targetSelector: '[data-onboarding="data-exports"]',
      fallbackMessage: 'Export actions are unavailable.',
    },
    {
      id: 'smart-buffers',
      action: 'Tune Smart Buffers',
      instruction: 'Set default buffers and adaptive scheduling behavior to reduce time conflicts.',
      microcopy: 'Combine fixed defaults with learning for best long-term results.',
      targetSelector: '[data-onboarding="smart-buffers"]',
      fallbackMessage: 'Smart Buffers settings are unavailable.',
    },
    {
      id: 'danger-zone',
      action: 'Handle destructive actions safely',
      instruction: 'Danger Zone actions are irreversible, so use them only when necessary.',
      microcopy: 'Export a backup first before resets or deletes.',
      targetSelector: '[data-onboarding="danger-zone"]',
      fallbackMessage: 'Danger Zone controls are unavailable.',
    },
  ], []);

  const currentOnboardingStep = onboardingSteps[onboardingStepIndex];

  const handleIncognitoToggle = (checked: boolean) => {
    setIncognitoMode(checked);
    // Incognito mode is separate from Force Local-Only
  };

  const getScrollableAncestors = (element: HTMLElement) => {
    const ancestors: HTMLElement[] = [];
    let parent = element.parentElement;

    while (parent) {
      const style = window.getComputedStyle(parent);
      const overflowY = style.overflowY;
      const overflowX = style.overflowX;
      const canScroll =
        (overflowY === 'auto' || overflowY === 'scroll' || overflowY === 'overlay' || overflowX === 'auto' || overflowX === 'scroll' || overflowX === 'overlay') &&
        (parent.scrollHeight > parent.clientHeight || parent.scrollWidth > parent.clientWidth);

      if (canScroll) ancestors.push(parent);
      parent = parent.parentElement;
    }

    return ancestors;
  };

  const ensureElementVisibility = (element: HTMLElement) => {
    const margin = 24;
    const rect = element.getBoundingClientRect();
    const outsideViewport = rect.top < margin || rect.bottom > window.innerHeight - margin;

    if (outsideViewport) {
      const targetY = window.scrollY + rect.top - window.innerHeight / 2 + rect.height / 2;
      window.scrollTo({ top: Math.max(0, targetY), behavior: 'smooth' });
    }

    const scrollableAncestors = getScrollableAncestors(element);
    scrollableAncestors.forEach((container) => {
      const containerRect = container.getBoundingClientRect();
      const targetRect = element.getBoundingClientRect();
      const outsideContainer = targetRect.top < containerRect.top + margin || targetRect.bottom > containerRect.bottom - margin;

      if (outsideContainer) {
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop;
        const targetScrollTop = relativeTop - container.clientHeight / 2 + targetRect.height / 2;
        container.scrollTo({ top: Math.max(0, targetScrollTop), behavior: 'smooth' });
      }
    });
  };

  const computeTooltipPlacement = (
    rect: { top: number; left: number; width: number; height: number },
    tooltipWidth: number,
    tooltipHeight: number
  ) => {
    const gap = 14;
    const viewportPadding = 12;
    const spaces = {
      top: rect.top,
      bottom: window.innerHeight - (rect.top + rect.height),
      left: rect.left,
      right: window.innerWidth - (rect.left + rect.width),
    };

    let placement: OnboardingPlacement = 'bottom';
    if (spaces.bottom >= tooltipHeight + gap) placement = 'bottom';
    else if (spaces.top >= tooltipHeight + gap) placement = 'top';
    else if (spaces.right >= tooltipWidth + gap) placement = 'right';
    else placement = 'left';

    let top = rect.top + rect.height + gap;
    let left = rect.left + rect.width / 2 - tooltipWidth / 2;

    if (placement === 'top') top = rect.top - tooltipHeight - gap;
    if (placement === 'right') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left + rect.width + gap;
    }
    if (placement === 'left') {
      top = rect.top + rect.height / 2 - tooltipHeight / 2;
      left = rect.left - tooltipWidth - gap;
    }

    return {
      placement,
      top: Math.max(viewportPadding, Math.min(top, window.innerHeight - tooltipHeight - viewportPadding)),
      left: Math.max(viewportPadding, Math.min(left, window.innerWidth - tooltipWidth - viewportPadding)),
    };
  };

  const updateSpotlightForStep = () => {
    if (!showOnboarding || !currentOnboardingStep) {
      setSpotlightRect(null);
      setSpotlightTargetMissing(false);
      setSpotlightFallbackMessage(null);
      return;
    }

    const target = document.querySelector(currentOnboardingStep.targetSelector) as HTMLElement | null;
    if (!target) {
      setSpotlightRect(null);
      setSpotlightTargetMissing(true);
      setSpotlightFallbackMessage(currentOnboardingStep.fallbackMessage);
      return;
    }

    setSpotlightTargetMissing(false);
    setSpotlightFallbackMessage(null);
    ensureElementVisibility(target);

    const remeasure = () => {
      const rect = target.getBoundingClientRect();
      const padded = {
        top: Math.max(6, rect.top - 8),
        left: Math.max(6, rect.left - 8),
        width: rect.width + 16,
        height: rect.height + 16,
      };

      setSpotlightRect(padded);

      if (tooltipRef.current) {
        const tooltipRect = tooltipRef.current.getBoundingClientRect();
        setTooltipPosition(computeTooltipPlacement(padded, tooltipRect.width, tooltipRect.height));
      }
    };

    remeasure();
    window.setTimeout(remeasure, 220);
  };

  const restartOnboarding = () => {
    setHasUserRequestedTutorial(true);
    setShowOnboarding(true);
    setOnboardingStepIndex(0);
  };

  const goToNextOnboardingStep = () => {
    const nextIndex = onboardingStepIndex + 1;
    if (nextIndex >= onboardingSteps.length) {
      setShowOnboarding(false);
      setHasUserRequestedTutorial(false);
      return;
    }
    setOnboardingStepIndex(nextIndex);
  };

  const goToPreviousOnboardingStep = () => {
    setOnboardingStepIndex((prev) => Math.max(0, prev - 1));
  };

  useEffect(() => {
    if (onboardingStepIndex <= onboardingSteps.length - 1) return;
    setOnboardingStepIndex(Math.max(0, onboardingSteps.length - 1));
  }, [onboardingStepIndex, onboardingSteps.length]);

  useEffect(() => {
    updateSpotlightForStep();
  }, [showOnboarding, onboardingStepIndex, state.forceLocalOnly, autoApplyEnabled, autoApplyThreshold, learnedHabits.length, incognitoMode]);

  useEffect(() => {
    if (!showOnboarding) return;

    const handleViewportChange = () => updateSpotlightForStep();
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);

    return () => {
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [showOnboarding, onboardingStepIndex]);

  return (
    <div className="p-8 space-y-6" style={{ backgroundColor: '#0F172A' }}>
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Settings</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            Manage your privacy, data, and application preferences
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            if (showOnboarding) {
              setShowOnboarding(false);
              setHasUserRequestedTutorial(false);
              return;
            }
            restartOnboarding();
          }}
          style={{ borderColor: '#6366F1', color: '#6366F1', backgroundColor: '#1E293B' }}
        >
          {showOnboarding ? 'Hide Tutorial' : 'Revisit Tutorial'}
        </Button>
      </div>

      {showOnboarding && currentOnboardingStep && (
        <>
          <div
            style={{
              position: 'fixed',
              inset: 0,
              backgroundColor: 'rgba(3, 7, 18, 0.34)',
              zIndex: 90,
              pointerEvents: 'none',
            }}
          />

          {spotlightRect && (
            <div
              style={{
                position: 'fixed',
                top: spotlightRect.top,
                left: spotlightRect.left,
                width: spotlightRect.width,
                height: spotlightRect.height,
                borderRadius: 12,
                border: '2px solid #22D3EE',
                boxShadow: '0 0 0 2px rgba(99, 102, 241, 0.30)',
                transition: 'top 240ms ease, left 240ms ease, width 240ms ease, height 240ms ease',
                zIndex: 91,
                pointerEvents: 'none',
              }}
            />
          )}

          <div
            ref={tooltipRef}
            style={{
              position: 'fixed',
              top: tooltipPosition.top,
              left: tooltipPosition.left,
              width: 360,
              maxWidth: 'calc(100vw - 24px)',
              backgroundColor: '#0B1220',
              border: '1px solid #6366F1',
              borderRadius: 12,
              padding: 16,
              zIndex: 92,
              boxShadow: '0 14px 36px rgba(0, 0, 0, 0.45)',
              transition: 'top 220ms ease, left 220ms ease',
            }}
          >
            <div className="text-xs uppercase tracking-wide" style={{ color: '#22D3EE' }}>
              Guided Setup • Step {onboardingStepIndex + 1} of {onboardingSteps.length}
            </div>
            <p className="mt-2 font-semibold" style={{ color: '#E5E7EB' }}>{currentOnboardingStep.action}</p>
            <p className="text-sm mt-2" style={{ color: '#CBD5E1' }}>{currentOnboardingStep.instruction}</p>
            <p className="text-sm mt-2" style={{ color: '#9CA3AF' }}>Tip: {currentOnboardingStep.microcopy}</p>

            {spotlightTargetMissing && (
              <div className="mt-3 p-3 rounded-lg" style={{ backgroundColor: '#F59E0B20', border: '1px solid #F59E0B' }}>
                <p className="text-xs" style={{ color: '#FCD34D' }}>
                  {spotlightFallbackMessage || 'This element is currently unavailable.'}
                </p>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-2">
              <Button
                variant="outline"
                onClick={goToPreviousOnboardingStep}
                disabled={onboardingStepIndex === 0}
                style={{ borderColor: '#374151', color: '#000000' }}
              >
                Previous
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowOnboarding(false);
                    setHasUserRequestedTutorial(false);
                  }}
                  style={{ borderColor: '#374151', color: '#000000' }}
                >
                  Skip
                </Button>
                <Button
                  onClick={goToNextOnboardingStep}
                  style={{ backgroundColor: '#6366F1', color: '#fff' }}
                >
                  {onboardingStepIndex === onboardingSteps.length - 1 ? 'Finish' : 'Next'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Force Local-Only Mode Banner */}
      <Card 
        data-onboarding="local-mode-banner"
        style={{ 
          backgroundColor: state.forceLocalOnly ? '#EF444420' : '#22D3EE20', 
          borderColor: state.forceLocalOnly ? '#EF4444' : '#22D3EE',
          border: '2px solid'
        }}
      >
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6" style={{ color: state.forceLocalOnly ? '#EF4444' : '#22D3EE' }} />
              <div>
                <p className="font-bold" style={{ color: '#E5E7EB' }}>
                  {state.forceLocalOnly ? '🔒 Force Local-Only Mode ACTIVE' : '🌐 API Sync Mode ACTIVE'}
                </p>
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  {state.forceLocalOnly 
                    ? 'All outgoing API requests are paused. Your data stays on this device.'
                    : 'SyncFlow can sync with connected cloud services and APIs.'
                  }
                </p>
              </div>
            </div>
            <Button
              onClick={toggleForceLocalOnly}
              style={{ 
                backgroundColor: state.forceLocalOnly ? '#EF4444' : '#22D3EE', 
                color: '#fff' 
              }}
            >
              {state.forceLocalOnly ? 'Enable API Sync' : 'Enable Local-Only'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Privacy Settings */}
      <Card data-onboarding="privacy-security" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" style={{ color: '#6366F1' }} />
            <CardTitle style={{ color: '#E5E7EB' }}>Privacy & Security</CardTitle>
          </div>
          <CardDescription style={{ color: '#9CA3AF' }}>
            All data processing happens locally on your device
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Local-Only Processing</span>
                <input
                  type="checkbox"
                  defaultChecked={state.forceLocalOnly}
                  onChange={toggleForceLocalOnly}
                  className="w-5 h-5 rounded"
                  style={{ accentColor: '#6366F1' }}
                />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                AI summarization runs entirely on-device
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>End-to-End Encryption</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Encrypt all stored data with AES-256
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Activity Tracking</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Track PC activity for habit learning
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Anonymous Analytics</span>
                <input type="checkbox" className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Help improve SyncFlow (optional)
              </p>
            </div>
          </div>

          {/* Incognito Mode */}
          <div
            data-onboarding="incognito-mode"
            className="p-4 rounded-lg border-2"
            style={{
              backgroundColor: incognitoMode ? '#6366F110' : '#0F172A',
              borderColor: incognitoMode ? '#6366F1' : '#374151',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {incognitoMode ? (
                  <EyeOff className="w-5 h-5" style={{ color: '#6366F1' }} />
                ) : (
                  <Eye className="w-5 h-5" style={{ color: '#9CA3AF' }} />
                )}
                <span className="font-medium" style={{ color: '#E5E7EB' }}>Incognito Work Mode</span>
              </div>
              <input
                type="checkbox"
                checked={incognitoMode}
                onChange={(e) => handleIncognitoToggle(e.target.checked)}
                className="w-5 h-5 rounded"
                style={{ accentColor: '#6366F1' }}
              />
            </div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {incognitoMode
                ? '🔒 Activity tracking paused. No data is being logged.'
                : 'Pause all tracking and logging temporarily'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* AI & Automation Settings */}
      <Card data-onboarding="ai-automation" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5" style={{ color: '#6366F1' }} />
            <CardTitle style={{ color: '#E5E7EB' }}>AI & Automation</CardTitle>
          </div>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Configure intelligent scheduling and habit learning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div
            data-onboarding="auto-apply"
            className="p-4 rounded-lg border-2"
            style={{
              backgroundColor: autoApplyEnabled ? '#22D3EE10' : '#0F172A',
              borderColor: autoApplyEnabled ? '#22D3EE' : '#374151',
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5" style={{ color: autoApplyEnabled ? '#22D3EE' : '#9CA3AF' }} />
                <span className="font-medium" style={{ color: '#E5E7EB' }}>Auto-Apply Schedule Changes</span>
              </div>
              <input
                type="checkbox"
                checked={autoApplyEnabled}
                onChange={() => {
                  toggleAutoApply();
                  toast.success(autoApplyEnabled ? 'Auto-apply disabled' : 'Auto-apply enabled', {
                    description: autoApplyEnabled 
                      ? 'Schedule changes will require manual confirmation' 
                      : 'Schedule changes will be applied automatically',
                    duration: 3000,
                  });
                }}
                className="w-5 h-5 rounded"
                style={{ accentColor: '#22D3EE' }}
              />
            </div>
            <p className="text-sm" style={{ color: '#9CA3AF' }}>
              {autoApplyEnabled
                ? '⚡ Schedule optimizations are applied automatically when detected'
                : 'Schedule changes require your confirmation before applying'}
            </p>
          </div>

          <div data-onboarding="auto-apply-threshold" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <label className="text-sm mb-2 block" style={{ color: '#E5E7EB' }}>
              Auto-Apply Confidence Threshold: {Math.round(autoApplyThreshold * 100)}%
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={autoApplyThreshold}
              onChange={(e) => setAutoApplyThreshold(parseFloat(e.target.value))}
              className="w-full"
              style={{ accentColor: '#6366F1' }}
            />
            <p className="text-xs mt-2" style={{ color: '#9CA3AF' }}>
              Only apply changes when AI confidence is above {Math.round(autoApplyThreshold * 100)}%
            </p>
          </div>

          <div data-onboarding="learned-habits" className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <div className="flex items-center justify-between mb-3">
              <span style={{ color: '#E5E7EB' }}>Learned Habits</span>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  refreshHabits();
                  toast.info('Habits refreshed');
                }}
                style={{ borderColor: '#6366F1', color: '#6366F1' }}
              >
                Refresh
              </Button>
            </div>
            <div className="space-y-2">
              {learnedHabits.length > 0 ? (
                learnedHabits.slice(0, 3).map((habit) => (
                  <div key={habit.id} className="flex items-center justify-between p-2 rounded" style={{ backgroundColor: '#1E293B' }}>
                    <div>
                      <p className="text-sm" style={{ color: '#E5E7EB' }}>{habit.pattern}</p>
                      <p className="text-xs" style={{ color: '#9CA3AF' }}>
                        {habit.type} • {habit.occurrences} occurrences • {Math.round(habit.confidence * 100)}% confidence
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm" style={{ color: '#9CA3AF' }}>
                  No habits learned yet. Use SyncFlow for a few days to build your pattern profile.
                </p>
              )}
              {learnedHabits.length > 3 && (
                <p className="text-xs text-right" style={{ color: '#9CA3AF' }}>
                  +{learnedHabits.length - 3} more habits
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Proactive Notifications</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Send alerts via connected chat apps
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Learn Buffer Preferences</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Adapt buffer times based on your habits
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Data Management */}
      <Card data-onboarding="data-management" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5" style={{ color: '#6366F1' }} />
            <CardTitle style={{ color: '#E5E7EB' }}>Data Management</CardTitle>
          </div>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Control your local data storage and exports
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Storage Used</p>
              <p className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>247 MB</p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>of unlimited</p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Database Type</p>
              <p className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>IndexedDB</p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Browser-native</p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <p className="text-sm mb-1" style={{ color: '#9CA3AF' }}>Last Backup</p>
              <p className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>Today</p>
              <p className="text-xs mt-1" style={{ color: '#9CA3AF' }}>Auto-backup enabled</p>
            </div>
          </div>

          <div data-onboarding="data-exports" className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Button variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
              <Download className="w-4 h-4 mr-2" />
              Export All Data (JSON)
            </Button>
            <Button variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
              <Download className="w-4 h-4 mr-2" />
              Export Tasks (CSV)
            </Button>
            <Button variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
              <Download className="w-4 h-4 mr-2" />
              Export Calendar (iCal)
            </Button>
            <Button variant="outline" style={{ borderColor: '#6366F1', color: '#6366F1' }}>
              <Download className="w-4 h-4 mr-2" />
              Create Backup Archive
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Smart Buffers Configuration */}
      <Card data-onboarding="smart-buffers" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
        <CardHeader>
          <CardTitle style={{ color: '#E5E7EB' }}>Smart Buffers</CardTitle>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Configure how SyncFlow adjusts your schedule dynamically
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <label className="text-sm mb-2 block" style={{ color: '#E5E7EB' }}>
                Default Buffer Time
              </label>
              <select
                value={state.calendarTaskSync.defaultBufferMinutes}
                onChange={(event) => {
                  const nextBuffer = Number(event.target.value);
                  updateCalendarTaskSync({
                    ...state.calendarTaskSync,
                    defaultBufferMinutes: nextBuffer,
                  });
                  toast.success(`Default buffer updated to ${nextBuffer} minutes`, {
                    duration: 1800,
                  });
                }}
                className="w-full px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#1E293B', borderColor: '#374151', color: '#E5E7EB', border: '1px solid' }}
              >
                <option value={5}>5 minutes</option>
                <option value={10}>10 minutes</option>
                <option value={15}>15 minutes</option>
                <option value={20}>20 minutes</option>
                <option value={30}>30 minutes</option>
              </select>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <label className="text-sm mb-2 block" style={{ color: '#E5E7EB' }}>
                Learning Period
              </label>
              <select
                className="w-full px-3 py-2 rounded-lg"
                style={{ backgroundColor: '#1E293B', borderColor: '#374151', color: '#E5E7EB', border: '1px solid' }}
              >
                <option>1 week</option>
                <option selected>2 weeks</option>
                <option>1 month</option>
                <option>3 months</option>
              </select>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Auto-Adjust Buffers</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Learn from task completion speed
              </p>
            </div>

            <div className="p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-2">
                <span style={{ color: '#E5E7EB' }}>Adaptive Scheduling</span>
                <input type="checkbox" defaultChecked className="w-5 h-5 rounded" style={{ accentColor: '#6366F1' }} />
              </div>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>
                Optimize schedule based on patterns
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card data-onboarding="danger-zone" style={{ backgroundColor: '#1E293B', borderColor: '#EF4444' }}>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Trash2 className="w-5 h-5" style={{ color: '#EF4444' }} />
            <CardTitle style={{ color: '#EF4444' }}>Danger Zone</CardTitle>
          </div>
          <CardDescription style={{ color: '#9CA3AF' }}>
            Irreversible actions - proceed with caution
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <div>
              <p className="font-medium" style={{ color: '#E5E7EB' }}>Clear All Cache</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Remove temporary files and cached data</p>
            </div>
            <Button variant="outline" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
              Clear Cache
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <div>
              <p className="font-medium" style={{ color: '#E5E7EB' }}>Reset All Settings</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Restore default configuration</p>
            </div>
            <Button variant="outline" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
              Reset Settings
            </Button>
          </div>

          <div className="flex items-center justify-between p-4 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
            <div>
              <p className="font-medium" style={{ color: '#E5E7EB' }}>Delete All Data</p>
              <p className="text-sm" style={{ color: '#9CA3AF' }}>Permanently remove all local data</p>
            </div>
            <Button variant="outline" style={{ borderColor: '#EF4444', color: '#EF4444' }}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Data
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}