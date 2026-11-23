'use client';

import { useTheme } from 'next-themes';
import { AnimatePresence, motion } from 'motion/react';
import { useSessionContext } from '@livekit/components-react';
import { InterviewView } from '@/components/app/interview-view';
import { type InterviewFocus, WelcomeView } from '@/components/app/welcome-view';

const MotionWelcomeView = motion.create(WelcomeView);
const MotionInterviewView = motion.create(InterviewView);

const VIEW_MOTION_PROPS = {
  variants: {
    visible: { opacity: 1 },
    hidden: { opacity: 0 },
  },
  initial: 'hidden',
  animate: 'visible',
  exit: 'hidden',
  transition: { duration: 0.4, ease: 'easeOut' },
} as const;

interface ViewControllerProps {
  focus: InterviewFocus;
  onFocusChange: (focus: InterviewFocus) => void;
}

export function ViewController({ focus, onFocusChange }: ViewControllerProps) {
  const { isConnected, start } = useSessionContext();
  const { resolvedTheme } = useTheme();

  return (
    <AnimatePresence mode="wait">
      {!isConnected && (
        <MotionWelcomeView
          key="welcome"
          {...VIEW_MOTION_PROPS}
          startButtonText="Start interview"
          onStartCall={start}
          focus={focus}
          onFocusChange={onFocusChange}
        />
      )}
      {isConnected && (
        <MotionInterviewView
          key="interview"
          {...VIEW_MOTION_PROPS}
          focus={focus}
          themeMode={resolvedTheme === 'dark' ? 'dark' : 'light'}
        />
      )}
    </AnimatePresence>
  );
}
