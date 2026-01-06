import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Shield, ShieldAlert, ShieldCheck, ShieldX, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface SecurityFinding {
  id: string;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'info';
  title: string;
  description: string;
  recommendation: string;
  category: string;
}

interface ScanResult {
  score: number;
  findings: SecurityFinding[];
  scannedAt: string;
  tablesScanned: number;
  policiesChecked: number;
}

// Mock scan results
const mockScanResult: ScanResult = {
  score: 78,
  scannedAt: new Date().toISOString(),
  tablesScanned: 9,
  policiesChecked: 24,
  findings: [
    {
      id: '1',
      severity: 'high',
      title: 'Missing RLS Policy',
      description: 'Table "public_data" has RLS enabled but no policies defined.',
      recommendation: 'Add appropriate SELECT, INSERT, UPDATE, and DELETE policies.',
      category: 'Row Level Security',
    },
    {
      id: '2',
      severity: 'medium',
      title: 'Overly Permissive Policy',
      description: 'Policy "allow_all_read" uses (true) as condition.',
      recommendation: 'Review if this policy should be restricted to specific users.',
      category: 'Access Control',
    },
    {
      id: '3',
      severity: 'low',
      title: 'No Delete Policy',
      description: 'Table "tasks" lacks a DELETE policy.',
      recommendation: 'Consider adding a DELETE policy or document why it\'s not needed.',
      category: 'Row Level Security',
    },
    {
      id: '4',
      severity: 'info',
      title: 'Storage Bucket Public',
      description: 'Bucket "avatars" is publicly accessible.',
      recommendation: 'Verify public access is intentional for avatar images.',
      category: 'Storage',
    },
  ],
};

const severityColors = {
  critical: 'bg-red-500/20 text-red-500 border-red-500/50',
  high: 'bg-orange-500/20 text-orange-500 border-orange-500/50',
  medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50',
  low: 'bg-blue-500/20 text-blue-500 border-blue-500/50',
  info: 'bg-gray-500/20 text-gray-400 border-gray-500/50',
};

const severityIcons = {
  critical: ShieldX,
  high: ShieldAlert,
  medium: ShieldAlert,
  low: Shield,
  info: ShieldCheck,
};

export function SecurityScanner() {
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(mockScanResult);
  const [expandedFindings, setExpandedFindings] = useState<Set<string>>(new Set());

  const handleScan = () => {
    setIsScanning(true);
    setScanResult(null);
    // Simulate scanning
    setTimeout(() => {
      setScanResult(mockScanResult);
      setIsScanning(false);
    }, 3000);
  };

  const toggleFinding = (id: string) => {
    const newExpanded = new Set(expandedFindings);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedFindings(newExpanded);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-500';
    if (score >= 60) return 'text-yellow-500';
    if (score >= 40) return 'text-orange-500';
    return 'text-red-500';
  };

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-primary" />
              Security Scanner
            </CardTitle>
            <CardDescription>
              Analyze your database for security vulnerabilities
            </CardDescription>
          </div>
          <Button onClick={handleScan} disabled={isScanning}>
            <RefreshCw className={`h-4 w-4 mr-2 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Run Scan'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {isScanning && (
          <div className="space-y-4 p-6 text-center">
            <div className="animate-pulse">
              <Shield className="h-12 w-12 mx-auto text-primary mb-4" />
            </div>
            <p className="text-muted-foreground">Scanning database security...</p>
            <Progress value={33} className="max-w-xs mx-auto" />
          </div>
        )}

        {scanResult && !isScanning && (
          <>
            {/* Score Overview */}
            <div className="flex items-center justify-between p-6 rounded-lg bg-secondary/30 border border-border">
              <div>
                <p className="text-sm text-muted-foreground">Security Score</p>
                <p className={`text-4xl font-bold ${getScoreColor(scanResult.score)}`}>
                  {scanResult.score}/100
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Scanned {scanResult.tablesScanned} tables, {scanResult.policiesChecked} policies
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-muted-foreground">Last Scan</p>
                <p className="text-sm">
                  {new Date(scanResult.scannedAt).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Findings Summary */}
            <div className="flex gap-2 flex-wrap">
              {(['critical', 'high', 'medium', 'low', 'info'] as const).map(severity => {
                const count = scanResult.findings.filter(f => f.severity === severity).length;
                if (count === 0) return null;
                return (
                  <Badge key={severity} variant="outline" className={severityColors[severity]}>
                    {count} {severity}
                  </Badge>
                );
              })}
            </div>

            {/* Findings List */}
            <div className="space-y-3">
              <h4 className="text-sm font-medium">Findings</h4>
              {scanResult.findings.map(finding => {
                const Icon = severityIcons[finding.severity];
                const isExpanded = expandedFindings.has(finding.id);
                
                return (
                  <Collapsible key={finding.id} open={isExpanded}>
                    <CollapsibleTrigger
                      onClick={() => toggleFinding(finding.id)}
                      className="w-full"
                    >
                      <div className={`p-4 rounded-lg border ${severityColors[finding.severity]} flex items-center justify-between cursor-pointer hover:bg-secondary/20 transition-colors`}>
                        <div className="flex items-center gap-3">
                          <Icon className="h-5 w-5 shrink-0" />
                          <div className="text-left">
                            <p className="font-medium">{finding.title}</p>
                            <p className="text-xs text-muted-foreground">{finding.category}</p>
                          </div>
                        </div>
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="p-4 pt-2 space-y-2 text-sm">
                        <p className="text-muted-foreground">{finding.description}</p>
                        <div className="p-3 rounded bg-primary/10 border border-primary/20">
                          <p className="font-medium text-primary mb-1">Recommendation</p>
                          <p>{finding.recommendation}</p>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
