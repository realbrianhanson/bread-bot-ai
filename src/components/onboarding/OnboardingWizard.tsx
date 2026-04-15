import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X, ArrowRight, ArrowLeft, Sparkles, Megaphone, Code2, FlaskConical, LayoutGrid, PartyPopper, KeyRound, Eye, EyeOff } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface OnboardingWizardProps {
  onComplete: () => void;
  onPrefill?: (text: string) => void;
}

const TOTAL_STEPS = 4;

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState(0);
  const { user } = useAuth();
  const [useCase, setUseCase] = useState<string | null>(null);
  const [anthropicKey, setAnthropicKey] = useState('');
  const [browserUseKey, setBrowserUseKey] = useState('');
  const [showAnthropicKey, setShowAnthropicKey] = useState(false);
  const [showBrowserUseKey, setShowBrowserUseKey] = useState(false);
  const [savingKeys, setSavingKeys] = useState(false);

  const markComplete = useCallback(async () => {
    if (user) {
      await supabase
        .from('profiles')
        .update({ has_completed_onboarding: true } as any)
        .eq('id', user.id);
    }
    onComplete();
  }, [user, onComplete]);

  const saveApiKeys = async () => {
    if (!user) return;
    setSavingKeys(true);
    try {
      const keysToSave = [];
      if (anthropicKey.trim()) keysToSave.push({ provider: 'anthropic', key: anthropicKey.trim() });
      if (browserUseKey.trim()) keysToSave.push({ provider: 'browser_use', key: browserUseKey.trim() });

      for (const { provider, key } of keysToSave) {
        await supabase.functions.invoke('manage-api-keys', {
          body: { action: 'save', provider, key },
        });
      }
    } catch (err) {
      console.error('Error saving API keys:', err);
    } finally {
      setSavingKeys(false);
    }
  };

  const handleNext = async () => {
    if (step === 2) {
      // Save API keys before moving on
      if (anthropicKey.trim() || browserUseKey.trim()) {
        await saveApiKeys();
      }
    }
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    }
  };

  const handleFinish = () => markComplete();
  const handleBack = () => step > 0 && setStep(step - 1);
  const handleDismiss = () => markComplete();

  const displayName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'there';

  return createPortal(
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
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-3 right-3 z-10 h-8 w-8 text-muted-foreground hover:text-foreground"
          onClick={handleDismiss}
        >
          <X className="h-4 w-4" />
        </Button>

        <div className="min-h-[400px] flex flex-col">
          <AnimatePresence mode="wait">
            {step === 0 && <StepWelcome key="s0" name={displayName} onNext={handleNext} />}
            {step === 1 && <StepUseCase key="s1" selected={useCase} onSelect={setUseCase} />}
            {step === 2 && (
              <StepApiKeys
                key="s2"
                anthropicKey={anthropicKey}
                browserUseKey={browserUseKey}
                showAnthropicKey={showAnthropicKey}
                showBrowserUseKey={showBrowserUseKey}
                onAnthropicKeyChange={setAnthropicKey}
                onBrowserUseKeyChange={setBrowserUseKey}
                onToggleAnthropicKey={() => setShowAnthropicKey(!showAnthropicKey)}
                onToggleBrowserUseKey={() => setShowBrowserUseKey(!showBrowserUseKey)}
              />
            )}
            {step === 3 && <StepDone key="s3" />}
          </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between">
          <div className="flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <div
                key={i}
                className={`h-2 rounded-full transition-all duration-300 ${
                  i === step ? 'w-6 bg-primary' : 'w-2 bg-muted-foreground/30'
                }`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {step > 0 && step < TOTAL_STEPS - 1 && (
              <Button variant="ghost" size="sm" onClick={handleBack} className="gap-1 text-xs">
                <ArrowLeft className="h-3 w-3" /> Back
              </Button>
            )}
            {step === 0 ? null : step === TOTAL_STEPS - 1 ? (
              <Button size="sm" onClick={handleFinish} className="gap-1 text-xs">
                Go to Dashboard <ArrowRight className="h-3 w-3" />
              </Button>
            ) : (
              <Button
                size="sm"
                onClick={handleNext}
                disabled={(step === 1 && !useCase) || savingKeys}
                className="gap-1 text-xs"
              >
                {savingKeys ? 'Saving...' : step === 2 ? (anthropicKey.trim() || browserUseKey.trim() ? 'Save & Continue' : 'Skip') : 'Next'}
                <ArrowRight className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>,
    document.body
  );
}

/* ---- Step Components ---- */

const stepVariants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -40 },
};

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
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
        Welcome, {name}!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="text-sm text-muted-foreground max-w-xs leading-relaxed mb-6"
      >
        Let's set up your workspace so GarlicBread can work best for you.
      </motion.p>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}>
        <Button onClick={onNext} className="gap-2">
          Let's get started <ArrowRight className="h-4 w-4" />
        </Button>
      </motion.div>
    </motion.div>
  );
}

