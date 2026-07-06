import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, ArrowLeft, Users, Mail, Activity } from 'lucide-react';

type Lead = { id: string; email: string; name: string | null; source: string | null; created_at: string };
type UserRow = { id: string; email: string; full_name: string | null; tier: string; created_at: string; chat_used: number; browser_used: number };
type Overview = { users: number; tasks: number; messages: number; active_subs: number };

export default function Admin() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [users, setUsers] = useState<UserRow[]>([]);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate('/auth'); return; }
    (async () => {
      const { data, error } = await supabase.rpc('has_role', { _user_id: user.id, _role: 'admin' as any });
      if (error || !data) { setIsAdmin(false); setLoading(false); return; }
      setIsAdmin(true);
      await loadAll();
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading]);

  const loadAll = async () => {
    const monthStart = new Date();
    monthStart.setDate(1); monthStart.setHours(0, 0, 0, 0);
    const iso = monthStart.toISOString();

    const sb = supabase as any;
    const [leadsRes, profilesRes, subsRes, usageRes, tasksCount, msgsCount, activeSubsCount, usersCount] = await Promise.all([
      sb.from('leads').select('*').order('created_at', { ascending: false }).limit(200),
      sb.from('profiles').select('id, email, full_name, created_at').order('created_at', { ascending: false }).limit(200),
      sb.from('subscriptions').select('user_id, tier, subscribed'),
      sb.from('usage_tracking').select('user_id, usage_type').gte('created_at', iso),
      sb.from('tasks').select('*', { count: 'exact', head: true }),
      sb.from('messages').select('*', { count: 'exact', head: true }),
      sb.from('subscriptions').select('*', { count: 'exact', head: true }).eq('subscribed', true),
      sb.from('profiles').select('*', { count: 'exact', head: true }),
    ]);

    setLeads((leadsRes.data as any[]) ?? []);

    const tierMap = new Map<string, string>();
    for (const s of (subsRes.data as any[]) ?? []) tierMap.set(s.user_id, s.tier);

    const usageMap = new Map<string, { chat: number; browser: number }>();
    for (const u of (usageRes.data as any[]) ?? []) {
      const cur = usageMap.get(u.user_id) ?? { chat: 0, browser: 0 };
      if (u.usage_type === 'chat_message') cur.chat += 1;
      if (u.usage_type === 'browser_task') cur.browser += 1;
      usageMap.set(u.user_id, cur);
    }

    const rows: UserRow[] = ((profilesRes.data as any[]) ?? []).map((p) => ({
      id: p.id,
      email: p.email,
      full_name: p.full_name,
      created_at: p.created_at,
      tier: tierMap.get(p.id) ?? 'free',
      chat_used: usageMap.get(p.id)?.chat ?? 0,
      browser_used: usageMap.get(p.id)?.browser ?? 0,
    }));
    setUsers(rows);

    setOverview({
      users: usersCount.count ?? 0,
      tasks: tasksCount.count ?? 0,
      messages: msgsCount.count ?? 0,
      active_subs: activeSubsCount.count ?? 0,
    });
  };

  if (loading || authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4">
        <p className="text-muted-foreground">You don't have access to this page.</p>
        <Button variant="outline" onClick={() => navigate('/dashboard')}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" aria-label="Back to dashboard" onClick={() => navigate('/dashboard')}><ArrowLeft className="h-4 w-4" /></Button>
          <h1 className="text-xl font-semibold">Admin</h1>
          <Badge variant="secondary">Read-only</Badge>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        <Tabs defaultValue="overview">
          <TabsList>
            <TabsTrigger value="overview"><Activity className="h-4 w-4 mr-2" />Overview</TabsTrigger>
            <TabsTrigger value="users"><Users className="h-4 w-4 mr-2" />Users</TabsTrigger>
            <TabsTrigger value="leads"><Mail className="h-4 w-4 mr-2" />Leads</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {overview && [
                { label: 'Users', value: overview.users },
                { label: 'Active subscriptions', value: overview.active_subs },
                { label: 'Tasks run', value: overview.tasks },
                { label: 'Messages', value: overview.messages },
              ].map((s) => (
                <Card key={s.label}>
                  <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-normal">{s.label}</CardTitle></CardHeader>
                  <CardContent><div className="text-3xl font-bold">{s.value.toLocaleString()}</div></CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="users" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Tier</TableHead>
                      <TableHead className="text-right">Chat (mo)</TableHead>
                      <TableHead className="text-right">Browser (mo)</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {users.map((u) => (
                      <TableRow key={u.id}>
                        <TableCell className="font-mono text-xs">{u.email}</TableCell>
                        <TableCell>{u.full_name || '—'}</TableCell>
                        <TableCell><Badge variant={u.tier === 'free' ? 'secondary' : 'default'}>{u.tier}</Badge></TableCell>
                        <TableCell className="text-right">{u.chat_used}</TableCell>
                        <TableCell className="text-right">{u.browser_used}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</TableCell>
                      </TableRow>
                    ))}
                    {users.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">No users yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="leads" className="mt-6">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Source</TableHead>
                      <TableHead>Captured</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leads.map((l) => (
                      <TableRow key={l.id}>
                        <TableCell className="font-mono text-xs">{l.email}</TableCell>
                        <TableCell>{l.name || '—'}</TableCell>
                        <TableCell>{l.source || '—'}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">{new Date(l.created_at).toLocaleString()}</TableCell>
                      </TableRow>
                    ))}
                    {leads.length === 0 && (
                      <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">No leads yet.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}