import React, { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import {
  FileText,
  LayoutDashboard,
  Code2,
  FlaskConical,
  GitBranch,
  Settings,
  HelpCircle,
  ChevronRight,
  PanelLeftClose,
  PanelLeftOpen,
  ClipboardCheck,
} from 'lucide-react';
import type { UserProfile } from '../types/auth';
import type { AppView, OperationsTab } from '../types/appState';
import { WelcomeModal } from './onboarding/WelcomeModal';
import { markWelcomeSeen } from '../services/onboardingService';

interface AppSidebarProps {
  user: UserProfile;
  compact?: boolean;
  activeView: AppView;
  activeOpsTab?: OperationsTab;
  onNavigate: (app: AppView, opsTab?: OperationsTab) => void;
}

const NAV_ITEMS = [
  {
    id: 'dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    app: 'dashboard' as AppView,
    opsTab: undefined as OperationsTab | undefined,
  },
  {
    id: 'doceditor',
    label: 'Document Editor',
    icon: FileText,
    app: 'doccraft' as AppView,
    opsTab: undefined as OperationsTab | undefined,
  },
  {
    id: 'coder',
    label: 'Coder',
    icon: Code2,
    app: 'coder' as AppView,
    opsTab: undefined as OperationsTab | undefined,
  },
  {
    id: 'testcases',
    label: 'Test Management',
    icon: FlaskConical,
    app: 'operations' as AppView,
    opsTab: 'test-cases' as OperationsTab,
  },
  {
    id: 'release',
    label: 'Release Master',
    icon: GitBranch,
    app: 'operations' as AppView,
    opsTab: 'releases' as OperationsTab,
  },
  {
    id: 'reviewers',
    label: 'Reviewers Log',
    icon: ClipboardCheck,
    app: 'operations' as AppView,
    opsTab: 'reviewers' as OperationsTab,
  },
  {
    id: 'settings',
    label: 'Settings',
    icon: Settings,
    app: 'settings' as AppView,
    opsTab: undefined as OperationsTab | undefined,
  },
] as const;

function isActive(item: (typeof NAV_ITEMS)[number], activeView: AppView, activeOpsTab?: OperationsTab): boolean {
  if (item.app !== activeView) return false;
  if (item.app === 'operations' && item.opsTab && activeOpsTab) {
    return item.opsTab === activeOpsTab;
  }
  return true;
}

// One open/closed state for the whole app. Every screen renders its own
// <AppSidebar>, so state kept inside the component reset to "open" on
// some navigations (a new screen = a new sidebar) and not on others (tabs
// inside Operations reuse one) - that was the inconsistency. Living out
// here, it survives the switch between screens and starts open when the
// app loads.
let expandedState = true;
const listeners = new Set<() => void>();

function setExpanded(next: boolean) {
  if (next === expandedState) return;
  expandedState = next;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

const getExpanded = () => expandedState;

// A nav click on the closed bar opens it - but going to another screen
// replaces the sidebar with that screen's own, which would appear already
// open, with no animation. So the click only asks for it to open, and the
// sidebar on screen opens once it has been painted closed: the same one
// (a tab inside Operations), the next screen's, or - if that screen is
// still loading - its sidebar when it appears.
let openRequested = false;
let mountedSidebars = 0;

function openAfterPaint() {
  requestAnimationFrame(() =>
    requestAnimationFrame(() => {
      if (!openRequested || mountedSidebars === 0) return;
      openRequested = false;
      setExpanded(true);
    }),
  );
}

/** Back to the starting state (open): on sign-out, and between tests. */
export function resetAppSidebar() {
  openRequested = false;
  setExpanded(true);
}

// Tailwind needs these class names written out in full to generate them.
const MOTION = 'duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none';

export const AppSidebar: React.FC<AppSidebarProps> = ({
  user,
  compact = false,
  activeView,
  activeOpsTab,
  onNavigate,
}) => {
  const expanded = useSyncExternalStore(subscribe, getExpanded, getExpanded);
  const [guideOpen, setGuideOpen] = useState(false);
  const asideRef = useRef<HTMLElement>(null);

  useEffect(() => {
    mountedSidebars += 1;
    if (openRequested) openAfterPaint();
    return () => {
      mountedSidebars -= 1;
    };
  }, []);

  // Open + a press anywhere outside the bar (the page content) closes it.
  useEffect(() => {
    if (!expanded) return;
    const onPointerDown = (event: Event) => {
      const target = event.target as Node | null;
      if (target && asideRef.current?.contains(target)) return;
      setExpanded(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    return () => document.removeEventListener('pointerdown', onPointerDown);
  }, [expanded]);

  // Text fades in a beat after the bar starts opening, and out at once
  // when it closes, so it never shows squashed against the edge.
  const fade = `transition-opacity motion-reduce:transition-none ${expanded ? 'opacity-100 duration-200 delay-100' : 'opacity-0 duration-100 delay-0'}`;

  return (
    <>
    <aside
      ref={asideRef}
      id="app-sidebar-panel"
      // Closed, the whole rail (including the empty space under the nav)
      // opens it; a click on something inside does its own thing too.
      onClick={() => {
        if (!expanded) setExpanded(true);
      }}
      // theme-invert: in the Split theme the sidebar uses the Dark colours (theme.css).
      className={`theme-invert relative z-40 h-full shrink-0 select-none overflow-hidden bg-[var(--panel)] border-r border-[var(--border)] shadow-xl flex flex-col transition-[width] ${MOTION} ${
        expanded ? 'w-64' : 'w-14 cursor-pointer'
      }`}
    >
      <div className={`relative shrink-0 ${compact ? 'h-16' : 'h-24'} border-b border-[var(--border)]`}>
        <div aria-hidden={!expanded} className={`absolute inset-y-0 left-0 w-52 pl-2.5 flex items-center gap-3 ${fade}`}>
          <img src="/logo.png" alt="DevDoc Studio Logo" className="w-9 h-9 object-contain shrink-0 border border-[var(--border)] bg-[var(--bg)] p-1" />
          <div>
            <div className="text-[13px] font-bold tracking-[0.12em] text-[var(--text)] uppercase leading-tight">DevDoc</div>
            <div className="text-[9px] text-[var(--text-dim)] uppercase font-mono tracking-[0.14em] leading-tight">Studio</div>
          </div>
        </div>
        {/* Pinned to the bar's right edge, so it rides along with it. */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          aria-expanded={expanded}
          aria-controls="app-sidebar-panel"
          title={expanded ? 'Minimize sidebar' : 'Maximize sidebar'}
          aria-label={expanded ? 'Minimize sidebar' : 'Maximize sidebar'}
          className={`absolute top-1/2 -translate-y-1/2 border border-[var(--border)] bg-[var(--panel)] p-1.5 text-[var(--text-dim)] hover:text-[var(--text)] hover:border-[var(--accent-text)] transition-[right,color,border-color] ${MOTION} ${
            expanded ? 'right-4' : 'right-[13px]'
          }`}
        >
          {expanded ? <PanelLeftClose className="w-3.5 h-3.5" /> : <PanelLeftOpen className="w-3.5 h-3.5" />}
        </button>
      </div>

      <nav className="px-2 pt-3 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = isActive(item, activeView, activeOpsTab);
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              type="button"
              onClick={(event) => {
                if (!expanded) {
                  // Don't let the rail's own click open it straight away.
                  event.stopPropagation();
                  openRequested = true;
                  openAfterPaint();
                }
                onNavigate(item.app, item.opsTab);
              }}
              aria-label={item.label}
              title={!expanded ? item.label : undefined}
              className={`w-full flex items-center gap-3 px-2.5 py-2.5 text-left overflow-hidden transition-colors border-l-2 border-y border-r ${
                active
                  ? 'bg-[var(--panel-alt)] text-[var(--text)] border-l-[var(--accent-text)] border-y-[var(--border)] border-r-[var(--border)]'
                  : 'text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)] border-l-transparent border-y-transparent border-r-transparent'
              }`}
            >
              <Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[var(--accent-text)]' : 'text-[var(--text-dim)]'}`} />
              <span className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] font-mono ${fade}`}>{item.label}</span>
              <ChevronRight
                className={`w-3.5 h-3.5 ml-auto shrink-0 transition-opacity motion-reduce:transition-none ${expanded && !active ? 'opacity-50' : 'opacity-0'}`}
              />
            </button>
          );
        })}
      </nav>

      {/* The user and sign-out live in the profile menu (top right); the
          bottom of the bar opens the welcome guide, on every screen. */}
      <div className="mt-auto shrink-0 p-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            setGuideOpen(true);
          }}
          aria-label="Welcome guide"
          title={!expanded ? 'Welcome guide' : undefined}
          className="w-full flex items-center gap-3 px-2.5 py-2.5 text-left overflow-hidden text-[var(--text-dim)] hover:text-[var(--text)] hover:bg-[var(--panel-alt)] transition-colors"
        >
          <HelpCircle className="w-4 h-4 shrink-0" />
          <span className={`whitespace-nowrap text-[11px] font-medium uppercase tracking-[0.12em] font-mono ${fade}`}>Welcome guide</span>
        </button>
      </div>
    </aside>
    {guideOpen && <WelcomeModal user={user} onClose={() => { markWelcomeSeen(); setGuideOpen(false); }} />}
    </>
  );
};
