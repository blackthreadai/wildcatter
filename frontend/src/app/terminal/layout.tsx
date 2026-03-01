import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Terminal',
  description: 'Energy Terminal - Desktop energy data platform',
};

export default function TerminalLayout({ children }: { children: React.ReactNode }) {
  return children;
}