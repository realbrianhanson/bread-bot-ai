// Workflow Agent Types - Specialized agents for different browser automation patterns

export type AgentType = 
  | 'data_extractor' 
  | 'form_filler' 
  | 'navigator' 
  | 'monitor' 
  | 'scraper'
  | 'custom';

export type AgentStatus = 'idle' | 'configuring' | 'running' | 'paused' | 'completed' | 'failed';

export interface AgentCapability {
  id: string;
  name: string;
  description: string;
  icon: string;
}

export interface AgentConfig {
  maxRetries?: number;
  timeout?: number;
  waitBetweenSteps?: number;
  captureScreenshots?: boolean;
  extractData?: boolean;
  saveToDatabase?: boolean;
}

export interface WorkflowAgent {
  id: string;
  type: AgentType;
  name: string;
  description: string;
  icon: string;
  color: string;
  capabilities: AgentCapability[];
  defaultConfig: AgentConfig;
  suggestedPrompts: string[];
}

// Agent definitions
export const WORKFLOW_AGENTS: Record<AgentType, WorkflowAgent> = {
  data_extractor: {
    id: 'data_extractor',
    type: 'data_extractor',
    name: 'Data Extractor',
    description: 'Extract structured data from websites, tables, and lists',
    icon: 'Database',
    color: 'from-blue-500 to-cyan-500',
    capabilities: [
      { id: 'table_extract', name: 'Table Extraction', description: 'Extract data from HTML tables', icon: 'Table' },
      { id: 'list_extract', name: 'List Extraction', description: 'Extract items from lists', icon: 'List' },
      { id: 'json_output', name: 'JSON Output', description: 'Output data as structured JSON', icon: 'Braces' },
      { id: 'csv_export', name: 'CSV Export', description: 'Export data to CSV format', icon: 'FileSpreadsheet' },
    ],
    defaultConfig: {
      maxRetries: 3,
      timeout: 60000,
      captureScreenshots: true,
      extractData: true,
      saveToDatabase: true,
    },
    suggestedPrompts: [
      'Extract all product prices from this page',
      'Get all contact information from the directory',
      'Scrape the table data and save as JSON',
      'Extract all links and their titles',
    ],
  },
  form_filler: {
    id: 'form_filler',
    type: 'form_filler',
    name: 'Form Filler',
    description: 'Automate form submissions, signups, and data entry',
    icon: 'FormInput',
    color: 'from-purple-500 to-pink-500',
    capabilities: [
      { id: 'auto_fill', name: 'Auto Fill', description: 'Automatically fill form fields', icon: 'PenTool' },
      { id: 'file_upload', name: 'File Upload', description: 'Handle file upload fields', icon: 'Upload' },
      { id: 'captcha_pause', name: 'CAPTCHA Handling', description: 'Pause for manual CAPTCHA solving', icon: 'Shield' },
      { id: 'multi_step', name: 'Multi-Step Forms', description: 'Handle multi-page forms', icon: 'Layers' },
    ],
    defaultConfig: {
      maxRetries: 2,
      timeout: 120000,
      waitBetweenSteps: 1000,
      captureScreenshots: true,
    },
    suggestedPrompts: [
      'Fill out this contact form with my details',
      'Complete the registration process',
      'Submit this application form',
      'Update my profile information',
    ],
  },
  navigator: {
    id: 'navigator',
    type: 'navigator',
    name: 'Navigator',
    description: 'Navigate complex workflows and multi-step processes',
    icon: 'Compass',
    color: 'from-green-500 to-emerald-500',
    capabilities: [
      { id: 'login_flow', name: 'Login Handling', description: 'Handle authentication flows', icon: 'LogIn' },
      { id: 'pagination', name: 'Pagination', description: 'Navigate through paginated content', icon: 'ChevronRight' },
      { id: 'search_filter', name: 'Search & Filter', description: 'Use search and filter controls', icon: 'Search' },
      { id: 'modal_handling', name: 'Modal Handling', description: 'Interact with popups and modals', icon: 'Square' },
    ],
    defaultConfig: {
      maxRetries: 3,
      timeout: 90000,
      waitBetweenSteps: 500,
      captureScreenshots: true,
    },
    suggestedPrompts: [
      'Navigate to my account settings',
      'Go through all pages and collect data',
      'Find and click on the checkout button',
      'Search for a specific item and open it',
    ],
  },
  monitor: {
    id: 'monitor',
    type: 'monitor',
    name: 'Monitor',
    description: 'Watch for changes, track updates, and send alerts',
    icon: 'Eye',
    color: 'from-orange-500 to-red-500',
    capabilities: [
      { id: 'price_track', name: 'Price Tracking', description: 'Monitor price changes', icon: 'DollarSign' },
      { id: 'availability', name: 'Availability Check', description: 'Check stock availability', icon: 'Package' },
      { id: 'content_change', name: 'Content Changes', description: 'Detect content updates', icon: 'FileText' },
      { id: 'alerts', name: 'Alerts', description: 'Send notifications on changes', icon: 'Bell' },
    ],
    defaultConfig: {
      maxRetries: 5,
      timeout: 30000,
      captureScreenshots: true,
      saveToDatabase: true,
    },
    suggestedPrompts: [
      'Monitor this product price and alert me on changes',
      'Check if this item is back in stock',
      'Track changes to this page',
      'Watch for new posts on this feed',
    ],
  },
  scraper: {
    id: 'scraper',
    type: 'scraper',
    name: 'Web Scraper',
    description: 'Crawl websites and extract content at scale',
    icon: 'Globe',
    color: 'from-indigo-500 to-violet-500',
    capabilities: [
      { id: 'multi_page', name: 'Multi-Page Crawl', description: 'Crawl multiple pages', icon: 'Layers' },
      { id: 'sitemap', name: 'Sitemap Following', description: 'Follow sitemap structure', icon: 'Map' },
      { id: 'content_parse', name: 'Content Parsing', description: 'Parse and clean content', icon: 'FileCode' },
      { id: 'media_download', name: 'Media Download', description: 'Download images and files', icon: 'Download' },
    ],
    defaultConfig: {
      maxRetries: 3,
      timeout: 180000,
      captureScreenshots: false,
      extractData: true,
      saveToDatabase: true,
    },
    suggestedPrompts: [
      'Scrape all blog posts from this site',
      'Download all images from this gallery',
      'Extract content from all pages in this section',
      'Crawl the site and build a content map',
    ],
  },
  custom: {
    id: 'custom',
    type: 'custom',
    name: 'Custom Agent',
    description: 'Create a custom automation workflow',
    icon: 'Wand2',
    color: 'from-slate-500 to-zinc-500',
    capabilities: [
      { id: 'flexible', name: 'Flexible Actions', description: 'Any browser action', icon: 'Sparkles' },
      { id: 'script', name: 'Custom Scripts', description: 'Run custom scripts', icon: 'Code' },
    ],
    defaultConfig: {
      maxRetries: 2,
      timeout: 60000,
      captureScreenshots: true,
    },
    suggestedPrompts: [
      'Do something specific on this website',
    ],
  },
};

export const getAgentByType = (type: AgentType): WorkflowAgent => {
  return WORKFLOW_AGENTS[type];
};

export const getAllAgents = (): WorkflowAgent[] => {
  return Object.values(WORKFLOW_AGENTS);
};
