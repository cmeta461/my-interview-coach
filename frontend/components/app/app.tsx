'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { TokenSource } from 'livekit-client';
import { useSession } from '@livekit/components-react';
import { WarningIcon } from '@phosphor-icons/react/dist/ssr';
import { AgentSessionProvider } from '@/components/agents-ui/agent-session-provider';
import { StartAudioButton } from '@/components/agents-ui/start-audio-button';
import { ViewController } from '@/components/app/view-controller';
import type { AccessState, InterviewFocus } from '@/components/app/welcome-view';
import { Toaster } from '@/components/ui/sonner';
import { useAgentErrors } from '@/hooks/useAgentErrors';
import { useDebugMode } from '@/hooks/useDebug';

const IN_DEVELOPMENT = process.env.NODE_ENV !== 'production';

function AppSetup() {
  useDebugMode({ enabled: IN_DEVELOPMENT });
  useAgentErrors();

  return null;
}

interface AppProps {
  tokenServerId?: string;
  tokenEndpoint: string;
  agentName?: string;
  isVideoInputSupported?: boolean;
}

export function App({ tokenServerId, tokenEndpoint, agentName }: AppProps) {
  const [focus, setFocus] = useState<InterviewFocus>('mixed');
  const [access, setAccess] = useState<AccessState>({
    required: false,
    unlocked: true,
    ready: false,
  });

  // Ask the server whether a passcode is needed and whether this browser already unlocked.
  useEffect(() => {
    fetch('/api/unlock')
      .then((r) => r.json())
      .then((d) => setAccess({ required: !!d.required, unlocked: !!d.unlocked, ready: true }))
      .catch(() => setAccess({ required: false, unlocked: true, ready: true }));
  }, []);

  const unlock = useCallback(async (passcode: string) => {
    const res = await fetch('/api/unlock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ passcode }),
    });
    if (res.ok) setAccess((a) => ({ ...a, unlocked: true }));
    return res.ok;
  }, []);

  // The chosen focus travels to the agent as a participant attribute set by /api/token.
  const tokenSource = useMemo(
    () =>
      tokenServerId
        ? TokenSource.developmentTokenServer(tokenServerId)
        : TokenSource.endpoint(
            tokenEndpoint.startsWith('/') ? `${tokenEndpoint}?focus=${focus}` : tokenEndpoint
          ),
    [tokenServerId, tokenEndpoint, focus]
  );

  const session = useSession(tokenSource, agentName ? { agentName } : undefined);

  return (
    <AgentSessionProvider session={session}>
      <AppSetup />
      <main className="min-h-svh">
        <ViewController focus={focus} onFocusChange={setFocus} access={access} onUnlock={unlock} />
      </main>
      <StartAudioButton label="Start Audio" />
      <Toaster
        icons={{
          warning: <WarningIcon weight="bold" />,
        }}
        position="top-center"
        className="toaster group"
        style={
          {
            '--normal-bg': 'var(--popover)',
            '--normal-text': 'var(--popover-foreground)',
            '--normal-border': 'var(--border)',
          } as React.CSSProperties
        }
      />
    </AgentSessionProvider>
  );
}
