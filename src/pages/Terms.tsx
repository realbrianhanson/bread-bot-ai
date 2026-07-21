// NOTE: This Terms of Service is a template starting point drafted for
// GarlicBread.ai. It is NOT legal advice. Have qualified counsel review
// and tailor it to your jurisdiction and business before relying on it.
import { Link } from 'react-router-dom';
import { Helmet } from 'react-helmet-async';
import { GarlicLogo } from '@/components/ui/logo-icon';

export default function Terms() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <Helmet>
        <title>Terms of Service — GarlicBread.ai</title>
        <meta name="description" content="GarlicBread.ai Terms of Service: acceptable use, accounts, billing, and liability for our AI browser automation and code generation platform." />
        <link rel="canonical" href="https://garlicbread.ai/terms" />
        <meta property="og:title" content="Terms of Service — GarlicBread.ai" />
        <meta property="og:description" content="Terms governing use of GarlicBread.ai's AI automation platform." />
        <meta property="og:url" content="https://garlicbread.ai/terms" />
        <meta property="og:type" content="website" />
      </Helmet>
      <header className="border-b border-border/40">
        <div className="max-w-3xl mx-auto flex items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <GarlicLogo size={24} />
            <span className="font-bold">GarlicBread.ai</span>
          </Link>
          <Link to="/privacy" className="text-sm text-muted-foreground hover:text-foreground">Privacy</Link>
        </div>
      </header>
      <article className="max-w-3xl mx-auto px-6 py-12 prose prose-invert prose-sm md:prose-base">
        <h1>Terms of Service</h1>
        <p className="text-sm text-muted-foreground">Last updated: 2026</p>

        <h2>1. Acceptance of Terms</h2>
        <p>By accessing or using GarlicBread.ai ("Service"), you agree to be bound by these Terms of Service. If you do not agree, do not use the Service.</p>

        <h2>2. Description of Service</h2>
        <p>GarlicBread.ai provides AI-powered browser automation, code generation, and data extraction tools. Features may change or be discontinued at any time.</p>

        <h2>3. Accounts</h2>
        <p>You must provide accurate account information and keep your credentials secure. You are responsible for all activity under your account.</p>

        <h2>4. Acceptable Use</h2>
        <p>You agree not to use the Service to:</p>
        <ul>
          <li>Violate any law, regulation, or third-party rights (including intellectual property, privacy, and website terms of service);</li>
          <li>Scrape, extract, or automate interactions with services in a manner that violates those services' terms;</li>
          <li>Access data you are not authorized to access;</li>
          <li>Send spam, malware, or content that is illegal, harmful, harassing, or infringing;</li>
          <li>Attempt to reverse engineer, disrupt, or overload the Service.</li>
        </ul>
        <p>You are solely responsible for what your automations do and whether they comply with the terms of the sites they interact with.</p>

        <h2>5. User-Generated Content</h2>
        <p>You retain ownership of content you create, upload, or generate through the Service. You grant us a limited license to host, store, and process it as needed to operate the Service. You represent that you have all rights necessary for that content.</p>

        <h2>6. Subscriptions and Payments</h2>
        <p>Paid plans are billed on a recurring basis through Stripe. Fees are non-refundable except where required by law. You may cancel at any time; access continues through the end of the paid period. Prices may change with notice.</p>

        <h2>7. Usage Limits and Fair Use</h2>
        <p>Each plan includes monthly usage quotas (chat messages, browser tasks, code executions). We may enforce limits and rate-limits to protect Service stability.</p>

        <h2>8. Third-Party Services</h2>
        <p>The Service integrates with third-party providers (Stripe, OpenAI, Anthropic, and others). Your use of those integrations is subject to their terms.</p>

        <h2>9. Intellectual Property</h2>
        <p>The Service, including its software, design, and content, is owned by GarlicBread.ai and its licensors. Nothing in these Terms transfers ownership of that IP to you.</p>

        <h2>10. Disclaimers</h2>
        <p>THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. WE DO NOT GUARANTEE UPTIME, ACCURACY, OR FITNESS FOR A PARTICULAR PURPOSE. AI-GENERATED OUTPUT MAY BE INACCURATE OR OFFENSIVE; VERIFY BEFORE RELYING ON IT.</p>

        <h2>11. Limitation of Liability</h2>
        <p>TO THE MAXIMUM EXTENT PERMITTED BY LAW, GARLICBREAD.AI WILL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, OR FOR LOST PROFITS OR REVENUES. OUR TOTAL LIABILITY WILL NOT EXCEED THE AMOUNT YOU PAID US IN THE 12 MONTHS BEFORE THE CLAIM.</p>

        <h2>12. Indemnification</h2>
        <p>You agree to indemnify and hold GarlicBread.ai harmless from claims arising out of your use of the Service, your content, or your violation of these Terms.</p>

        <h2>13. Termination</h2>
        <p>We may suspend or terminate your access at any time, with or without notice, for violations of these Terms or for any other reason. You may stop using the Service at any time.</p>

        <h2>14. Changes</h2>
        <p>We may update these Terms. Material changes will be communicated via the Service or email. Continued use after changes constitutes acceptance.</p>

        <h2>15. Governing Law</h2>
        <p>These Terms are governed by the laws of your primary jurisdiction of operation (to be finalized by counsel). Disputes will be resolved as provided by that law.</p>

        <h2>16. Contact</h2>
        <p>Questions? Contact us at <a href="mailto:support@garlicbread.ai">support@garlicbread.ai</a>.</p>
      </article>
    </main>
  );
}