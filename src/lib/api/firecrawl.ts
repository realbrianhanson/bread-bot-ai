import { supabase } from '@/integrations/supabase/client';

type FirecrawlResponse<T = any> = {
  success: boolean;
  error?: string;
  data?: T;
};

type ScrapeOptions = {
  formats?: (
    | 'markdown' | 'html' | 'rawHtml' | 'links' | 'screenshot' | 'branding' | 'summary'
    | { type: 'json'; schema?: object; prompt?: string }
  )[];
  onlyMainContent?: boolean;
  waitFor?: number;
  location?: { country?: string; languages?: string[] };
};

type SearchOptions = {
  limit?: number;
  lang?: string;
  country?: string;
  tbs?: string;
  scrapeOptions?: { formats?: ('markdown' | 'html')[] };
};

type MapOptions = {
  search?: string;
  limit?: number;
  includeSubdomains?: boolean;
};

type CrawlOptions = {
  limit?: number;
  maxDepth?: number;
  includePaths?: string[];
  excludePaths?: string[];
};

export const firecrawlApi = {
  async scrape(url: string, options?: ScrapeOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-scrape', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async search(query: string, options?: SearchOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-search', {
      body: { query, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async map(url: string, options?: MapOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-map', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },

  async crawl(url: string, options?: CrawlOptions): Promise<FirecrawlResponse> {
    const { data, error } = await supabase.functions.invoke('firecrawl-crawl', {
      body: { url, options },
    });

    if (error) {
      return { success: false, error: error.message };
    }
    return data;
  },
};
