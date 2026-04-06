import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { X, ArrowRight, ArrowLeft, Sparkles, Globe, Search, FileText, Zap, PartyPopper } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingWizardProps {
  onComplete: () => void;
  onPrefill?: (text: string) => void;
}

const TOTAL_STEPS = 4;

const ConfettiPiece = ({ delay, x }: { delay: number; x: number }) => (
  <motion.div
    className="absolute w-2 h-2 rounded-sm"
    style={{
      left: `${x}%`,
      top: '40%',
      backgroundColor: ['hsl(var(--primary))', '#f59e0b', '#10b981', '#8b5cf6', '#ef4444', '#06b6d4'][Math.floor(Math.random() * 6)],
    }}
    initial={{ y: 0, opacity: 1, rotate: 0, scale: 1 }}
    animate={{
      y: [0, -80, 120],
      opacity: [1, 1, 0],
      rotate: [0, 180, 360],
      scale: [1, 1.2, 0.5],
      x: [(Math.random() - 0.5) * 100, (Math.random() - 0.5) * 200],
    }}
    transition={{ duration: 2, delay, ease: 'easeOut' }}
  />
);

export function OnboardingWizard({ onComplete, onPrefill }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const { user } = useAuth();

  const markComplete = useCallback(async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true } as any)
        .eq('id', user.id);
    }
    onComplete();
  }, [user, onComplete]);

  const handleDismiss = () => markComplete();
  const handleNext = () => step < TOTAL_STEPS - 1 ? setStep(step + 1) : markComplete();
  const handleBack = () => step > 0 && setStep(step - 1);

  const handleTryIt = () => {
    onPrefill?.('Create a landing page for my coaching business');
    markComplete();
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm"
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
        className="relative w-full max-w-lg mx-4 bg-card border border-border/60 rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Dismiss */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        {/* Step content */}
        <div className="min-h-[380px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && <StepWelcome key="s0" />}
            {step === 1 && <StepBuild key="s1" onTryIt={handleTryIt} />}
            {step === 2 && <StepAutomate key="s2" />}
            {step === 3 && <StepReady key="s3" />}
          </AnimatePresence>
        </div>

        {/* Footer: progress dots + nav */}
        <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
            )}
            <Button size="sm" onClick={handleNext} className="gap-1 text-xs">
              {step === TOTAL_STEPS - 1 ? 'Start Building' : 'Next'}
              {step < TOTAL_STEPS - 1 && <ArrowRight className="h-3 w-3" />}
            </Button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

/* ---- Step Components ---- */

const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

function StepWelcome() {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', delay: 0.15, damping: 12 }}
        className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
      >
        <Sparkles className="h-10 w-10 text-primary" />
      </motion.div>
      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        Welcome to GarlicBread 🍞
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-sm text-muted-foreground max-w-xs leading-relaxed"
      >
        Build websites, automate tasks, and grow your business with AI
      </motion.p>
    </motion.div>
  );
}

function StepBuild({ onTryIt }: { onTryIt: () => void }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.15 }}
        className="w-full max-w-sm mb-6"
      >
        {/* Mock chat input */}
        <div className="relative rounded-xl border-2 border-primary/40 bg-muted/30 p-4">
          <motion.div
            animate={{ boxShadow: ['0 0 0 0 hsl(var(--primary) / 0)', '0 0 0 8px hsl(var(--primary) / 0.15)', '0 0 0 0 hsl(var(--primary) / 0)'] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="rounded-xl"
          >
            <p className="text-sm text-muted-foreground italic text-left">
              "Create a landing page for my coaching business"
            </p>
          </motion.div>
          <div className="flex justify-end mt-3">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <Zap className="h-4 w-4 text-primary-foreground" />
            </div>
          </div>
        </div>
      </motion.div>

      <h3 className="text-lg font-semibold text-foreground mb-1">Build a Website</h3>
      <p className="text-sm text-muted-foreground max-w-xs mb-4">
        Type what you want and AI builds it instantly. No coding needed.
      </p>
      <Button size="sm" variant="outline" onClick={onTryIt} className="gap-1.5 text-xs border-primary/30 hover:bg-primary/10">
        <Sparkles className="h-3 w-3" /> Try it now
      </Button>
    </motion.div>
  );
}

function StepAutomate() {
  const commands = [
    { icon: Globe, label: '/browse', desc: 'Automate any website', color: 'text-blue-400' },
    { icon: FileText, label: '/scrape', desc: 'Extract page content', color: 'text-emerald-400' },
    { icon: Search, label: '/search', desc: 'Search the web with AI', color: 'text-amber-400' },
  ];

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="w-full max-w-xs space-y-2.5 mb-6">
        {commands.map((cmd, i) => (
          <motion.div
            key={cmd.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.15 + i * 0.1 }}
            className="flex items-center gap-3 p-3 rounded-xl border border-border/50 bg-muted/20 hover:bg-muted/40 transition-colors"
          >
            <div className="h-9 w-9 rounded-lg bg-card border border-border/40 flex items-center justify-center shrink-0">
              <cmd.icon className={`h-4 w-4 ${cmd.color}`} />
            </div>
            <div className="text-left">
              <p className="text-sm font-medium text-foreground font-mono">{cmd.label}</p>
              <p className="text-[11px] text-muted-foreground">{cmd.desc}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <h3 className="text-lg font-semibold text-foreground mb-1">Automate Your Browser</h3>
      <p className="text-sm text-muted-foreground max-w-xs">
        Let AI handle repetitive browser tasks for you
      </p>
    </motion.div>
  );
}

function StepReady() {
  const confettiPieces = Array.from({ length: 24 }).map((_, i) => ({
    delay: i * 0.05,
    x: Math.random() * 100,
  }));

  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">
      {/* Confetti */}
      {confettiPieces.map((piece, i) => (
        <ConfettiPiece key={i} delay={piece.delay} x={piece.x} />
      ))}

      <motion.div
        initial={{ scale: 0, rotate: -20 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: 'spring', delay: 0.1, damping: 10 }}
        className="h-20 w-20 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-6"
      >
        <PartyPopper className="h-10 w-10 text-primary" />
      </motion.div>

      <motion.h2
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="text-2xl font-bold text-foreground mb-2"
      >
        You're Ready! 🚀
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground max-w-xs"
      >
        Start by describing what you want to build. We'll handle the rest.
      </motion.p>
    </motion.div>
  );
}
