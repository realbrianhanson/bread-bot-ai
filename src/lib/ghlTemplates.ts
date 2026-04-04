export type GHLTemplateCategory =
  | 'lead-capture'
  | 'sales'
  | 'webinar'
  | 'booking'
  | 'thankyou'
  | 'vsl'
  | 'coming-soon'
  | 'case-study';

export interface GHLTemplate {
  id: string;
  name: string;
  category: GHLTemplateCategory;
  description: string;
  prompt: string;
  colorScheme: { primary: string; accent: string; bgDark: string };
}

export const CATEGORY_LABELS: Record<GHLTemplateCategory, string> = {
  'lead-capture': 'Lead Capture',
  sales: 'Sales Page',
  webinar: 'Webinar',
  booking: 'Booking',
  thankyou: 'Thank You',
  vsl: 'VSL',
  'coming-soon': 'Coming Soon',
  'case-study': 'Case Study',
};

export const GHL_TEMPLATES: GHLTemplate[] = [
  {
    id: 'agency-lead-magnet',
    name: 'Agency Lead Magnet',
    category: 'lead-capture',
    description: 'Free PDF download page with dark hero, benefit bullets, testimonials, and urgency CTA.',
    colorScheme: { primary: '#4F46E5', accent: '#F59E0B', bgDark: '#0F172A' },
    prompt: `Create a GHL lead capture page for a digital marketing agency offering a free "2026 Marketing Playbook" PDF download. Dark hero section with gradient from deep navy to indigo. Bold headline: editable placeholder text. 3 benefit bullets with checkmark icons. Email capture form placeholder. Below the fold: 3 testimonial cards with photo placeholders, names, and star ratings. Social proof bar with "500+ agencies trust us" and logo placeholders. Final CTA section with urgency: "Only 100 copies remaining". Include a simple FAQ section with 4 questions about the playbook.`,
  },
  {
    id: 'coaching-sales',
    name: 'High-Ticket Coaching',
    category: 'sales',
    description: 'Long-form sales page with story-driven copy, video testimonials, feature stack, and guarantee.',
    colorScheme: { primary: '#7C3AED', accent: '#F59E0B', bgDark: '#1E1B4B' },
    prompt: `Create a GHL long-form sales page for a high-ticket business coaching program ($5,000 value). Hero with bold promise headline and sub-headline addressing entrepreneur pain points. "Watch the free training" CTA button. Problem-agitation section with 5 pain points. Solution reveal with 6 feature cards (icon + benefit headline + description). Video testimonial section with 4 cards (photo placeholder, name, business, quote, revenue increase stat). Pricing section with crossed-out original price, current price, and 3 bonus items with values. Money-back guarantee badge with 30-day promise. Final CTA with countdown timer placeholder. FAQ with 6 objection-handling questions. Dark premium theme with purple-to-indigo gradients and gold accents.`,
  },
  {
    id: 'masterclass-webinar',
    name: 'Masterclass Webinar',
    category: 'webinar',
    description: 'Event registration page with countdown, speaker bio, agenda, and social proof.',
    colorScheme: { primary: '#2563EB', accent: '#EF4444', bgDark: '#0F172A' },
    prompt: `Create a GHL webinar registration page for a free masterclass called "Scale Your Business to 7 Figures in 2026". Hero section with bold headline, date/time placeholder, and a large "Reserve My Seat" CTA. Countdown timer section (CSS only — show placeholder boxes for days, hours, minutes, seconds). Speaker bio section with large photo placeholder, name, credentials, and 3 achievements. "What you'll learn" section with 5 agenda items (numbered, with time estimates). Social proof: "5,000+ attendees" stat and 3 short testimonial quotes. Urgency bar: "Only 500 seats available — 327 already claimed". Final CTA with calendar embed placeholder. Blue and white theme with red accent for urgency elements.`,
  },
  {
    id: 'consultant-booking',
    name: 'Strategy Call Booking',
    category: 'booking',
    description: 'Calendar booking page with trust builders, process steps, and qualification criteria.',
    colorScheme: { primary: '#059669', accent: '#F59E0B', bgDark: '#064E3B' },
    prompt: `Create a GHL booking page for a free 30-minute strategy call with a business consultant. Hero with headline "Book Your Free Strategy Session" and subheadline about discovering growth opportunities. GHL calendar embed placeholder prominently placed. "How it works" section with 3 steps (Book → Prepare → Transform) using numbered circles. "This call is for you if..." section with 5 qualification criteria (checkmarks). "This call is NOT for you if..." section with 3 items (X marks). Consultant bio card with photo placeholder, credentials, and "100+ businesses transformed" stat. 3 testimonial cards from past strategy call clients. Trust badges section: "No obligation", "100% Free", "Actionable insights guaranteed". Clean green and white theme with emerald accents.`,
  },
  {
    id: 'onboarding-thankyou',
    name: 'Onboarding Thank You',
    category: 'thankyou',
    description: 'Post-conversion page with next steps, resource links, and community invite.',
    colorScheme: { primary: '#10B981', accent: '#6366F1', bgDark: '#0F172A' },
    prompt: `Create a GHL thank you page shown after a successful form submission. Large animated checkmark area (CSS animation) with "You're In!" headline. Confirmation details section: "Check your email for..." with inbox icon. "Your 3 Next Steps" section with numbered action cards: 1) Check email, 2) Join the community (with link placeholder), 3) Share with a friend (social share buttons — CSS only, no JS frameworks). Bonus section: "While you wait, watch this..." with video placeholder. Resource links section with 3 downloadable guides (icon + title + description). "Follow us" social media links row. Clean, celebratory design with green success colors and confetti-inspired subtle background pattern (CSS).`,
  },
  {
    id: 'high-ticket-vsl',
    name: 'High-Ticket VSL',
    category: 'vsl',
    description: 'Video sales letter with curiosity headline, video embed, testimonials, and guarantee.',
    colorScheme: { primary: '#1E293B', accent: '#D97706', bgDark: '#0F172A' },
    prompt: `Create a GHL VSL (Video Sales Letter) page. Curiosity-driven headline at the top (large, bold, centered) — something like "The Unconventional Method That Generated $2.3M in 90 Days". Below it, a 16:9 video placeholder with a play button overlay (use a dark rectangle with a centered play triangle — pure CSS, no image). Below the video: "Watch the video above to discover..." with 3 key benefit points. Then a large CTA button: "Get Instant Access". Below that: testimonials in a 2-column grid (4 cards with photo, name, result stat, and quote). Risk reversal section with money-back guarantee badge (shield icon in CSS). Final CTA with "Limited spots available" urgency. Dark, premium feel — use slate-900 background with gold/amber accents throughout.`,
  },
  {
    id: 'saas-coming-soon',
    name: 'SaaS Pre-Launch',
    category: 'coming-soon',
    description: 'Pre-launch page with countdown, email capture, feature teasers, and early-bird offer.',
    colorScheme: { primary: '#8B5CF6', accent: '#06B6D4', bgDark: '#1E1B4B' },
    prompt: `Create a GHL coming soon / pre-launch page for a new SaaS product called "FlowStack" — an AI-powered workflow automation tool. Dark gradient hero (purple to dark blue) with large product name and tagline: "Automate Everything. Launch Soon." Countdown timer section with CSS-only placeholder boxes. Email capture form placeholder with "Get Early Access" CTA. "What's Coming" section with 4 feature teaser cards (icon area + title + 1-line teaser — keep it mysterious). Early-bird offer badge: "First 200 signups get 50% off for life". Progress bar showing "73% to launch" (CSS only). "Built by" section with small team photos placeholder and company story blurb. Social links footer. Purple-to-cyan gradient accents on dark background.`,
  },
  {
    id: 'roi-case-study',
    name: 'ROI Case Study',
    category: 'case-study',
    description: 'Results showcase with big stats, before/after comparison, timeline, and CTA.',
    colorScheme: { primary: '#0EA5E9', accent: '#F59E0B', bgDark: '#0C4A6E' },
    prompt: `Create a GHL case study landing page showcasing a client success story. Hero with headline: "How [Client Name] Increased Revenue by 347% in 6 Months". 3 large stat cards at the top: revenue increase, lead growth, and ROI multiplier (big bold numbers with labels). "The Challenge" section with the client's before-state (3 pain points with X icons). "The Solution" section describing the approach (3 steps with numbered icons). Before/After comparison section — side-by-side cards showing key metrics. Timeline section with 4 milestones (month 1, 2, 4, 6) showing progress. Client quote testimonial with large photo placeholder, name, title, and company. "Want Results Like These?" final CTA section with form placeholder. Professional blue theme with amber accent for stats and highlights.`,
  },
];
