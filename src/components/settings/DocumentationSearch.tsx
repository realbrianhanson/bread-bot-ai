import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Book, Search, ExternalLink, FileText, Loader2 } from 'lucide-react';

interface DocResult {
  title: string;
  slug: string;
  url: string;
  snippet: string;
  category: string;
}

// Mock search results
const mockResults: DocResult[] = [
  {
    title: 'Row Level Security',
    slug: 'auth/row-level-security',
    url: 'https://supabase.com/docs/guides/auth/row-level-security',
    snippet: 'Row Level Security (RLS) is a feature that allows you to control access to rows in a database table...',
    category: 'Auth',
  },
  {
    title: 'Storage File Upload',
    slug: 'storage/uploads',
    url: 'https://supabase.com/docs/guides/storage/uploads',
    snippet: 'Learn how to upload files to Supabase Storage using the JavaScript client library...',
    category: 'Storage',
  },
  {
    title: 'Edge Functions',
    slug: 'functions/edge-functions',
    url: 'https://supabase.com/docs/guides/functions',
    snippet: 'Edge Functions are server-side TypeScript functions that run on the edge, close to your users...',
    category: 'Functions',
  },
  {
    title: 'Database Triggers',
    slug: 'database/postgres/triggers',
    url: 'https://supabase.com/docs/guides/database/postgres/triggers',
    snippet: 'Triggers allow you to run custom logic when certain database events occur...',
    category: 'Database',
  },
];

const categoryColors: Record<string, string> = {
  Auth: 'bg-green-500/20 text-green-500',
  Storage: 'bg-blue-500/20 text-blue-500',
  Functions: 'bg-purple-500/20 text-purple-500',
  Database: 'bg-orange-500/20 text-orange-500',
};

export function DocumentationSearch() {
  const [query, setQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<DocResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    
    setIsSearching(true);
    setHasSearched(true);
    
    // Simulate search
    setTimeout(() => {
      setResults(mockResults.filter(r => 
        r.title.toLowerCase().includes(query.toLowerCase()) ||
        r.snippet.toLowerCase().includes(query.toLowerCase()) ||
        r.category.toLowerCase().includes(query.toLowerCase())
      ));
      setIsSearching(false);
    }, 800);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <Card className="glass-strong border-white/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Book className="h-5 w-5 text-primary" />
          Documentation Search
        </CardTitle>
        <CardDescription>
          Search backend documentation for guides and references
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search Input */}
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Search docs (e.g., RLS, storage, auth)..."
              className="pl-10"
            />
          </div>
          <Button onClick={handleSearch} disabled={isSearching || !query.trim()}>
            {isSearching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Search className="h-4 w-4" />
            )}
          </Button>
        </div>

        {/* Quick Links */}
        {!hasSearched && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Quick links</p>
            <div className="flex flex-wrap gap-2">
              {['RLS', 'Storage', 'Edge Functions', 'Auth'].map(term => (
                <Button
                  key={term}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setQuery(term);
                    setTimeout(handleSearch, 100);
                  }}
                >
                  {term}
                </Button>
              ))}
            </div>
          </div>
        )}

        {/* Results */}
        {hasSearched && (
          <ScrollArea className="h-[300px]">
            {isSearching ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : results.length > 0 ? (
              <div className="space-y-3 pr-4">
                {results.map((result, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg border border-border bg-secondary/30 hover:bg-secondary/50 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-muted-foreground" />
                        <h4 className="font-medium">{result.title}</h4>
                      </div>
                      <Badge variant="outline" className={categoryColors[result.category] || ''}>
                        {result.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {result.snippet}
                    </p>
                    <div className="flex items-center justify-between">
                      <code className="text-xs text-muted-foreground">{result.slug}</code>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => window.open(result.url, '_blank')}
                      >
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Open
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No results found for "{query}"</p>
                <p className="text-sm">Try different keywords</p>
              </div>
            )}
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
}
