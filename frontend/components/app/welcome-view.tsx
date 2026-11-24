import { useState } from 'react';
import {
  BracketsCurlyIcon,
  ChatsCircleIcon,
  StackIcon,
  WavesIcon,
} from '@phosphor-icons/react/dist/ssr';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/shadcn/utils';

export type InterviewFocus = 'mixed' | 'behavioral' | 'coding' | 'system-design';

export const FOCUS_OPTIONS: {
  id: InterviewFocus;
  label: string;
  blurb: string;
  Icon: typeof WavesIcon;
}[] = [
  { id: 'mixed', label: 'Full mock', blurb: 'Behavioral, coding and design', Icon: WavesIcon },
  {
    id: 'behavioral',
    label: 'Behavioral',
    blurb: 'STAR stories and soft skills',
    Icon: ChatsCircleIcon,
  },
  {
    id: 'coding',
    label: 'Coding',
    blurb: 'Algorithms and data structures',
    Icon: BracketsCurlyIcon,
  },
  {
    id: 'system-design',
    label: 'System design',
    blurb: 'Architecture and tradeoffs',
    Icon: StackIcon,
  },
];

const STEPS = [
  ['Pick a focus', 'Choose the kind of round you want to practice.'],
  ['Talk it out', 'Answer out loud, just like the real thing.'],
  ['Get feedback', 'Honest, specific coaching after every answer.'],
];

export interface AccessState {
  required: boolean;
  unlocked: boolean;
  ready: boolean;
}

interface WelcomeViewProps {
  access: AccessState;
  onUnlock: (passcode: string) => Promise<boolean>;
  startButtonText: string;
  onStartCall: () => void;
  focus: InterviewFocus;
  onFocusChange: (focus: InterviewFocus) => void;
}

export const WelcomeView = ({
  startButtonText,
  onStartCall,
  focus,
  onFocusChange,
  access,
  onUnlock,
  ref,
}: React.ComponentProps<'div'> & WelcomeViewProps) => {
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const locked = access.required && !access.unlocked;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    const ok = await onUnlock(passcode);
    setBusy(false);
    if (!ok) setError('Incorrect passcode. Try again.');
  };

  return (
    <div ref={ref} className="min-h-svh overflow-y-auto px-4 pt-20 pb-10 md:pt-24">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <span className="bg-primary/10 text-primary border-primary/20 rounded-full border px-3 py-1 text-xs font-medium">
          AI mock interviews for software engineers
        </span>
        <h1 className="mt-5 text-4xl font-semibold tracking-tight text-balance md:text-6xl">
          Practice the interview <span className="text-primary">before it counts.</span>
        </h1>
        <p className="text-muted-foreground mt-4 max-w-xl text-base text-pretty md:text-lg">
          Talk with a voice coach that asks real technical interview questions, pushes back on vague
          answers, and tells you exactly how to improve.
        </p>

        <div
          role="radiogroup"
          aria-label="Interview focus"
          className="mt-10 grid w-full grid-cols-2 gap-3 md:grid-cols-4"
        >
          {FOCUS_OPTIONS.map(({ id, label, blurb, Icon }) => {
            const selected = focus === id;
            return (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => onFocusChange(id)}
                className={cn(
                  'bg-card/70 group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left backdrop-blur transition-all',
                  'hover:border-primary/50 hover:-translate-y-0.5 hover:shadow-md',
                  selected && 'border-primary ring-primary/30 bg-primary/5 shadow-md ring-2'
                )}
              >
                <span
                  className={cn(
                    'flex size-9 items-center justify-center rounded-xl transition-colors',
                    selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-foreground'
                  )}
                >
                  <Icon size={20} weight="bold" />
                </span>
                <span className="text-sm font-semibold">{label}</span>
                <span className="text-muted-foreground text-xs leading-snug">{blurb}</span>
              </button>
            );
          })}
        </div>

        {locked ? (
          <form onSubmit={submit} className="mt-8 flex w-full max-w-xs flex-col gap-3">
            <label htmlFor="passcode" className="text-sm font-medium">
              Enter the passcode to start
            </label>
            <input
              id="passcode"
              type="password"
              autoComplete="off"
              value={passcode}
              onChange={(e) => setPasscode(e.target.value)}
              className="bg-card border-input focus-visible:ring-ring h-12 rounded-full border px-5 text-center text-base outline-none focus-visible:ring-2"
              placeholder="Passcode"
            />
            {error && (
              <p role="alert" className="text-destructive text-sm">
                {error}
              </p>
            )}
            <Button
              type="submit"
              size="lg"
              disabled={busy || passcode.length === 0}
              className="h-12 rounded-full text-base font-semibold shadow-lg"
            >
              {busy ? 'Checking…' : 'Unlock'}
            </Button>
          </form>
        ) : (
          <>
            <Button
              size="lg"
              onClick={onStartCall}
              disabled={!access.ready}
              className="mt-8 h-12 w-full max-w-xs rounded-full text-base font-semibold shadow-lg"
            >
              {startButtonText}
            </Button>
            <p className="text-muted-foreground mt-3 text-xs">
              Your browser will ask for microphone access.
            </p>
          </>
        )}

        <ol className="mt-14 grid w-full gap-4 text-left md:grid-cols-3">
          {STEPS.map(([title, body], i) => (
            <li key={title} className="flex gap-3">
              <span className="bg-warm/20 text-foreground flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold">
                {i + 1}
              </span>
              <div>
                <p className="text-sm font-semibold">{title}</p>
                <p className="text-muted-foreground text-sm">{body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
