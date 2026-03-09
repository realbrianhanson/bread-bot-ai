import { useState, useEffect } from "react";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Zap, MessageSquare, Globe, Keyboard } from "lucide-react";
import { cn } from "@/lib/utils";

const ONBOARDING_KEY = "garlicbread-onboarding-done";

const steps = [
  {
    icon: MessageSquare,
    title: "Chat with GarlicBread",
    description: "Describe any task in plain English — from building apps to scraping data. GarlicBread will figure out the best approach.",
  },
  {
    icon: Globe,
    title: "Browse the Web",
    description: "Type /browse before your message to launch a live browser automation. Watch it navigate, click, and extract data in real time.",
  },
  {
    icon: Keyboard,
    title: "Command Palette",
    description: "Press ⌘K (or Ctrl+K) anytime to quickly navigate, switch themes, or start common tasks.",
  },
  {
    icon: Zap,
    title: "Templates & Voice",
    description: "Use pre-built task templates for common automations, or click the mic to dictate your task hands-free.",
  },
];

export function OnboardingTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    const done = localStorage.getItem(ONBOARDING_KEY);
    if (!done) setOpen(true);
  }, []);

  const finish = () => {
    localStorage.setItem(ONBOARDING_KEY, "true");
    setOpen(false);
  };

  const current = steps[step];
  const Icon = current.icon;

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-xl bg-primary/10">
              <Icon className="h-6 w-6 text-primary" />
            </div>
            <AlertDialogTitle className="text-lg">{current.title}</AlertDialogTitle>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">{current.description}</p>
        </AlertDialogHeader>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-1.5 py-2">
          {steps.map((_, i) => (
            <div
              key={i}
              className={cn(
                "h-1.5 rounded-full transition-all duration-300",
                i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30"
              )}
            />
          ))}
        </div>

        <AlertDialogFooter className="flex-row gap-2">
          <Button variant="ghost" onClick={finish} className="text-muted-foreground">
            Skip
          </Button>
          <div className="flex-1" />
          {step > 0 && (
            <Button variant="outline" onClick={() => setStep(step - 1)}>
              Back
            </Button>
          )}
          {step < steps.length - 1 ? (
            <Button onClick={() => setStep(step + 1)}>Next</Button>
          ) : (
            <Button onClick={finish}>Get Started 🧄</Button>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
