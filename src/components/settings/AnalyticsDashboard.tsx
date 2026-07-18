import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, MessageSquare, Bot, Terminal, Hammer, Eye, RefreshCw, Calendar, Loader2 } from 'lucide-react';
import { format, subDays, startOfDay } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

type RangeKey = '7d' | '30d' | '90d';
const RANGE_DAYS: Record<RangeKey, number> = { '7d': 7, '30d': 30, '90d': 90 };

interface UsageRow { usage_type: string; created_at: string }
interface PageRow { slug: string | null; title: string | null; views: number | null; is_published: boolean | null }

interface Analytics {
  totals: { chat: number; browser: number; code: number; build: number };
  daily: { date: string; label: string; total: number }[];
  topPages: { slug: string; title: string; views: number }[];
  totalPageViews: number;
  hasUsage: boolean;
  hasPages: boolean;
}

const EMPTY_ANALYTICS: Analytics = {
  totals: { chat: 0, browser: 0, code: 0, build: 0 },
  daily: [],
  topPages: [],
  totalPageViews: 0,
  hasUsage: false,
  hasPages: false,
};

export function AnalyticsDashboard() {
  const { user } = useAuth();
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState<RangeKey>('7d');
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    const days = RANGE_DAYS[dateRange];
    const since = startOfDay(subDays(new Date(), days - 1)).toISOString();

    const [usageRes, pagesRes] = await Promise.all([
      supabase
        .from('usage_tracking')
        .select('usage_type, created_at')
        .eq('user_id', user.id)
        .gte('created_at', since)
        .order('created_at', { ascending: true }),
      supabase
        .from('shared_previews')
        .select('slug, title, views, is_published')
        .eq('user_id', user.id)
        .eq('is_published', true),
    ]);

    if (usageRes.error || pagesRes.error) {
      setError('Could not load analytics right now. Please try again.');
      setAnalytics(EMPTY_ANALYTICS);
      setIsLoading(false);
      return;
    }

    const usage = (usageRes.data ?? []) as UsageRow[];
    const pages = (pagesRes.data ?? []) as PageRow[];

    const totals = { chat: 0, browser: 0, code: 0, build: 0 };
    for (const row of usage) {
      if (row.usage_type === 'chat_message') totals.chat += 1;
      else if (row.usage_type === 'browser_task') totals.browser += 1;
      else if (row.usage_type === 'code_execution') totals.code += 1;
      else if (row.usage_type === 'app_build') totals.build += 1;
    }

    const byDay = new Map<string, number>();
    for (let i = days - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      byDay.set(format(d, 'yyyy-MM-dd'), 0);
    }
    for (const row of usage) {
      const key = format(new Date(row.created_at), 'yyyy-MM-dd');
      if (byDay.has(key)) byDay.set(key, (byDay.get(key) ?? 0) + 1);
    }
    const daily = Array.from(byDay.entries()).map(([date, total]) => ({
      date,
      label: format(new Date(date), days > 14 ? 'MMM d' : 'MMM dd'),
      total,
    }));

    const topPages = pages
      .map((p) => ({
        slug: p.slug ?? '',
        title: p.title || p.slug || 'Untitled',
        views: p.views ?? 0,
      }))
      .filter((p) => p.slug)
      .sort((a, b) => b.views - a.views)
      .slice(0, 5);
    const totalPageViews = pages.reduce((sum, p) => sum + (p.views ?? 0), 0);

    setAnalytics({
      totals,
      daily,
      topPages,
      totalPageViews,
      hasUsage: usage.length > 0,
      hasPages: pages.length > 0,
    });
    setIsLoading(false);
  }, [user, dateRange]);

  useEffect(() => { load(); }, [load]);

  const maxDaily = Math.max(1, ...analytics.daily.map((d) => d.total));
  const rangeLabel = dateRange === '7d' ? 'Last 7 days' : dateRange === '30d' ? 'Last 30 days' : 'Last 90 days';

  const metrics = [
    { label: 'Chat messages', value: analytics.totals.chat, icon: MessageSquare },
    { label: 'Browser tasks', value: analytics.totals.browser, icon: Bot },
    { label: 'Code executions', value: analytics.totals.code, icon: Terminal },
    { label: 'App builds', value: analytics.totals.build, icon: Hammer },
  ];

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Your activity
            </CardTitle>
            <CardDescription>
              Real usage from your account — chat, browser tasks, code runs, builds, and page views.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <div className="inline-flex rounded-lg border border-border overflow-hidden text-xs">
              {(['7d', '30d', '90d'] as RangeKey[]).map((k) => (
                <button
                  key={k}
                  onClick={() => setDateRange(k)}
                  className={`px-2.5 py-1 ${dateRange === k ? 'bg-primary/15 text-primary font-medium' : 'text-muted-foreground hover:bg-muted/40'}`}
                >
                  {k}
                </button>
              ))}
            </div>
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {rangeLabel}
            </Badge>
            <Button variant="outline" size="sm" onClick={load} disabled={isLoading} aria-label="Refresh analytics">
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <div className="p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {metrics.map(({ label, value, icon: Icon }) => (
            <div key={label} className="p-4 rounded-lg bg-secondary/50 border border-border">
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                <Icon className="h-4 w-4" />
                {label}
              </div>
              <p className="text-2xl font-bold">{value.toLocaleString()}</p>
              <p className="text-xs text-muted-foreground mt-1">{rangeLabel.toLowerCase()}</p>
            </div>
          ))}
        </div>

        {/* Daily chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Daily activity</h4>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : !analytics.hasUsage ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No activity in this window yet. Send a chat, run a browser task, or ship a build — it will show up here.
            </div>
          ) : (
            <div className="flex items-end gap-1" style={{ height: '8rem' }}>
              {analytics.daily.map((day) => {
                const barHeight = day.total > 0 ? Math.max((day.total / maxDaily) * 100, 6) : 2;
                return (
                  <div key={day.date} className="flex-1 flex flex-col items-center h-full">
                    <div className="flex-1 w-full flex items-end">
                      <div
                        className="w-full bg-primary/60 rounded-t transition-all hover:bg-primary"
                        style={{ height: `${barHeight}%` }}
                        title={`${day.total} action${day.total === 1 ? '' : 's'} on ${day.label}`}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground mt-1 shrink-0">{day.label}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Top pages */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Eye className="h-4 w-4 text-muted-foreground" />
              Top published pages
            </h4>
            {analytics.hasPages && (
              <span className="text-xs text-muted-foreground">
                {analytics.totalPageViews.toLocaleString()} total views
              </span>
            )}
          </div>
          {!analytics.hasPages ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              You haven't published any pages yet. Once you do, their view counts appear here.
            </div>
          ) : analytics.topPages.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              No view data yet for your published pages.
            </div>
          ) : (
            <div className="space-y-2">
              {analytics.topPages.map((page) => (
                <div key={page.slug} className="flex items-center justify-between gap-2 p-2 rounded bg-secondary/30">
                  <div className="min-w-0">
                    <p className="text-sm truncate">{page.title}</p>
                    <code className="text-[11px] text-muted-foreground">/p/{page.slug}</code>
                  </div>
                  <Badge variant="secondary">{page.views.toLocaleString()} views</Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
