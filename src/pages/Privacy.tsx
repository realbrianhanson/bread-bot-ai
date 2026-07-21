// NOTE: This Privacy Policy is a template starting point drafted for
// GarlicBread.ai. It is NOT legal advice. Have qualified counsel review
// it against applicable laws (GDPR, CCPA, etc.) before publishing.
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GarlicLogo } from '@/components/ui/logo-icon';

export default function Privacy() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Privacy Policy — GarlicBread.ai</title>
        <meta name="description" content="How GarlicBread.ai collects, uses, and protects your data across our AI browser automation and code generation platform." />
        <link rel="canonical" href="https://garlicbread.ai/privacy" />
        <meta property="og:title" content="Privacy Policy — GarlicBread.ai" />
        <meta property="og:description" content="How GarlicBread.ai handles your data, subprocessors, and user rights." />
        <meta property="og:url" content="https://garlicbread.ai/privacy" />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <GarlicLogo size={24} />
            <span className="font-bold">GarlicBread.ai</span>
          </Link>
          <Link to="/terms" className="text-sm text-muted-foreground hover:text-foreground">Terms</Link>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm md:prose-base">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026</p>

        <h2>1. Overview</h2>
        <p>This Privacy Policy explains how GarlicBread.ai ("we," "us") collects, uses, and shares information about you when you use our Service.</p>

        <h2>2. Information We Collect</h2>
        <ul>
          <li><strong>Account information</strong>: name, email, and authentication credentials.</li>
          <li><strong>Content you provide</strong>: prompts, tasks, uploads, generated code, and outputs.</li>
          <li><strong>Usage data</strong>: feature usage, message counts, task counts, timestamps, and diagnostic logs.</li>
          <li><strong>Payment information</strong>: processed by Stripe. We do not store full card details on our servers.</li>
          <li><strong>Device and log data</strong>: IP address, browser type, and request metadata.</li>
        </ul>

        <h2>3. How We Use Information</h2>
        <ul>
          <li>To provide, operate, and improve the Service;</li>
          <li>To send AI prompts to model providers so we can return results;</li>
          <li>To enforce plan limits and prevent abuse;</li>
          <li>To process payments and manage subscriptions;</li>
          <li>To communicate service updates and, if opted in, marketing messages;</li>
          <li>To comply with legal obligations.</li>
        </ul>

        <h2>4. Third-Party Processors</h2>
        <p>We share limited data with vendors that help us run the Service:</p>
        <ul>
          <li><strong>Stripe</strong> — payment processing.</li>
          <li><strong>OpenAI, Anthropic, Lovable AI Gateway</strong> — model inference on prompts you submit.</li>
          <li><strong>Browser Use, E2B, Firecrawl</strong> — browser automation, sandboxed code execution, and web scraping executed on your behalf.</li>
          <li><strong>Supabase / Lovable Cloud</strong> — database, authentication, and hosting.</li>
        </ul>
        <p>Each processor handles data under its own privacy terms.</p>

        <h2>5. User-Generated Content and Automations</h2>
        <p>Content you generate or automations you run may include information about third parties (e.g. websites you scrape). You are responsible for ensuring you have the right to process that data.</p>

        <h2>6. Data Retention</h2>
        <p>We retain account and content data for as long as your account is active or as needed to provide the Service. You may request deletion of your account and associated data at any time.</p>

        <h2>7. Security</h2>
        <p>We use encrypted connections (TLS), row-level access controls on our database, and isolated sandboxes for user code. No system is perfectly secure, and we cannot guarantee absolute security.</p>

        <h2>8. Your Rights</h2>
        <p>Depending on where you live, you may have rights to access, correct, delete, or export your personal data, and to object to certain processing. Contact us to exercise these rights.</p>

        <h2>9. Cookies</h2>
        <p>We use essential cookies and browser storage to keep you signed in and remember preferences. We do not sell your personal information.</p>

        <h2>10. Children</h2>
        <p>The Service is not directed to children under 13 (or the age of digital consent in your jurisdiction). Do not use the Service if you are under that age.</p>

        <h2>11. International Transfers</h2>
        <p>Data may be processed in countries other than your own. We rely on appropriate safeguards where required by law.</p>

        <h2>12. Changes</h2>
        <p>We may update this Policy. Material changes will be communicated via the Service or email.</p>

        <h2>13. Contact</h2>
        <p>For privacy questions or requests, contact <a href="mailto:privacy@garlicbread.ai">privacy@garlicbread.ai</a>.</p>
      </article>
    </main>
  );
}