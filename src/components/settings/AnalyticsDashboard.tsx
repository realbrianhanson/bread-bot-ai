import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { BarChart3, TrendingUp, Users, Activity, RefreshCw, Calendar } from 'lucide-react';
import { format, subDays } from 'date-fns';

interface AnalyticsData {
  pageViews: number;
  uniqueVisitors: number;
  avgSessionDuration: string;
  bounceRate: string;
  topPages: { path: string; views: number }[];
  dailyData: { date: string; views: number; visitors: number }[];
}

// Mock data for demonstration
const mockAnalytics: AnalyticsData = {
  pageViews: 12453,
  uniqueVisitors: 3287,
  avgSessionDuration: '4m 32s',
  bounceRate: '42.3%',
  topPages: [
    { path: '/', views: 4521 },
    { path: '/dashboard', views: 3892 },
    { path: '/pricing', views: 2104 },
    { path: '/settings', views: 1936 },
  ],
  dailyData: Array.from({ length: 7 }, (_, i) => ({
    date: format(subDays(new Date(), 6 - i), 'MMM dd'),
    views: Math.floor(Math.random() * 2000) + 500,
    visitors: Math.floor(Math.random() * 500) + 100,
  })),
};

export function AnalyticsDashboard() {
  const [isLoading, setIsLoading] = useState(false);
  const [dateRange] = useState('7d');
  const [analytics] = useState<AnalyticsData>(mockAnalytics);

  const handleRefresh = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => setIsLoading(false), 1000);
  };

  const maxViews = Math.max(...analytics.dailyData.map(d => d.views));

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Analytics Dashboard
            </CardTitle>
            <CardDescription>
              Track your app's performance and usage
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              Last {dateRange}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isLoading}
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Key Metrics */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-primary/10 border border-primary/20">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Activity className="h-4 w-4" />
              Page Views
            </div>
            <p className="text-2xl font-bold">{analytics.pageViews.toLocaleString()}</p>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +12.5% from last period
            </p>
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
              <Users className="h-4 w-4" />
              Unique Visitors
            </div>
            <p className="text-2xl font-bold">{analytics.uniqueVisitors.toLocaleString()}</p>
            <p className="text-xs text-green-500 flex items-center gap-1 mt-1">
              <TrendingUp className="h-3 w-3" />
              +8.2% from last period
            </p>
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Avg. Session</div>
            <p className="text-2xl font-bold">{analytics.avgSessionDuration}</p>
          </div>

          <div className="p-4 rounded-lg bg-secondary/50 border border-border">
            <div className="text-sm text-muted-foreground mb-1">Bounce Rate</div>
            <p className="text-2xl font-bold">{analytics.bounceRate}</p>
          </div>
        </div>

        {/* Chart */}
        <div>
          <h4 className="text-sm font-medium mb-3">Daily Traffic</h4>
          <div className="flex items-end gap-1" style={{ height: '8rem' }}>
            {analytics.dailyData.map((day, index) => {
              const barHeight = Math.max((day.views / maxViews) * 100, 4);
              return (
                <div key={index} className="flex-1 flex flex-col items-center h-full">
                  <div className="flex-1 w-full flex items-end">
                    <div
                      className="w-full bg-primary/60 rounded-t transition-all hover:bg-primary min-h-[4px]"
                      style={{ height: `${barHeight}%` }}
                      title={`${day.views} views`}
                    />
                  </div>
                  <span className="text-xs text-muted-foreground mt-1 shrink-0">{day.date}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top Pages */}
        <div>
          <h4 className="text-sm font-medium mb-3">Top Pages</h4>
          <div className="space-y-2">
            {analytics.topPages.map((page, index) => (
              <div key={index} className="flex items-center justify-between p-2 rounded bg-secondary/30">
                <code className="text-sm">{page.path}</code>
                <Badge variant="secondary">{page.views.toLocaleString()} views</Badge>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
