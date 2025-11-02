// Prefer official MUI icon when available; keep a small wrapper for consistent API.
import SvgIcon, { SvgIconProps } from '@mui/material/SvgIcon';
import * as React from 'react';

// Prefer official MUI icon when available; keep a small wrapper for consistent API.
let WorkspacePremiumIcon: React.ComponentType<SvgIconProps> | undefined;
try {
  // Try to require the official icon at runtime/build-time; if not installed, we'll fallback.
  // Use require to avoid static ESM resolution errors in build environments where the
  // dependency hasn't been installed yet.
  const mod = require('@mui/icons-material/WorkspacePremium');
  WorkspacePremiumIcon = mod && (mod.default || mod);
} catch (e) {
  WorkspacePremiumIcon = undefined;
}

// Lightweight inline icons to avoid pulling @mui/icons-material heavy tree.

export const RefreshSmall = (props: SvgIconProps) => (
  <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24">
    <path d="M17.65 6.35A7.95 7.95 0 0012 4a8 8 0 100 16 8 8 0 007.75-6h-2.1A6 6 0 1112 6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
  </SvgIcon>
);

export const CircleStatus = (props: SvgIconProps) => (
  <SvgIcon fontSize="inherit" {...props} viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="10" />
  </SvgIcon>
);

export const ErrorOutline = (props: SvgIconProps) => (
  <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24">
    <path d="M11 15h2v2h-2v-2zm0-8h2v6h-2V7zm.99-5C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2z" />
  </SvgIcon>
);

export const InfoOutlined = (props: SvgIconProps) => (
  <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24">
    <path d="M11 17h2v-6h-2v6zm0-8h2V7h-2v2zm1-7C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z" />
  </SvgIcon>
);

export const WarningAmber = (props: SvgIconProps) => (
  <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24">
    <path d="M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
  </SvgIcon>
);

/** @public */
export const WorkspacePremiumSmall = (props: SvgIconProps) => {
  if (WorkspacePremiumIcon) {
    return <WorkspacePremiumIcon fontSize="small" {...(props as any)} />;
  }
  // Fallback inline path when official icon not available
  return (
    <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24">
      <path d="M12 2 15 8l6 .5-4.5 3.8L18 20l-6-3.2L6 20l1.5-7.7L3 8.5 9 8z" />
    </SvgIcon>
  );
};

// GitHub icon: prefer official MUI icon at runtime, fallback to a small GitHub SVG path
let GitHubIcon: React.ComponentType<SvgIconProps> | undefined;
try {
  const mod = require('@mui/icons-material/GitHub');
  GitHubIcon = mod && (mod.default || mod);
} catch (e) {
  GitHubIcon = undefined;
}

/** @public */
export const GitHubSmall = (props: SvgIconProps) => {
  if (GitHubIcon) {
    return <GitHubIcon fontSize="small" {...(props as any)} />;
  }
  // Lightweight GitHub mark path (fallback)
  return (
    <SvgIcon fontSize="small" {...props} viewBox="0 0 24 24" sx={{ color: 'var(--mui-palette-text-secondary, rgba(0, 0, 0, 0.6))' }}>
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58 0-.29-.01-1.04-.02-2.04-3.34.73-4.04-1.61-4.04-1.61-.55-1.4-1.34-1.77-1.34-1.77-1.09-.75.08-.73.08-.73 1.2.08 1.83 1.24 1.83 1.24 1.07 1.83 2.8 1.3 3.48.99.11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.34-5.47-5.96 0-1.32.47-2.4 1.24-3.25-.12-.3-.54-1.52.12-3.17 0 0 1.01-.32 3.3 1.23a11.48 11.48 0 013.01-.4c1.02.01 2.05.14 3.01.4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.65.24 2.87.12 3.17.77.85 1.24 1.93 1.24 3.25 0 4.63-2.8 5.66-5.48 5.95.43.37.81 1.1.81 2.22 0 1.6-.01 2.88-.01 3.27 0 .32.22.7.83.58C20.57 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
    </SvgIcon>
  );
};

// Prefer the official MUI icon for consumers when available. We keep a named export wrapper
// so host apps can import { WorkspacePremiumSmall } from the package root as before.
