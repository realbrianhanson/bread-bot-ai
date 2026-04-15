import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started for free',
    features: [
      '100 chat messages/month',
      '10 browser tasks/month',
      '5 code executions/month',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    priceId: 'price_pro_placeholder',
    popular: true,
    description: 'For power users',
    features: [
      '8,000 chat messages/month',
      '200 browser tasks/month',
      '50 code executions/month',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Business',
    price: 99,
    priceId: 'price_business_placeholder',
    description: 'For teams & agencies',
    features: [
      '25,000 chat messages/month',
      '1,000 browser tasks/month',
      '200 code executions/month',
      'Use your own API keys',
      'Premium support',
      'Custom workflows',
    ],
  },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { tier, subscribed } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, planId: string) => {
    setLoading(planId);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId },
      });
      if (error) throw error;
      if (data?.url) window.open(data.url, '_blank');
    } catch {
      toast({ title: 'Checkout Failed', description: 'Unable to start checkout. Please try again.', variant: 'destructive' });
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (planId: string) => tier.toLowerCase() === planId.toLowerCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Scale your automation with the right plan</p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => (
            <Card
              key={plan.id}
              className={`relative flex flex-col ${isCurrentPlan(plan.id) ? 'border-primary border-2' : ''} ${plan.popular ? 'shadow-lg shadow-primary/10' : ''}`}
            >
              {isCurrentPlan(plan.id) && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
              )}
              {plan.popular && !isCurrentPlan(plan.id) && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">Most Popular</Badge>
              )}
              <CardHeader>
                <CardTitle>{plan.name}</CardTitle>
                <CardDescription>{plan.description}</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">${plan.price}</span>
                  {plan.price > 0 && <span className="text-muted-foreground">/month</span>}
                </div>
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.priceId ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleCheckout(plan.priceId!, plan.id)}
                    disabled={loading === plan.id || isCurrentPlan(plan.id)}
                  >
                    {isCurrentPlan(plan.id) ? 'Current Plan' : loading === plan.id ? 'Loading...' : `Upgrade to ${plan.name}`}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled={isCurrentPlan(plan.id)}>
                    {isCurrentPlan(plan.id) ? 'Current Plan' : 'Get Started'}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
