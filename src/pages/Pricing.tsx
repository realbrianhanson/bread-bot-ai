import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, X, ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useSubscription } from '@/hooks/useSubscription';
import { toast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

type PlanId = 'free' | 'pro' | 'enterprise';

const PLANS: Array<{
  id: PlanId;
  name: string;
  price: number;
  description: string;
  features: string[];
  popular?: boolean;
}> = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    description: 'Get started for free',
    features: [
      '100 chat messages/month',
      '10 browser tasks/month',
      '5 code executions/month',
      '3 app builds/month',
      'Basic support',
    ],
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 20,
    popular: true,
    description: 'For power users',
    features: [
      '8,000 chat messages/month',
      '200 browser tasks/month',
      '50 code executions/month',
      '50 app builds/month',
      'Priority support',
      'Advanced analytics',
    ],
  },
  {
    id: 'enterprise',
    name: 'Business',
    price: 99,
    description: 'For teams & agencies',
    features: [
      '25,000 chat messages/month',
      '1,000 browser tasks/month',
      '200 code executions/month',
      '200 app builds/month',
      'Use your own API keys',
      'Premium support',
      'Custom workflows',
    ],
  },
];

function isRealPriceId(id: string | null | undefined): id is string {
  return !!id && !id.includes('placeholder');
}

