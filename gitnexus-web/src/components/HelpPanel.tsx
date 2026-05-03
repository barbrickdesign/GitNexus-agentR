import React, { useState } from 'react';
import { X, GitBranch, Search, Filter, Zap, Keyboard, BarChart2, HelpCircle } from 'lucide-react';

interface HelpPanelProps {
  isOpen: boolean;
  onClose: () => void;
  nodeCount: number;
  edgeCount: number;
}

type TabId = 'overview' | 'graph' | 'search' | 'ai' | 'shortcuts' | 'status';

interface Tab {
  id: TabId;
  label: string;
  icon: React.ReactNode;
}

const tabs: Tab[] = [
  { id: 'overview', label: 'Overview', icon: <HelpCircle className="h-4 w-4" /> },
  { id: 'graph', label: 'Graph & nodes', icon: <GitBranch className="h-4 w-4" /> },
  { id: 'search', label: 'Search & filter', icon: <Search className="h-4 w-4" /> },
  { id: 'ai', label: 'Nexus AI', icon: <Zap className="h-4 w-4" /> },
  { id: 'shortcuts', label: 'Shortcuts', icon: <Keyboard className="h-4 w-4" /> },
  { id: 'status', label: 'Status bar', icon: <BarChart2 className="h-4 w-4" /> },
];

const shortcuts = [
  { label: 'Search nodes', mac: '⌘ K', win: 'Ctrl K' },
  { label: 'Deselect / close', mac: 'Esc', win: 'Esc' },
];

const nodeColors = [
  { color: '#10b981', label: 'Function', desc: 'Function declarations' },
  { color: '#3b82f6', label: 'File', desc: 'Source files' },
  { color: '#f59e0b', label: 'Class', desc: 'Class declarations' },
  { color: '#14b8a6', label: 'Method', desc: 'Class methods' },
  { color: '#ec4899', label: 'Interface', desc: 'TypeScript interfaces' },
  { color: '#6366f1', label: 'Folder', desc: 'Directory nodes' },
];

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1 text-[11px] font-medium tracking-widest text-text-muted uppercase">
      {children}
    </p>
  );
}

// ── Info card ─────────────────────────────────────────────────────────────────

function InfoCard({
  accent,
  title,
  children,
}: {
  accent?: string;
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-xl bg-white/[0.04] px-3.5 py-3"
      style={accent ? { borderLeft: `2px solid ${accent}` } : undefined}
    >
      {title && <p className="mb-1 text-[13px] font-medium text-text-primary">{title}</p>}
      <div className="text-xs leading-relaxed text-text-secondary">{children}</div>
    </div>
  );
}

// ── Kbd ───────────────────────────────────────────────────────────────────────

function Kbd({ children, platform }: { children: React.ReactNode; platform?: 'mac' | 'win' }) {
  return (
    <kbd
      className={`rounded border px-2 py-0.5 font-mono text-[11px] whitespace-nowrap ${
        platform === 'win'
          ? 'border-blue-500/20 bg-white/[0.08] text-blue-300'
          : 'border-white/10 bg-white/[0.08] text-text-primary'
      }`}
    >
      {children}
    </kbd>
  );
}

// ── TabContent ────────────────────────────────────────────────────────────────

