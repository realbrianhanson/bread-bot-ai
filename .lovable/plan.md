

# GarlicBread.ai — Complete Feature & QA Checklist

This is a comprehensive list of everything the app does, organized by area, with instructions on how to test each feature. Your team can use this as a QA checklist.

---

## 1. Authentication & Onboarding

| Feature | How to Test |
|---------|-------------|
| **Email Sign Up** | Go to `/auth` → "Sign Up" tab → Enter name, email, password → Submit |
| **Email Sign In** | Go to `/auth` → "Sign In" tab → Enter email, password → Submit |
| **Google Sign In** | Go to `/auth` → Click "Sign in with Google" button |
| **Sign Out** | Dashboard header → Click logout icon (right side) → Confirm |
| **Onboarding Wizard** | Appears automatically for new users on first login. Offers quick-start prompts |
| **Protected Routes** | Try accessing `/dashboard` or `/settings` without logging in — should redirect to `/auth` |

---

## 2. Chat & AI Conversations

| Feature | How to Test |
|---------|-------------|
| **Start New Chat** | Dashboard → Click "Start New Chat" or the `+` icon in conversation list |
| **Send a Message** | Type in the chat input and press Enter or click Send |
| **Chat History** | Click on any previous conversation in the left sidebar — messages should load |
| **Auto-title Conversations** | Send a first message in a new chat — title auto-generates from content |
| **Rename Conversation** | Right-click or use menu on a conversation → Rename |
| **Delete Conversation** | Right-click or use menu on a conversation → Delete |
| **Stop Streaming** | While AI is responding, click the Stop button |
| **Voice Input** | Click the microphone button in chat input → Speak → Text appears |
| **File Attachments** | Click paperclip icon → Attach CSV, JSON, PDF, XLSX, images (up to 5 files, 10MB each) |
| **Slash Commands** | Type `/` in chat input to see command menu (see Section 3) |
| **GHL Mode Toggle** | Toggle in chat input area — switches output to GoHighLevel-compatible HTML |
| **Style Picker** | Design template selector in chat input area for website generation |
| **Purpose Picker** | Marketing purpose selector in chat input area |
| **Inspiration / Inspire** | Click inspire button or use `/inspire` — provide a URL to clone a design |
| **Message Feedback** | Thumbs up/down on AI responses |
| **Copy Messages** | Copy button on AI message outputs |

---

## 3. Slash Commands (type `/` in chat)

| Command | What It Does |
|---------|-------------|
| `/browse` | Launches a browser automation task |
| `/scrape` | Scrapes a single webpage for content |
| `/crawl` | Crawls an entire website |
| `/search` | Performs a web search |
| `/code` | Executes Python code in a sandbox |
| `/slides` | Generates a presentation from a topic |
| `/image` | Generates an AI image from text |
| `/research` | Deep research with multiple tools chained |
| `/deep` | Deep analysis (similar to research) |
| `/plan` | Creates a multi-step task plan |
| `/audit` | Analyzes a webpage for conversion optimization |
| `/compete` | Analyzes a competitor's site and generates a better version |
| `/document` | Creates a formatted document from results |
| `/inspire` | Builds a page inspired by an existing website |
| `/schedule` | Opens scheduled tasks panel |
| `/template` | Opens templates panel |
| `/history` | Opens task history panel |
| `/workflow` | Opens workflow builder |
| `/results` | Opens results dashboard |
| `/webhooks` | Opens webhook manager |

---

## 4. Browser Automation (Core Feature)

| Feature | How to Test |
|---------|-------------|
| **Run a Browser Task** | Type a task like "Go to google.com and search for AI tools" → AI launches a real browser |
| **Live Browser View** | Right panel shows live browser stream while task runs |
| **Stop Task** | Click Stop button during execution |
| **Pause / Resume Task** | Click Pause during execution, then Resume |
| **Task Steps Timeline** | Right panel shows step-by-step progress of what the agent is doing |
| **Login Detection** | If a site requires login, the agent prompts you |
| **User Takeover** | Agent can suggest you take over the browser for manual steps |
| **Task Deliverables** | After completion, see screenshots, extracted data, files |
| **Next Steps Suggestions** | After task completes, suggested follow-up actions appear |
| **Browser Profiles** | Select a saved browser profile before running a task (preserves cookies/sessions) |

---

## 5. Code Generation & Preview

| Feature | How to Test |
|---------|-------------|
| **Generate a Website** | Ask "Build me a landing page for a coffee shop" |
| **Live Preview** | Generated HTML/code renders in the right panel |
| **Undo / Redo** | Use undo/redo buttons on the preview panel |
| **Publish** | Click Publish button on preview → generates a public URL at `/p/[slug]` |
| **Published Pages List** | Left sidebar shows list of all published pages |
| **View Published Page** | Visit the published URL — page renders standalone |
| **Competitor Analysis** | Use `/compete` with a URL — generates a better version side by side |

---

## 6. Data & Research Tools

