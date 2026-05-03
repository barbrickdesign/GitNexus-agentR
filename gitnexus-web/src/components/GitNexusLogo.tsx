interface GitNexusLogoProps {
  /** Size in pixels for the icon container (default: 28) */
  size?: number;
  className?: string;
}

/**
 * GitNexus brand logo — a hexagonal node-graph mark that reflects the product's
 * code-graph identity. Replaces the plain "◇" glyph throughout the UI.
 */
export const GitNexusLogo = ({ size = 28, className = '' }: GitNexusLogoProps) => {
  return (
    <div
      className={`flex items-center justify-center rounded-lg bg-gradient-to-br from-accent to-node-interface shadow-glow ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <svg
        width={Math.round(size * 0.64)}
        height={Math.round(size * 0.64)}
        viewBox="0 0 20 20"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Central node */}
        <circle cx="10" cy="10" r="2.5" fill="white" fillOpacity="0.95" />
        {/* Top node */}
        <circle cx="10" cy="3" r="1.5" fill="white" fillOpacity="0.7" />
        {/* Bottom node */}
        <circle cx="10" cy="17" r="1.5" fill="white" fillOpacity="0.7" />
        {/* Top-right node */}
        <circle cx="16.2" cy="6.5" r="1.5" fill="white" fillOpacity="0.7" />
        {/* Bottom-left node */}
        <circle cx="3.8" cy="13.5" r="1.5" fill="white" fillOpacity="0.7" />
        {/* Edges from center */}
        <line x1="10" y1="10" x2="10" y2="4.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <line x1="10" y1="10" x2="10" y2="15.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <line x1="10" y1="10" x2="15" y2="7.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        <line x1="10" y1="10" x2="5" y2="12.5" stroke="white" strokeOpacity="0.5" strokeWidth="1" />
        {/* Cross edge */}
        <line x1="10" y1="4.5" x2="15" y2="7.5" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" />
        <line x1="10" y1="15.5" x2="5" y2="12.5" stroke="white" strokeOpacity="0.3" strokeWidth="0.75" />
      </svg>
    </div>
  );
};
