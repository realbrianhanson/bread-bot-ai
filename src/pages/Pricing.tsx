import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';

const TIER_PRICES = {
  starter: { price_id: 'price_1QeSHGJx5g8RczjUtN1X8YFa', name: 'Starter', price: 47, features: ['3,000 chat messages/month', '75 browser tasks/month', 'Priority support'] },
  pro: { price_id: 'price_1QeSI2Jx5g8RczjU2K2MqUKF', name: 'Pro', price: 97, features: ['8,000 chat messages/month', '200 browser tasks/month', 'Premium support', 'Advanced analytics'] },
  lifetime: { price_id: 'price_1QeSIcJx5g8RczjUKSj4cMPJ', name: 'Lifetime Deal', price: 1997, oneTime: true, features: ['Unlimited messages', 'Unlimited browser tasks', 'Use your own API keys', 'Lifetime updates', 'VIP support'] },
};

export default function Pricing() {
  const navigate = useNavigate();
  const { tier, subscribed } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);

  const handleCheckout = async (priceId: string, tierName: string) => {
    setLoading(tierName);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { priceId }
      });

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, '_blank');
      }
    } catch (error) {
      console.error('Checkout error:', error);
      toast({
        title: "Checkout Failed",
        description: "Unable to start checkout. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(null);
    }
  };

  const isCurrentPlan = (tierName: string) => {
    return tier.toLowerCase() === tierName.toLowerCase();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Select the perfect plan for your automation needs</p>
        </div>

        <div className="grid md:grid-cols-4 gap-6 max-w-7xl mx-auto">
          {/* Free Tier */}
          <Card className={`relative ${isCurrentPlan('free') ? 'border-primary border-2' : ''}`}>
            {isCurrentPlan('free') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
            )}
            <CardHeader>
              <CardTitle>Free</CardTitle>
              <CardDescription>Get started for free</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">$0</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">100 chat messages/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">10 browser tasks/month</span>
                </li>
                <li className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-primary" />
                  <span className="text-sm">Basic support</span>
                </li>
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                variant="outline" 
                className="w-full"
                disabled={isCurrentPlan('free')}
              >
                {isCurrentPlan('free') ? 'Current Plan' : 'Get Started'}
              </Button>
            </CardFooter>
          </Card>

          {/* Starter Tier */}
          <Card className={`relative ${isCurrentPlan('starter') ? 'border-primary border-2' : ''}`}>
            {isCurrentPlan('starter') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
            )}
            <CardHeader>
              <CardTitle>{TIER_PRICES.starter.name}</CardTitle>
              <CardDescription>Perfect for individuals</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">${TIER_PRICES.starter.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {TIER_PRICES.starter.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => handleCheckout(TIER_PRICES.starter.price_id, 'starter')}
                disabled={loading === 'starter' || isCurrentPlan('starter')}
              >
                {isCurrentPlan('starter') ? 'Current Plan' : loading === 'starter' ? 'Loading...' : 'Upgrade to Starter'}
              </Button>
            </CardFooter>
          </Card>

          {/* Pro Tier */}
          <Card className={`relative ${isCurrentPlan('pro') ? 'border-primary border-2' : ''}`}>
            {isCurrentPlan('pro') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
            )}
            {!isCurrentPlan('pro') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">Most Popular</Badge>
            )}
            <CardHeader>
              <CardTitle>{TIER_PRICES.pro.name}</CardTitle>
              <CardDescription>For growing teams</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">${TIER_PRICES.pro.price}</span>
                <span className="text-muted-foreground">/month</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {TIER_PRICES.pro.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                onClick={() => handleCheckout(TIER_PRICES.pro.price_id, 'pro')}
                disabled={loading === 'pro' || isCurrentPlan('pro')}
              >
                {isCurrentPlan('pro') ? 'Current Plan' : loading === 'pro' ? 'Loading...' : 'Upgrade to Pro'}
              </Button>
            </CardFooter>
          </Card>

          {/* Lifetime Tier */}
          <Card className={`relative ${isCurrentPlan('lifetime') ? 'border-primary border-2' : ''}`}>
            {isCurrentPlan('lifetime') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">Your Plan</Badge>
            )}
            {!isCurrentPlan('lifetime') && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2" variant="secondary">Best Value</Badge>
            )}
            <CardHeader>
              <CardTitle>{TIER_PRICES.lifetime.name}</CardTitle>
              <CardDescription>One-time payment</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold">${TIER_PRICES.lifetime.price}</span>
                <span className="text-muted-foreground text-sm block mt-1">forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {TIER_PRICES.lifetime.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-primary" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button 
                className="w-full"
                variant="default"
                onClick={() => handleCheckout(TIER_PRICES.lifetime.price_id, 'lifetime')}
                disabled={loading === 'lifetime' || isCurrentPlan('lifetime')}
              >
                {isCurrentPlan('lifetime') ? 'Current Plan' : loading === 'lifetime' ? 'Loading...' : 'Get Lifetime Access'}
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="text-center mt-8">
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            Back to Dashboard
          </Button>
        </div>
      </div>
    </div>
  );
}
