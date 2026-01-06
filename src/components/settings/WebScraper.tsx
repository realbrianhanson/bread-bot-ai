import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Globe, Search, Map, Loader2, ExternalLink, FileText, Image } from 'lucide-react';
import { firecrawlApi } from '@/lib/api/firecrawl';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

export const WebScraper = () => {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('scrape');
  
  // Scrape state
  const [scrapeUrl, setScrapeUrl] = useState('');
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapeResult, setScrapeResult] = useState<any>(null);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<any[]>([]);
  
  // Map state
  const [mapUrl, setMapUrl] = useState('');
  const [mapLoading, setMapLoading] = useState(false);
  const [mapResults, setMapResults] = useState<string[]>([]);

  const handleScrape = async (e: React.FormEvent) => {
    e.preventDefault();
    setScrapeLoading(true);
    setScrapeResult(null);

    try {
      const response = await firecrawlApi.scrape(scrapeUrl, {
        formats: ['markdown', 'screenshot', 'links'],
      });

      if (response.success) {
        toast({ title: 'Success', description: 'Page scraped successfully' });
        setScrapeResult(response.data || response);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to scrape page',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error scraping:', error);
      toast({
        title: 'Error',
        description: 'Failed to scrape page',
        variant: 'destructive',
      });
    } finally {
      setScrapeLoading(false);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setSearchLoading(true);
    setSearchResults([]);

    try {
      const response = await firecrawlApi.search(searchQuery, {
        limit: 10,
        scrapeOptions: { formats: ['markdown'] },
      });

      if (response.success) {
        toast({ title: 'Success', description: 'Search completed' });
        setSearchResults(response.data || []);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Search failed',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error searching:', error);
      toast({
        title: 'Error',
        description: 'Search failed',
        variant: 'destructive',
      });
    } finally {
      setSearchLoading(false);
    }
  };

  const handleMap = async (e: React.FormEvent) => {
    e.preventDefault();
    setMapLoading(true);
    setMapResults([]);

    try {
      const response = await firecrawlApi.map(mapUrl, {
        limit: 100,
        includeSubdomains: false,
      }) as any;

      if (response.success) {
        toast({ title: 'Success', description: 'Site mapped successfully' });
        setMapResults(response.links || response.data?.links || []);
      } else {
        toast({
          title: 'Error',
          description: response.error || 'Failed to map site',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error mapping:', error);
      toast({
        title: 'Error',
        description: 'Failed to map site',
        variant: 'destructive',
      });
    } finally {
      setMapLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Web Scraper
        </CardTitle>
        <CardDescription>
          Scrape, search, and map websites using Firecrawl
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="scrape" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Scrape
            </TabsTrigger>
            <TabsTrigger value="search" className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Search
            </TabsTrigger>
            <TabsTrigger value="map" className="flex items-center gap-2">
              <Map className="h-4 w-4" />
              Map
            </TabsTrigger>
          </TabsList>

          <TabsContent value="scrape" className="space-y-4">
            <form onSubmit={handleScrape} className="flex gap-2">
              <Input
                type="url"
                value={scrapeUrl}
                onChange={(e) => setScrapeUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="flex-1"
              />
              <Button type="submit" disabled={scrapeLoading}>
                {scrapeLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Scrape'}
              </Button>
            </form>

            {scrapeResult && (
              <div className="space-y-4">
                {scrapeResult.screenshot && (
                  <div>
                    <h4 className="text-sm font-medium mb-2 flex items-center gap-2">
                      <Image className="h-4 w-4" />
                      Screenshot
                    </h4>
                    <img
                      src={`data:image/png;base64,${scrapeResult.screenshot}`}
                      alt="Page screenshot"
                      className="rounded-lg border max-h-64 object-contain"
                    />
                  </div>
                )}
                
                {scrapeResult.markdown && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Content</h4>
                    <ScrollArea className="h-64 rounded-md border p-4">
                      <div className="prose prose-sm max-w-none dark:prose-invert">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {scrapeResult.markdown}
                        </ReactMarkdown>
                      </div>
                    </ScrollArea>
                  </div>
                )}

                {scrapeResult.links && scrapeResult.links.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">
                      Links Found ({scrapeResult.links.length})
                    </h4>
                    <ScrollArea className="h-32 rounded-md border p-2">
                      <div className="space-y-1">
                        {scrapeResult.links.slice(0, 20).map((link: string, i: number) => (
                          <a
                            key={i}
                            href={link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate"
                          >
                            <ExternalLink className="h-3 w-3 shrink-0" />
                            {link}
                          </a>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                )}
              </div>
            )}
          </TabsContent>

          <TabsContent value="search" className="space-y-4">
            <form onSubmit={handleSearch} className="flex gap-2">
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search the web..."
                required
                className="flex-1"
              />
              <Button type="submit" disabled={searchLoading}>
                {searchLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </form>

            {searchResults.length > 0 && (
              <ScrollArea className="h-80">
                <div className="space-y-3">
                  {searchResults.map((result: any, i: number) => (
                    <Card key={i} className="p-3">
                      <a
                        href={result.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="font-medium text-sm hover:text-primary flex items-center gap-1"
                      >
                        {result.title}
                        <ExternalLink className="h-3 w-3" />
                      </a>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {result.description}
                      </p>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            )}
          </TabsContent>

          <TabsContent value="map" className="space-y-4">
            <form onSubmit={handleMap} className="flex gap-2">
              <Input
                type="url"
                value={mapUrl}
                onChange={(e) => setMapUrl(e.target.value)}
                placeholder="https://example.com"
                required
                className="flex-1"
              />
              <Button type="submit" disabled={mapLoading}>
                {mapLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Map Site'}
              </Button>
            </form>

            {mapResults.length > 0 && (
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="secondary">{mapResults.length} URLs found</Badge>
                </div>
                <ScrollArea className="h-64 rounded-md border p-2">
                  <div className="space-y-1">
                    {mapResults.map((url, i) => (
                      <a
                        key={i}
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary truncate"
                      >
                        <ExternalLink className="h-3 w-3 shrink-0" />
                        {url}
                      </a>
                    ))}
                  </div>
                </ScrollArea>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};
