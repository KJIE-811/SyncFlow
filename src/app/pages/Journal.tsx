import { BookOpen, FileText, Download, Calendar, Brain, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { useAI } from '../contexts/AIContext';
import { useEffect, useMemo, useRef, useState } from 'react';

const activityLog = [
  { time: '09:00 AM', activity: 'Daily Standup', duration: '15 min', type: 'meeting', status: 'completed' },
  { time: '09:30 AM', activity: 'Review Q1 Performance Reports', duration: '45 min', type: 'task', status: 'completed' },
  { time: '10:30 AM', activity: 'Coffee Break', duration: '15 min', type: 'break', status: 'completed' },
  { time: '11:00 AM', activity: 'Client Call - Acme Corp', duration: '60 min', type: 'meeting', status: 'in-progress' },
  { time: '12:30 PM', activity: 'Lunch Break', duration: '30 min', type: 'break', status: 'scheduled' },
  { time: '02:00 PM', activity: 'Design Review', duration: '45 min', type: 'meeting', status: 'scheduled' },
  { time: '03:00 PM', activity: 'Code Review - Feature Branch', duration: '60 min', type: 'task', status: 'scheduled' },
  { time: '04:30 PM', activity: 'Update Project Documentation', duration: '30 min', type: 'task', status: 'scheduled' },
];

const focusMetrics = [
  { label: 'Total Focus Time', value: '4.2 hrs', change: '+12%' },
  { label: 'Tasks Completed', value: '8/12', change: '+5%' },
  { label: 'Meetings Attended', value: '4', change: '0%' },
  { label: 'Break Time', value: '45 min', change: '-8%' },
];

export function Journal() {
  type OnboardingPlacement = 'top' | 'bottom' | 'left' | 'right';
  type OnboardingStep = {
    id:
      | 'ai-summary'
      | 'focus-metrics'
      | 'timeline'
      | 'report-preview'
      | 'opt-summary-stats'
      | 'opt-activity-timeline'
      | 'opt-completed-tasks'
      | 'opt-ai-insights'
      | 'export-format'
      | 'export-button';
    action: string;
    instruction: string;
    microcopy: string;
    whyItMatters: string;
    targetSelector: string;
    fallbackMessage: string;
  };

  const { communicationSummaries, refreshSummaries } = useAI();
  const [reportFormat, setReportFormat] = useState<'pdf' | 'markdown' | 'txt'>('pdf');
  const [includeSections, setIncludeSections] = useState({
    summaryStats: true,
    activityTimeline: true,
    completedTasks: true,
    aiInsights: true,
  });
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
      id: 'ai-summary',
      action: 'Review AI Communication Summary',
      instruction: 'Start with project-level communication insights and sentiment signals.',
      microcopy: 'Use this section to spot urgent threads before they become blockers.',
      whyItMatters: 'This turns scattered chat activity into a prioritized summary.',
      targetSelector: '[data-onboarding="ai-summary"]',
      fallbackMessage: 'No communication summaries are available yet. Generate or refresh summary data first.',
    },
    {
      id: 'focus-metrics',
      action: 'Read Focus Metrics',
      instruction: 'Check the top KPI cards for focus time, completed tasks, meetings, and breaks.',
      microcopy: 'Use quick trend deltas to compare today with your recent baseline.',
      whyItMatters: 'Gives a fast health check of your daily productivity balance.',
      targetSelector: '[data-onboarding="focus-metrics"]',
      fallbackMessage: 'Focus metrics section is unavailable right now.',
    },
    {
      id: 'timeline',
      action: 'Inspect Today\'s Timeline',
      instruction: 'Use the timeline to verify what happened, what is in progress, and what is still scheduled.',
      microcopy: 'The status markers help you spot schedule drift quickly.',
      whyItMatters: 'This is your source for chronological work context.',
      targetSelector: '[data-onboarding="timeline"]',
      fallbackMessage: 'Timeline panel is unavailable right now.',
    },
    {
      id: 'report-preview',
      action: 'Open Report Preview Controls',
      instruction: 'This panel controls exactly what gets exported in your report.',
      microcopy: 'We will now go option by option so each toggle is clear.',
      whyItMatters: 'Avoids noisy exports and keeps reports tailored to your audience.',
      targetSelector: '[data-onboarding="report-preview"]',
      fallbackMessage: 'Report preview panel is unavailable right now.',
    },
    {
      id: 'opt-summary-stats',
      action: 'Option: Summary Statistics',
      instruction: 'Toggle whether KPI totals and trend percentages are included.',
      microcopy: 'Keep this enabled for high-level executive summaries.',
      whyItMatters: 'Provides the fastest quantitative overview of your day.',
      targetSelector: '[data-onboarding="opt-summary-stats"]',
      fallbackMessage: 'Summary Statistics option is unavailable.',
    },
    {
      id: 'opt-activity-timeline',
      action: 'Option: Activity Timeline',
      instruction: 'Toggle the full chronological breakdown of activities.',
      microcopy: 'Enable this for operational reviews and audit-like context.',
      whyItMatters: 'Preserves sequence and context of work events.',
      targetSelector: '[data-onboarding="opt-activity-timeline"]',
      fallbackMessage: 'Activity Timeline option is unavailable.',
    },
    {
      id: 'opt-completed-tasks',
      action: 'Option: Completed Tasks',
      instruction: 'Include only completed tasks to create a concise accomplishment list.',
      microcopy: 'Useful for standups and end-of-day updates.',
      whyItMatters: 'Highlights delivery outcomes without extra noise.',
      targetSelector: '[data-onboarding="opt-completed-tasks"]',
      fallbackMessage: 'Completed Tasks option is unavailable.',
    },
    {
      id: 'opt-ai-insights',
      action: 'Option: AI Insights',
      instruction: 'Include AI-derived communication patterns and recommendations.',
      microcopy: 'Great for identifying recurring blockers and momentum trends.',
      whyItMatters: 'Adds strategic insight beyond raw activity logs.',
      targetSelector: '[data-onboarding="opt-ai-insights"]',
      fallbackMessage: 'AI Insights option is unavailable.',
    },
    {
      id: 'export-format',
      action: 'Choose Export Format',
      instruction: 'Select one output format for the generated report: PDF mock preview, Markdown, or plain text.',
      microcopy: 'Pick Markdown for editable docs and text for lightweight sharing.',
      whyItMatters: 'Format controls portability and downstream editing.',
      targetSelector: '[data-onboarding="export-format-group"]',
      fallbackMessage: 'Export format options are unavailable.',
    },
    {
      id: 'export-button',
      action: 'Generate and Download',
      instruction: 'Click Download Report to generate the file using your current selections.',
      microcopy: 'Finalize toggles first, then export once.',
      whyItMatters: 'This executes your report configuration into a deliverable file.',
      targetSelector: '[data-onboarding="export-button"]',
      fallbackMessage: 'Download button is unavailable.',
    },
  ], []);

  const currentOnboardingStep = onboardingSteps[onboardingStepIndex];

  const toggleSection = (section: keyof typeof includeSections) => {
    setIncludeSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const generateMarkdownReport = (): string => {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    
    let markdown = `# Daily Focus Report\n\n**Date:** ${date}\n\n`;
    
    // Focus Metrics
    if (includeSections.summaryStats) {
      markdown += `## Summary Metrics\n\n`;
      focusMetrics.forEach(metric => {
        markdown += `- **${metric.label}:** ${metric.value} (${metric.change})\n`;
      });
      markdown += `\n`;
    }
    
    // Activity Timeline
    if (includeSections.activityTimeline) {
      markdown += `## Activity Timeline\n\n`;
      activityLog.forEach(activity => {
        const statusEmoji = activity.status === 'completed' ? '✅' : activity.status === 'in-progress' ? '🔄' : '⏳';
        markdown += `### ${activity.time} - ${activity.activity}\n`;
        markdown += `- **Duration:** ${activity.duration}\n`;
        markdown += `- **Type:** ${activity.type}\n`;
        markdown += `- **Status:** ${statusEmoji} ${activity.status}\n\n`;
      });
    }
    
    // Completed Tasks
    if (includeSections.completedTasks) {
      const completedActivities = activityLog.filter(a => a.status === 'completed' && a.type === 'task');
      if (completedActivities.length > 0) {
        markdown += `## Completed Tasks\n\n`;
        completedActivities.forEach(activity => {
          markdown += `- ✅ ${activity.activity} (${activity.duration})\n`;
        });
        markdown += `\n`;
      }
    }
    
    // AI Insights
    if (includeSections.aiInsights && communicationSummaries.length > 0) {
      markdown += `## Communication Summary\n\n`;
      communicationSummaries.forEach(summary => {
        markdown += `### ${summary.contact}${summary.project ? ` (${summary.project})` : ''}\n`;
        markdown += `- **Messages:** ${summary.messageCount}\n`;
        markdown += `- **Sentiment:** ${summary.sentiment}\n`;
        markdown += `- **Summary:** ${summary.summary}\n`;
        if (summary.keyTopics.length > 0) {
          markdown += `- **Topics:** ${summary.keyTopics.map(t => `#${t}`).join(', ')}\n`;
        }
        markdown += `\n`;
      });
    }
    
    markdown += `\n---\n*Generated by SyncFlow on ${new Date().toLocaleString()}*\n`;
    return markdown;
  };

  const generateJSONReport = (): string => {
    const report: any = {
      date: new Date().toISOString(),
      generatedAt: new Date().toLocaleString()
    };
    
    if (includeSections.summaryStats) {
      report.metrics = focusMetrics;
    }
    
    if (includeSections.activityTimeline) {
      report.activities = activityLog;
    }
    
    if (includeSections.completedTasks) {
      report.completedTasks = activityLog.filter(a => a.status === 'completed' && a.type === 'task');
    }
    
    if (includeSections.aiInsights) {
      report.communicationSummaries = communicationSummaries;
    }
    
    return JSON.stringify(report, null, 2);
  };

  const generateTextReport = (): string => {
    const date = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    let text = `DAILY FOCUS REPORT\n`;
    text += `Date: ${date}\n`;
    text += `${'='.repeat(50)}\n\n`;
    
    if (includeSections.summaryStats) {
      text += `SUMMARY METRICS\n`;
      text += `${'-'.repeat(50)}\n`;
      focusMetrics.forEach(metric => {
        text += `${metric.label}: ${metric.value} (${metric.change})\n`;
      });
      text += `\n`;
    }
    
    if (includeSections.activityTimeline) {
      text += `ACTIVITY TIMELINE\n`;
      text += `${'-'.repeat(50)}\n`;
      activityLog.forEach(activity => {
        text += `[${activity.time}] ${activity.activity}\n`;
        text += `  Duration: ${activity.duration} | Type: ${activity.type} | Status: ${activity.status}\n\n`;
      });
    }
    
    if (includeSections.completedTasks) {
      const completed = activityLog.filter(a => a.status === 'completed' && a.type === 'task');
      if (completed.length > 0) {
        text += `COMPLETED TASKS\n`;
        text += `${'-'.repeat(50)}\n`;
        completed.forEach(task => {
          text += `✓ ${task.activity} (${task.duration})\n`;
        });
        text += `\n`;
      }
    }
    
    text += `\nGenerated by SyncFlow on ${new Date().toLocaleString()}\n`;
    return text;
  };

  const handleGenerateReport = () => {
    let content: string = '';
    let mimeType: string = 'text/plain';
    let fileExtension: string = 'txt';
    let fileName: string;

    const dateStr = new Date().toISOString().split('T')[0];

    switch (reportFormat) {
      case 'pdf':
        // Open an in-app preview route that embeds a static mock PDF.
        const basePath = import.meta.env.BASE_URL.endsWith('/')
          ? import.meta.env.BASE_URL
          : `${import.meta.env.BASE_URL}/`;
        const previewRouteUrl = `${window.location.origin}${basePath}#/report-preview`;
        const pdfWindow = window.open(previewRouteUrl, '_blank', 'noopener,noreferrer');

        if (!pdfWindow) {
          window.location.assign(previewRouteUrl);
        }
        return;
      case 'markdown':
        content = generateMarkdownReport();
        mimeType = 'text/markdown';
        fileExtension = 'md';
        break;
      case 'txt':
        content = generateTextReport();
        mimeType = 'text/plain';
        fileExtension = 'txt';
        break;
      default:
        content = generateMarkdownReport();
        mimeType = 'text/markdown';
        fileExtension = 'md';
    }

    fileName = `syncflow-report-${dateStr}.${fileExtension}`;

    // Create blob and trigger download
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
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
  }, [showOnboarding, onboardingStepIndex, communicationSummaries.length]);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold" style={{ color: '#E5E7EB' }}>Focus Journal</h1>
          <p className="mt-2" style={{ color: '#9CA3AF' }}>
            Track your daily progress and AI-generated communication summaries
          </p>
        </div>
        <div className="flex gap-3">
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
          <Button variant="outline" style={{ borderColor: '#374151', color: '#E5E7EB' }}>
            <Calendar className="w-4 h-4 mr-2" />
            Select Date
          </Button>
        </div>
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

      {/* Communication Summary Section */}
      {communicationSummaries.length > 0 && (
        <Card data-onboarding="ai-summary" style={{ backgroundColor: '#1E293B', borderColor: '#6366F1', border: '2px solid' }}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Brain className="w-5 h-5" style={{ color: '#6366F1' }} />
                <CardTitle style={{ color: '#E5E7EB' }}>AI Communication Summary</CardTitle>
              </div>
              <Button variant="outline" size="sm" onClick={refreshSummaries} style={{ borderColor: '#374151', color: '#E5E7EB' }}>
                <TrendingUp className="w-4 h-4 mr-2" />
                Refresh
              </Button>
            </div>
            <CardDescription style={{ color: '#9CA3AF' }}>
              Grouped chat activity by project and contact
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {communicationSummaries.map((summary, index) => {
              const sentimentColor = 
                summary.sentiment === 'urgent' ? '#EF4444' :
                summary.sentiment === 'delayed' ? '#F59E0B' :
                summary.sentiment === 'positive' ? '#22D3EE' : '#9CA3AF';
              
              const sentimentBg = 
                summary.sentiment === 'urgent' ? '#EF444420' :
                summary.sentiment === 'delayed' ? '#F59E0B20' :
                summary.sentiment === 'positive' ? '#22D3EE20' : '#37415120';

              return (
                <div
                  key={index}
                  className="p-4 rounded-lg border-l-4"
                  style={{ backgroundColor: '#0F172A', borderColor: sentimentColor }}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <Users className="w-4 h-4" style={{ color: sentimentColor }} />
                        <p className="font-medium" style={{ color: '#E5E7EB' }}>{summary.contact}</p>
                        {summary.project && (
                          <span className="text-xs px-2 py-0.5 rounded" style={{ backgroundColor: '#6366F120', color: '#6366F1' }}>
                            {summary.project}
                          </span>
                        )}
                      </div>
                      <p className="text-sm" style={{ color: '#9CA3AF' }}>
                        Last activity: {new Date(summary.lastActivity).toLocaleTimeString()}
                      </p>
                    </div>
                    <span 
                      className="text-xs px-2 py-1 rounded capitalize" 
                      style={{ backgroundColor: sentimentBg, color: sentimentColor }}
                    >
                      {summary.sentiment}
                    </span>
                  </div>

                  <p className="text-sm mb-3" style={{ color: '#E5E7EB' }}>
                    {summary.summary}
                  </p>

                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-2 rounded" style={{ backgroundColor: '#1E293B' }}>
                      <p style={{ color: '#9CA3AF' }}>Messages</p>
                      <p className="font-medium mt-1" style={{ color: '#E5E7EB' }}>{summary.messageCount}</p>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: '#1E293B' }}>
                      <p style={{ color: '#9CA3AF' }}>Tasks Created</p>
                      <p className="font-medium mt-1" style={{ color: '#E5E7EB' }}>{summary.pendingTasks}</p>
                    </div>
                    <div className="p-2 rounded" style={{ backgroundColor: '#1E293B' }}>
                      <p style={{ color: '#9CA3AF' }}>Urgent Items</p>
                      <p className="font-medium mt-1" style={{ color: summary.urgentItems > 0 ? '#EF4444' : '#E5E7EB' }}>
                        {summary.urgentItems}
                      </p>
                    </div>
                  </div>

                  {summary.keyTopics.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      <span className="text-xs" style={{ color: '#9CA3AF' }}>Topics:</span>
                      {summary.keyTopics.map((topic, i) => (
                        <span 
                          key={i} 
                          className="text-xs px-2 py-0.5 rounded"
                          style={{ backgroundColor: '#22D3EE20', color: '#22D3EE' }}
                        >
                          #{topic}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {/* Focus Metrics */}
      <div data-onboarding="focus-metrics" className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {focusMetrics.map((metric, index) => (
          <Card key={index} style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
            <CardContent className="pt-6">
              <p className="text-sm" style={{ color: '#9CA3AF' }}>{metric.label}</p>
              <div className="flex items-baseline justify-between mt-2">
                <p className="text-2xl font-bold" style={{ color: '#E5E7EB' }}>{metric.value}</p>
                <span
                  className="text-sm"
                  style={{ color: metric.change.startsWith('+') ? '#22D3EE' : '#9CA3AF' }}
                >
                  {metric.change}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Activity Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card data-onboarding="timeline" className="lg:col-span-2" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5" style={{ color: '#6366F1' }} />
              <CardTitle style={{ color: '#E5E7EB' }}>Today's Timeline</CardTitle>
            </div>
            <CardDescription style={{ color: '#9CA3AF' }}>
              Your activity log for Monday, February 23, 2026
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activityLog.map((item, index) => (
                <div
                  key={index}
                  className="flex items-start gap-4 p-4 rounded-lg"
                  style={{ backgroundColor: '#0F172A' }}
                >
                  {/* Timeline marker */}
                  <div className="flex flex-col items-center">
                    <div
                      className={`w-3 h-3 rounded-full ${
                        item.status === 'in-progress' ? 'animate-pulse' : ''
                      }`}
                      style={{
                        backgroundColor:
                          item.status === 'completed'
                            ? '#22D3EE'
                            : item.status === 'in-progress'
                            ? '#6366F1'
                            : '#374151',
                      }}
                    ></div>
                    {index < activityLog.length - 1 && (
                      <div className="w-0.5 h-12 mt-1" style={{ backgroundColor: '#374151' }}></div>
                    )}
                  </div>

                  {/* Activity details */}
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <p className="font-medium" style={{ color: '#E5E7EB' }}>{item.activity}</p>
                      <span
                        className="text-xs px-2 py-1 rounded"
                        style={{
                          backgroundColor:
                            item.type === 'meeting'
                              ? '#6366F120'
                              : item.type === 'task'
                              ? '#22D3EE20'
                              : '#37415120',
                          color:
                            item.type === 'meeting'
                              ? '#6366F1'
                              : item.type === 'task'
                              ? '#22D3EE'
                              : '#9CA3AF',
                        }}
                      >
                        {item.type}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-sm" style={{ color: '#9CA3AF' }}>
                      <span>{item.time}</span>
                      <span>•</span>
                      <span>{item.duration}</span>
                      <span>•</span>
                      <span className="capitalize">{item.status.replace('-', ' ')}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Report Preview */}
        <Card data-onboarding="report-preview" style={{ backgroundColor: '#1E293B', borderColor: '#374151' }}>
          <CardHeader>
            <CardTitle style={{ color: '#E5E7EB' }}>Report Preview</CardTitle>
            <CardDescription style={{ color: '#9CA3AF' }}>
              What will be included
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div data-onboarding="opt-summary-stats" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: '#E5E7EB' }}>Summary Statistics</span>
                <input 
                  type="checkbox" 
                  checked={includeSections.summaryStats}
                  onChange={() => toggleSection('summaryStats')}
                  className="w-4 h-4 rounded cursor-pointer" 
                  style={{ accentColor: '#6366F1' }} 
                />
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Focus time, tasks, and productivity metrics
              </p>
            </div>

            <div data-onboarding="opt-activity-timeline" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: '#E5E7EB' }}>Activity Timeline</span>
                <input 
                  type="checkbox" 
                  checked={includeSections.activityTimeline}
                  onChange={() => toggleSection('activityTimeline')}
                  className="w-4 h-4 rounded cursor-pointer" 
                  style={{ accentColor: '#6366F1' }} 
                />
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Detailed breakdown of all activities
              </p>
            </div>

            <div data-onboarding="opt-completed-tasks" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: '#E5E7EB' }}>Completed Tasks</span>
                <input 
                  type="checkbox" 
                  checked={includeSections.completedTasks}
                  onChange={() => toggleSection('completedTasks')}
                  className="w-4 h-4 rounded cursor-pointer" 
                  style={{ accentColor: '#6366F1' }} 
                />
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                List of tasks marked as done
              </p>
            </div>

            <div data-onboarding="opt-ai-insights" className="p-3 rounded-lg" style={{ backgroundColor: '#0F172A' }}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm" style={{ color: '#E5E7EB' }}>AI Insights</span>
                <input 
                  type="checkbox" 
                  checked={includeSections.aiInsights}
                  onChange={() => toggleSection('aiInsights')}
                  className="w-4 h-4 rounded cursor-pointer" 
                  style={{ accentColor: '#6366F1' }} 
                />
              </div>
              <p className="text-xs" style={{ color: '#9CA3AF' }}>
                Productivity patterns and suggestions
              </p>
            </div>

            <div data-onboarding="export-format-group" className="pt-4 space-y-2">
              <h4 className="text-sm font-medium" style={{ color: '#E5E7EB' }}>Export Format</h4>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={reportFormat === 'pdf'}
                    onChange={() => setReportFormat('pdf')}
                    style={{ accentColor: '#6366F1' }} 
                  />
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>PDF Preview (mock)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={reportFormat === 'markdown'}
                    onChange={() => setReportFormat('markdown')}
                    style={{ accentColor: '#6366F1' }} 
                  />
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Markdown (.md)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="format" 
                    checked={reportFormat === 'txt'}
                    onChange={() => setReportFormat('txt')}
                    style={{ accentColor: '#6366F1' }} 
                  />
                  <span className="text-sm" style={{ color: '#E5E7EB' }}>Plain Text (.txt)</span>
                </label>
              </div>
            </div>

            <Button 
              data-onboarding="export-button"
              className="w-full mt-4" 
              variant="outline" 
              onClick={handleGenerateReport}
              style={{ borderColor: '#6366F1', color: '#6366F1' }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}