function TabContent({
  active,
  nodeCount,
  edgeCount,
}: {
  active: TabId;
  nodeCount: number;
  edgeCount: number;
}) {
  if (active === 'overview')
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel>Getting started</SectionLabel>

        <InfoCard accent="#a78bfa" title="What is GitNexus?">
          An interactive graph explorer for your codebase. Every file, function, and import becomes
          a node you can explore, query, and navigate visually.
        </InfoCard>

        <InfoCard accent="#34d399" title="Your current repo">
          <span className="font-mono text-accent">{nodeCount}</span> nodes ·{' '}
          <span className="font-mono text-accent">{edgeCount}</span> edges loaded.
        </InfoCard>

        <InfoCard accent="#60a5fa" title="Three ways to explore">
          <strong className="font-medium text-text-primary">1.</strong> Click nodes to inspect
          <br />
          <strong className="font-medium text-text-primary">2.</strong> Search by name or type
          <br />
          <strong className="font-medium text-text-primary">3.</strong> Ask Nexus AI a natural
          language question
        </InfoCard>

        <InfoCard accent="#fbbf24" title="Navigation">
          · Scroll to zoom
          <br />
          · Click and drag to pan
          <br />· Double-click a node to focus its subgraph
        </InfoCard>
      </div>
    );

  if (active === 'graph')
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel>Node color legend</SectionLabel>

        {nodeColors.map(({ color, label, desc }) => (
          <div key={label} className="flex items-start gap-2.5">
            <span
              className="mt-1 h-3 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: color }}
            />
            <div>
              <p className="mb-0.5 text-xs font-medium text-text-primary">{label} nodes</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}

        <hr className="border-white/[0.08]" />

        <p className="text-xs leading-relaxed text-text-secondary">
          Node <strong className="font-medium text-text-primary">size</strong> reflects connection
          count — larger nodes are depended on by more files. Edges point from importer → imported.
        </p>

        <InfoCard>
          Click any node to open its detail panel — showing imports, exports, and reverse
          dependencies.
        </InfoCard>
      </div>
    );

  if (active === 'search')
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel>Search & filter</SectionLabel>

        <InfoCard title="Search nodes">
          <div className="mb-2 flex items-center gap-2">
            <Kbd>⌘K</Kbd>
            <span className="text-text-muted">/</span>
            <Kbd platform="win">Ctrl K</Kbd>
          </div>
          Search by filename, function name, or import path. Matching nodes are highlighted live in
          the graph.
        </InfoCard>

        <InfoCard title="Filter panel">
          <div className="mb-2 flex items-center gap-2">
            <Filter className="h-3.5 w-3.5 text-accent" />
          </div>
          Use the filter icon in the left sidebar to isolate specific node types, hide leaf nodes,
          or focus on a depth range from a selected root.
        </InfoCard>

        <InfoCard title="Search syntax">
          {[
            { query: 'auth', hint: 'match by name fragment' },
            { query: './utils/', hint: 'match by path prefix' },
            { query: 'type:config', hint: 'filter by node type' },
          ].map(({ query, hint }) => (
            <div key={query} className="mb-1 flex items-baseline gap-2">
              <code className="shrink-0 rounded bg-accent/10 px-1.5 py-0.5 font-mono text-[11px] text-accent">
                {query}
              </code>
              <span className="text-text-muted">{hint}</span>
            </div>
          ))}
        </InfoCard>
      </div>
    );

  if (active === 'ai')
    return (
      <div className="flex flex-col gap-3">
        <SectionLabel>Nexus AI</SectionLabel>

        <div className="rounded-xl border border-accent/25 bg-accent/8 px-3.5 py-3">
          <p className="mb-1 text-xs font-medium text-accent">✓ Semantic Ready</p>
          <p className="text-xs leading-relaxed text-text-secondary">
            Your repo is indexed and ready for semantic queries. Nexus AI understands code structure
            and relationships, not just file names.
          </p>
        </div>

        <p className="text-xs text-text-secondary">Try asking:</p>
        {[
          '"Which files depend on the auth module?"',
          '"Find circular dependencies in this repo"',
          '"What are the most connected components?"',
          '"Show me all files that import useEffect"',
        ].map((q) => (
          <div key={q} className="rounded-lg bg-white/[0.04] px-3 py-2 text-xs italic text-text-primary">
            {q}
          </div>
        ))}

        <hr className="border-white/[0.08]" />

        <p className="text-xs leading-relaxed text-text-secondary">
          Open the prompt via the{' '}
          <span className="font-medium text-text-primary">Nexus AI</span> button (top-right).
        </p>
      </div>
    );

  if (active === 'shortcuts')
    return (
      <div className="flex flex-col">
        {/* Column headers */}
        <div className="mb-1 grid grid-cols-[1fr_80px_88px] gap-2 border-b border-white/[0.08] pb-2">
          <span className="text-[11px] font-medium tracking-widest text-text-muted uppercase">
            Action
          </span>
          <span className="text-center text-[11px] font-medium tracking-widest text-text-muted uppercase">
            Mac
          </span>
          <span className="text-center text-[11px] font-medium tracking-widest text-blue-300/70 uppercase">
            Windows
          </span>
        </div>

        {shortcuts.map(({ label, mac, win }, i) => (
          <div
            key={label}
            className={`grid grid-cols-[1fr_80px_88px] items-center gap-2 py-2 ${
              i < shortcuts.length - 1 ? 'border-b border-white/[0.05]' : ''
            }`}
          >
            <span className="text-xs text-text-secondary">{label}</span>
            <span className="flex justify-center">
              <Kbd>{mac}</Kbd>
            </span>
            <span className="flex justify-center">
              <Kbd platform="win">{win}</Kbd>
            </span>
          </div>
        ))}
      </div>
    );

  if (active === 'status')
    return (
      <div className="flex flex-col gap-2">
        <SectionLabel>Status bar explained</SectionLabel>

        {[
          {
            badge: <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />,
            title: 'Ready',
            desc: 'Graph is fully loaded and interactive',
          },
          {
            badge: <span className="shrink-0 font-mono text-xs font-medium text-accent">{nodeCount}</span>,
            title: 'Nodes count',
            desc: 'Total files and symbols in the graph',
          },
          {
            badge: <span className="shrink-0 font-mono text-xs font-medium text-node-file">{edgeCount}</span>,
            title: 'Edges count',
            desc: 'Import / dependency connections',
          },
          {
            badge: <span className="shrink-0 whitespace-nowrap font-mono text-[11px] font-medium text-emerald-400">Semantic Ready</span>,
            title: 'AI index status',
            desc: 'Repo is fully indexed for AI queries',
          },
        ].map(({ badge, title, desc }) => (
          <div
            key={title}
            className="flex items-center gap-3 rounded-xl bg-white/[0.04] px-3.5 py-2.5"
          >
            {badge}
            <div>
              <p className="mb-0.5 text-xs font-medium text-text-primary">{title}</p>
              <p className="text-xs text-text-secondary">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    );

  return null;
}

export const HelpPanel = ({ isOpen, onClose, nodeCount, edgeCount }: HelpPanelProps) => {
  const [active, setActive] = useState<TabId>('overview');

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel */}
      <div className="relative mx-4 flex h-[60vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#12121a] font-sans shadow-[0_25px_60px_rgba(0,0,0,0.7)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/[0.08] bg-white/[0.02] px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/15">
              <HelpCircle className="h-5 w-5 text-accent" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-text-primary">Help &amp; Reference</h2>
              <p className="text-xs text-text-muted">GitNexus — graph explorer</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-text-muted transition-colors hover:bg-white/[0.06] hover:text-text-primary"
            aria-label="Close help panel"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body: sidebar + content */}
        <div className="grid min-h-0 flex-1 grid-cols-[168px_1fr] overflow-hidden">
          {/* Sidebar nav */}
          <div className="flex flex-col gap-0.5 border-r border-white/[0.08] p-3">
            {tabs.map(({ id, label, icon }) => {
              const isActive = active === id;
              return (
                <button
                  key={id}
                  onClick={() => setActive(id)}
                  className={`flex cursor-pointer items-center gap-2 rounded-lg px-2.5 py-2 text-left text-xs transition-all ${
                    isActive
                      ? 'bg-accent/12 text-accent'
                      : 'text-text-secondary hover:bg-white/[0.04] hover:text-text-primary'
                  }`}
                >
                  <span className={`flex shrink-0 ${isActive ? 'text-accent' : 'text-text-muted'}`}>
                    {icon}
                  </span>
                  {label}
                </button>
              );
            })}
          </div>

          {/* Content pane */}
          <div className="scrollbar-thin overflow-y-auto p-5">
            <TabContent active={active} nodeCount={nodeCount} edgeCount={edgeCount} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-white/[0.08] bg-white/[0.01] px-5 py-2.5">
          <span className="text-[11px] text-text-muted">
            GitNexus — open source codebase graph explorer
          </span>
          <a
            href="https://github.com/abhigyanpatwari/GitNexus"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[11px] text-accent transition-colors hover:text-accent/80"
          >
            Docs &amp; GitHub ↗
          </a>
        </div>
      </div>
    </div>
  );
};
