import type { ReactNode } from 'react';
import { TabBar } from './TabBar';
import { TopBar } from './TopBar';

export function TouchShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-dvh">
      <TopBar />
      <main
        className="mx-auto w-full max-w-2xl"
        style={{
          paddingLeft: 'max(16px, env(safe-area-inset-left))',
          paddingRight: 'max(16px, env(safe-area-inset-right))',
          paddingBottom: 'calc(env(safe-area-inset-bottom) + 112px)',
        }}
      >
        {children}
      </main>
      <TabBar />
    </div>
  );
}