export default function Pricing() {
  const navigate = useNavigate();
  const { tier, subscribed } = useSubscription();
  const [loading, setLoading] = useState<string | null>(null);
  const [priceIds, setPriceIds] = useState<Record<string, string | null>>({});
  const [priceIdsAnnual, setPriceIdsAnnual] = useState<Record<string, string | null>>({});
  const [annual, setAnnual] = useState(false);

  useEffect(() => {
    supabase
      .from('tier_limits')
      .select('tier, stripe_price_id, stripe_price_id_annual')
      .then(({ data }) => {
        if (!data) return;
        const monthly: Record<string, string | null> = {};
        const yearly: Record<string, string | null> = {};
        for (const row of data as any[]) {
          monthly[row.tier] = row.stripe_price_id;
          yearly[row.tier] = row.stripe_price_id_annual ?? null;
        }
        setPriceIds(monthly);
        setPriceIdsAnnual(yearly);
      });
  }, []);

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

  const comparisonRows: Array<{ label: string; free: React.ReactNode; pro: React.ReactNode; business: React.ReactNode }> = [
    { label: 'Chat messages / month', free: '100', pro: '8,000', business: '25,000' },
    { label: 'Browser tasks / month', free: '10', pro: '200', business: '1,000' },
    { label: 'Code executions / month', free: '5', pro: '50', business: '200' },
    { label: 'App builds / month', free: '3', pro: '50', business: '200' },
    { label: 'Scheduled tasks', free: <X className="h-4 w-4 text-muted-foreground" />, pro: <Check className="h-4 w-4 text-primary" />, business: <Check className="h-4 w-4 text-primary" /> },
    { label: 'Custom workflows', free: <X className="h-4 w-4 text-muted-foreground" />, pro: <Check className="h-4 w-4 text-primary" />, business: <Check className="h-4 w-4 text-primary" /> },
    { label: 'Webhooks', free: <X className="h-4 w-4 text-muted-foreground" />, pro: <Check className="h-4 w-4 text-primary" />, business: <Check className="h-4 w-4 text-primary" /> },
    { label: 'Bring your own API keys', free: <X className="h-4 w-4 text-muted-foreground" />, pro: <X className="h-4 w-4 text-muted-foreground" />, business: <Check className="h-4 w-4 text-primary" /> },
    { label: 'Priority support', free: <X className="h-4 w-4 text-muted-foreground" />, pro: <Check className="h-4 w-4 text-primary" />, business: <Check className="h-4 w-4 text-primary" /> },
  ];

  const faqs = [
    { q: 'What counts as a browser task?', a: 'Each Browser Use automation run (opening a session, executing steps, and returning a result) counts as one browser task, regardless of how many pages it visits during that run.' },
    { q: 'Can I cancel anytime?', a: 'Yes. Manage or cancel your subscription from Settings → Manage billing at any time. You keep access through the end of your current billing period.' },
    { q: 'What happens when I hit my monthly limit?', a: 'New requests to that feature are blocked for the rest of your billing period with a 402 response. Other features keep working. Upgrading takes effect immediately.' },
    { q: 'Do unused credits roll over?', a: 'No. Limits reset at the start of each billing period. Annual plans still bill limits monthly.' },
    { q: 'Can I use my own API keys?', a: 'Business plan users can add their own Anthropic, OpenAI, Browser Use, E2B, and Firecrawl keys under Settings. Requests using your keys do not count against your monthly limits.' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background/95 to-primary/5">
      <Helmet>
        <title>Pricing — GarlicBread.ai</title>
        <meta name="description" content="Simple plans for AI browser automation and code generation. Free tier, Pro at $20/mo, Business at $99/mo. Save two months with annual billing." />
        <link rel="canonical" href="https://garlicbread.ai/pricing" />
        <meta property="og:title" content="Pricing — GarlicBread.ai" />
        <meta property="og:description" content="Simple plans for AI browser automation and code generation." />
        <meta property="og:url" content="https://garlicbread.ai/pricing" />
        <meta property="og:image" content="https://garlicbread.ai/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Pricing — GarlicBread.ai" />
        <meta name="twitter:description" content="Simple plans for AI browser automation and code generation." />
        <meta name="twitter:image" content="https://garlicbread.ai/og-image.png" />
      </Helmet>
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">Choose Your Plan</h1>
          <p className="text-muted-foreground text-lg">Scale your automation with the right plan</p>
          <div className="mt-8 inline-flex items-center gap-3 rounded-full border border-border bg-card px-4 py-2">
            <span className={`text-sm ${!annual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Monthly</span>
            <Switch checked={annual} onCheckedChange={setAnnual} aria-label="Toggle annual billing" />
            <span className={`text-sm ${annual ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>Annual</span>
            <Badge variant="secondary" className="ml-1">2 months free</Badge>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
          {PLANS.map((plan) => {
            const priceId = annual ? priceIdsAnnual[plan.id] : priceIds[plan.id];
            const hasRealPrice = isRealPriceId(priceId);
            const displayPrice = annual ? plan.price * 10 : plan.price;
            const priceSuffix = plan.price === 0 ? '' : annual ? '/year' : '/month';
            return (
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
                  <span className="text-4xl font-bold">${displayPrice}</span>
                  {priceSuffix && <span className="text-muted-foreground">{priceSuffix}</span>}
                  {annual && plan.price > 0 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Equivalent to ${(displayPrice / 12).toFixed(2)}/month
                    </div>
                  )}
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
                {plan.id === 'free' ? (
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => navigate('/auth')}
                    disabled={isCurrentPlan(plan.id)}
                  >
                    {isCurrentPlan(plan.id) ? 'Current Plan' : 'Get Started'}
                  </Button>
                ) : hasRealPrice ? (
                  <Button
                    className="w-full"
                    variant={plan.popular ? 'default' : 'outline'}
                    onClick={() => handleCheckout(priceId!, plan.id)}
                    disabled={loading === plan.id || isCurrentPlan(plan.id)}
                  >
                    {isCurrentPlan(plan.id) ? 'Current Plan' : loading === plan.id ? 'Loading...' : `Upgrade to ${plan.name}`}
                  </Button>
                ) : (
                  <Button variant="outline" className="w-full" disabled>
                    Coming soon
                  </Button>
                )}
              </CardFooter>
            </Card>
          );
          })}
        </div>

        {/* Comparison table */}
        <section aria-labelledby="compare-heading" className="max-w-5xl mx-auto mt-20">
          <h2 id="compare-heading" className="text-2xl font-bold mb-6 text-center">Compare features</h2>
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Feature</th>
                  <th className="text-center px-4 py-3 font-medium">Free</th>
                  <th className="text-center px-4 py-3 font-medium">Pro</th>
                  <th className="text-center px-4 py-3 font-medium">Business</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-t border-border">
                    <td className="px-4 py-3">{row.label}</td>
                    <td className="px-4 py-3 text-center">{row.free}</td>
                    <td className="px-4 py-3 text-center">{row.pro}</td>
                    <td className="px-4 py-3 text-center">{row.business}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* FAQ */}
        <section aria-labelledby="faq-heading" className="max-w-3xl mx-auto mt-20">
          <h2 id="faq-heading" className="text-2xl font-bold mb-6 text-center">Frequently asked questions</h2>
          <Accordion type="single" collapsible className="w-full">
            {faqs.map((f, i) => (
              <AccordionItem key={i} value={`faq-${i}`}>
                <AccordionTrigger className="text-left">{f.q}</AccordionTrigger>
                <AccordionContent className="text-muted-foreground">{f.a}</AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </section>

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