| Feature | How to Test |
|---------|-------------|
| **Web Scraping (Firecrawl)** | Use `/scrape [url]` — extracts markdown/HTML content |
| **Web Crawling** | Use `/crawl [url]` — crawls multiple pages |
| **Web Search** | Use `/search [query]` — searches the web |
| **Site Mapping** | Use Firecrawl map to discover all URLs on a site |
| **Deep Research / Orchestration** | Use `/research [topic]` — chains multiple tools (search, scrape, browse, code) |
| **Export Results** | After any scrape/search/crawl, click export dropdown → Copy, CSV, TXT, or DOCX |
| **Download as DOCX** | Export dropdown → "Download DOCX" — produces formatted Word document |
| **Push to Google Drive** | Export dropdown → "Google Doc" or "Google Sheet" (requires Google connection) |

---

## 7. Code Execution (Sandbox)

| Feature | How to Test |
|---------|-------------|
| **Run Python Code** | Use `/code` or ask to execute Python — runs in E2B sandbox |
| **Code Output** | Results display inline in chat |
| **Shell Sessions** | Agent can run terminal commands; output shown in shell panel |

---

## 8. File Generation

| Feature | How to Test |
|---------|-------------|
| **Generate Slides** | Use `/slides [topic]` — creates a presentation |
| **Generate Images** | Use `/image [description]` — creates an AI image |
| **Generate Documents** | Use `/document` after research — creates formatted output |
| **Google Docs Integration** | Results can be pushed to Google Docs (requires Google account connection in Settings) |
| **Google Sheets Integration** | Data can be pushed to Google Sheets |

---

## 9. Task Planning & Workflows

| Feature | How to Test |
|---------|-------------|
| **Task Planner** | Use `/plan [complex task]` — AI breaks it into steps |
| **Task Plan Viewer** | Right panel shows editable step list — add, remove, reorder steps |
| **Execute Plan** | Click "Execute" on plan viewer — runs each step sequentially |
| **Workflow Builder** | Header → Workflow icon → Build multi-step automated workflows |
| **Execute Workflow** | Create workflow steps → Run — executes sequentially |

---

## 10. Scheduled Tasks

| Feature | How to Test |
|---------|-------------|
| **View Scheduled Tasks** | Header → Clock icon → See all scheduled tasks |
| **Create Scheduled Task** | Schedule panel → Set task, frequency, time |

---

## 11. Templates

| Feature | How to Test |
|---------|-------------|
| **Browse Templates** | Header → Template icon → See pre-built task templates |
| **Use a Template** | Click a template → Fills chat with the template prompt |

---

## 12. Webhooks

| Feature | How to Test |
|---------|-------------|
| **View Webhooks** | Header → Webhook icon → See configured webhooks |
| **Create Webhook** | Add a new webhook with URL and trigger events |

---

## 13. Results & History

| Feature | How to Test |
|---------|-------------|
| **Results Dashboard** | Header → Chart icon → View aggregated task results |
| **Task History** | Header → History icon → See all past tasks with ability to re-run |
| **Build History** | Header → Build icon → See past code builds, click to reopen |

---

## 14. Settings Page (`/settings`)

| Feature | How to Test |
|---------|-------------|
| **Subscription / Plan Info** | Settings → Shows current tier, usage stats (chat messages, browser tasks, code executions) |
| **Usage Tracking** | Settings → Progress bars for each usage category |
| **Manage Subscription** | Settings → "Manage Subscription" opens billing portal |
| **API Keys** | Settings → Enter your own Browser Use, Anthropic, or E2B API keys (if plan allows) |
| **Google Integration** | Settings → Connect/Disconnect Google account for Docs/Sheets/Drive |
| **Analytics Dashboard** | Settings → Analytics tab → Usage charts |
| **Security Scanner** | Settings → Security tab → Scan for vulnerabilities |
| **Documentation Search** | Settings → Docs tab → Search documentation |
| **Document Parser** | Settings → Upload and parse documents |
| **Web Scraper** | Settings → Standalone scraper tool |
| **Workflow Agents** | Settings → Configure AI agent behaviors |
| **Agent Memory** | Settings → View/manage what the AI remembers about you |
| **Knowledge Base** | Settings → Upload and manage reference documents the AI can search |

---

## 15. Other Pages

| Feature | How to Test |
|---------|-------------|
| **Landing Page** | Visit `/` — Shows marketing page with features, stats, sign-in CTA |
| **Pricing Page** | Visit `/pricing` — Shows plan tiers and pricing |
| **Lead Capture** | Visit `/lead` — Lead capture form |
| **Shared Preview** | Visit `/preview/[shareId]` — View a shared code preview |
| **Published Page** | Visit `/p/[slug]` — View a published website |
| **Dark/Light Mode** | Toggle theme via the sun/moon icon in header |
| **Command Palette** | Press Cmd/Ctrl+K on dashboard for quick actions |
| **Mobile Responsive** | All features work on mobile with drawer navigation, chat/preview tabs |

---

## 16. Key Integration Points to Verify

- **Browser Use API**: Powers all browser automation tasks
- **Firecrawl API**: Powers scrape, crawl, search, and map
- **AI Chat (Claude/Orchestrator)**: Powers all chat responses and task orchestration
- **Google OAuth**: Powers Google Docs/Sheets/Drive integration
- **Stripe**: Powers subscription billing and customer portal
- **Honcho**: Powers agent memory (remembers user context across sessions)
- **E2B**: Powers sandboxed code execution

---

This covers every user-facing feature in GarlicBread.ai. Each row can be treated as a QA test case for your team.