const useCases = [
  { id: 'marketing', label: 'Marketing', desc: 'Build pages, run campaigns, capture leads', icon: Megaphone, color: 'text-rose-400' },
  { id: 'development', label: 'Development', desc: 'Prototype, automate workflows, build tools', icon: Code2, color: 'text-blue-400' },
  { id: 'research', label: 'Research', desc: 'Scrape data, analyze competitors, gather intel', icon: FlaskConical, color: 'text-emerald-400' },
  { id: 'other', label: 'Other', desc: 'Something else entirely', icon: LayoutGrid, color: 'text-amber-400' },
];

function StepUseCase({ selected, onSelect }: { selected: string | null; onSelect: (v: string) => void }) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <h3 className="text-lg font-semibold text-foreground mb-1">What will you use this for?</h3>
      <p className="text-sm text-muted-foreground mb-6">Pick the one that fits best</p>

      <div className="w-full max-w-xs space-y-2.5">
        {useCases.map((uc, i) => (
          <motion.button
            key={uc.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + i * 0.08 }}
            onClick={() => onSelect(uc.id)}
            className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-colors text-left ${
              selected === uc.id
                ? 'border-primary bg-primary/10'
                : 'border-border/50 bg-muted/20 hover:bg-muted/40'
            }`}
          >
            <div className="h-9 w-9 rounded-lg bg-card border border-border/40 flex items-center justify-center shrink-0">
              <uc.icon className={`h-4 w-4 ${uc.color}`} />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">{uc.label}</p>
              <p className="text-[11px] text-muted-foreground">{uc.desc}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </motion.div>
  );
}

interface StepApiKeysProps {
  anthropicKey: string;
  browserUseKey: string;
  showAnthropicKey: boolean;
  showBrowserUseKey: boolean;
  onAnthropicKeyChange: (v: string) => void;
  onBrowserUseKeyChange: (v: string) => void;
  onToggleAnthropicKey: () => void;
  onToggleBrowserUseKey: () => void;
}

function StepApiKeys({
  anthropicKey, browserUseKey,
  showAnthropicKey, showBrowserUseKey,
  onAnthropicKeyChange, onBrowserUseKeyChange,
  onToggleAnthropicKey, onToggleBrowserUseKey,
}: StepApiKeysProps) {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
      <div className="h-14 w-14 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-4">
        <KeyRound className="h-7 w-7 text-primary" />
      </div>
      <h3 className="text-lg font-semibold text-foreground mb-1">API Keys (Optional)</h3>
      <p className="text-sm text-muted-foreground mb-6 max-w-xs">Add your own keys for enhanced capabilities. You can always do this later in Settings.</p>

      <div className="w-full max-w-sm space-y-4 text-left">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Anthropic API Key</label>
          <div className="relative">
            <Input
              type={showAnthropicKey ? 'text' : 'password'}
              placeholder="sk-ant-..."
              value={anthropicKey}
              onChange={(e) => onAnthropicKeyChange(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={onToggleAnthropicKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showAnthropicKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1.5 block">Browser Use API Key</label>
          <div className="relative">
            <Input
              type={showBrowserUseKey ? 'text' : 'password'}
              placeholder="bu-..."
              value={browserUseKey}
              onChange={(e) => onBrowserUseKeyChange(e.target.value)}
              className="pr-10"
            />
            <button
              type="button"
              onClick={onToggleBrowserUseKey}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showBrowserUseKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function StepDone() {
  return (
    <motion.div variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.3 }} className="flex-1 flex flex-col items-center justify-center p-8 text-center">
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
        You're All Set!
      </motion.h2>
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-muted-foreground max-w-xs"
      >
        Your workspace is ready. Start by describing what you want to build.
      </motion.p>
    </motion.div>
  );
}
