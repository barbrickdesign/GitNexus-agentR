import type { PipelineProgress } from 'gitnexus-shared';
import { GitNexusLogo } from './GitNexusLogo';

interface LoadingOverlayProps {
  progress: PipelineProgress;
}

export const LoadingOverlay = ({ progress }: LoadingOverlayProps) => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-void">
      {/* Background gradient effects */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/3 left-1/3 h-96 w-96 animate-pulse rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute right-1/3 bottom-1/3 h-96 w-96 animate-pulse rounded-full bg-node-interface/10 blur-3xl" />
      </div>

      {/* Logo + pulsing ring */}
      <div className="relative mb-10 flex items-center justify-center">
        <div className="absolute h-28 w-28 animate-pulse-glow rounded-full bg-gradient-to-br from-accent/40 to-node-interface/40 blur-2xl" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-node-interface shadow-glow">
          <GitNexusLogo size={48} className="!bg-transparent !shadow-none" />
        </div>
      </div>

      {/* Brand name */}
      <p className="mb-6 text-sm font-medium tracking-widest text-text-muted uppercase">
        GitNexus
      </p>

      {/* Progress bar */}
      <div className="mb-4 w-80">
        <div className="h-1.5 overflow-hidden rounded-full bg-elevated">
          <div
            className="h-full rounded-full bg-gradient-to-r from-accent to-node-interface transition-all duration-300 ease-out"
            style={{ width: `${progress.percent}%` }}
          />
        </div>
      </div>

      {/* Status text */}
      <div className="text-center">
        <p className="mb-1 font-mono text-sm text-text-secondary">
          {progress.message}
          <span className="animate-pulse">|</span>
        </p>
        {progress.detail && (
          <p className="max-w-md truncate font-mono text-xs text-text-muted">{progress.detail}</p>
        )}
      </div>

      {/* Stats */}
      {progress.stats && (
        <div className="mt-8 flex items-center gap-6 text-xs text-text-muted">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-node-file" />
            <span>
              {progress.stats.filesProcessed} / {progress.stats.totalFiles} files
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-node-function" />
            <span>{progress.stats.nodesCreated} nodes</span>
          </div>
        </div>
      )}

      {/* Percent */}
      <p className="mt-4 font-mono text-3xl font-semibold text-text-primary">{progress.percent}%</p>
    </div>
  );
};
