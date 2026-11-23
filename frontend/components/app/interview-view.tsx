'use client';

import { useEffect, useState } from 'react';
import { useAgent, useSessionContext, useSessionMessages } from '@livekit/components-react';
import { AgentChatTranscript } from '@/components/agents-ui/agent-chat-transcript';
import { AgentControlBar } from '@/components/agents-ui/agent-control-bar';
import { AudioVisualizer } from '@/components/agents-ui/blocks/agent-session-view-01/components/audio-visualizer';
import { FOCUS_OPTIONS, type InterviewFocus } from '@/components/app/welcome-view';
import { cn } from '@/lib/shadcn/utils';

function useElapsed() {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setSeconds((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0');
  const ss = String(seconds % 60).padStart(2, '0');
  return `${mm}:${ss}`;
}

const STATE_LABEL: Record<string, string> = {
  connecting: 'Connecting…',
  initializing: 'Getting ready…',
  listening: 'Listening',
  thinking: 'Thinking…',
  speaking: 'Speaking',
};

/**
 * The coach's "stage". Today it shows an audio visualizer. When the AI avatar is added,
 * render it here instead (the agent's video track is available from `useVoiceAssistant`).
 */
function CoachStage({ themeMode }: { themeMode: 'dark' | 'light' }) {
  const { state } = useAgent();
  return (
    <div className="@container/agent-session-block relative flex h-full flex-col items-center justify-center gap-6">
      <div className="from-primary/20 absolute size-72 rounded-full bg-radial to-transparent blur-3xl md:size-[28rem]" />
      <AudioVisualizer
        type="aura"
        isChatOpen={false}
        themeMode={themeMode}
        className="relative size-[240px] md:size-[340px]"
      />
      <div className="relative text-center">
        <p className="text-lg font-semibold">Alex</p>
        <p className="text-muted-foreground text-sm">
          Your interview coach · {STATE_LABEL[state ?? ''] ?? 'Ready'}
        </p>
      </div>
    </div>
  );
}

interface InterviewViewProps {
  focus: InterviewFocus;
  themeMode: 'dark' | 'light';
  className?: string;
}

export function InterviewView({ focus, themeMode, className }: InterviewViewProps) {
  const session = useSessionContext();
  const { messages } = useSessionMessages(session);
  const { state: agentState } = useAgent();
  const elapsed = useElapsed();
  const [showTranscript, setShowTranscript] = useState(false);
  const focusLabel = FOCUS_OPTIONS.find((o) => o.id === focus)?.label ?? 'Full mock';

  return (
    <section className={cn('relative flex h-svh flex-col pt-16', className)}>
      {/* status row */}
      <div className="flex items-center justify-center gap-2 px-4 pb-2">
        <span className="bg-card/70 flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium backdrop-blur">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          Live · {focusLabel}
        </span>
        <span className="bg-card/70 rounded-full border px-3 py-1 font-mono text-xs backdrop-blur">
          {elapsed}
        </span>
      </div>

      <div className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 gap-4 px-4 pb-2">
        <div
          className={cn('min-w-0 flex-1', showTranscript && 'hidden lg:block')}
          aria-hidden={showTranscript}
        >
          <CoachStage themeMode={themeMode} />
        </div>

        {/* transcript: side panel on desktop, toggled on mobile */}
        <aside
          className={cn(
            'bg-card/60 min-h-0 w-full flex-col overflow-hidden rounded-3xl border backdrop-blur lg:flex lg:w-[26rem] lg:shrink-0',
            showTranscript ? 'flex' : 'hidden'
          )}
        >
          <div className="border-b px-5 py-3 text-sm font-semibold">Transcript</div>
          <div className="relative min-h-0 flex-1">
            {messages.length === 0 ? (
              <p className="text-muted-foreground p-5 text-sm">
                The conversation will appear here as you talk.
              </p>
            ) : (
              <AgentChatTranscript
                agentState={agentState}
                messages={messages}
                className="h-full **:data-[slot=message-scroller-content]:p-4"
              />
            )}
          </div>
        </aside>
      </div>

      <div className="mx-auto w-full max-w-xl px-3 pb-4 md:pb-8">
        <AgentControlBar
          variant="livekit"
          controls={{
            leave: true,
            microphone: true,
            chat: true,
            camera: false,
            screenShare: false,
          }}
          isChatOpen={showTranscript}
          isConnected={session.isConnected}
          onDisconnect={session.end}
          onIsChatOpenChange={setShowTranscript}
        />
      </div>
    </section>
  );
}
