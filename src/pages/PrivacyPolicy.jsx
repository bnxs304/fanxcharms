import './PolicyPage.css'

export default function PrivacyPolicy() {
  return (
    <div className="policy-page">
      <h1 className="policy-page__title">Privacy Policy</h1>
      <p className="policy-page__updated">Last updated: March 2025</p>

      <section className="policy-page__section">
        <h2>Who we are</h2>
        <p>
          Fan X Charms (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) operates this website and is the data controller
          for the personal data we collect when you shop or get in touch.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>What data we collect</h2>
        <p>We may collect and process:</p>
        <ul>
          <li><strong>Order and contact details</strong> — name, email address, delivery address, and phone number when you place an order.</li>
          <li><strong>Payment information</strong> — payment is processed by Stripe. We do not store your full card number; Stripe&apos;s use of data is governed by their privacy policy.</li>
          <li><strong>Usage data</strong> — how you use the site (e.g. device, browser, pages visited) to improve our service and security.</li>
          <li><strong>Communications</strong> — when you contact us, we keep a record of the correspondence.</li>
        </ul>
      </section>

      <section className="policy-page__section">
        <h2>How we use your data</h2>
        <p>We use your data to:</p>
        <ul>
          <li>Process and fulfil orders and send order confirmations and updates.</li>
          <li>Communicate with you about your order, returns, or enquiries.</li>
          <li>Comply with legal obligations and protect against fraud.</li>
          <li>Improve our website and services (e.g. analytics, troubleshooting).</li>
        </ul>
      </section>

      <section className="policy-page__section">
        <h2>Legal basis</h2>
        <p>
          We process your data on the basis of: performing our contract with you (orders and delivery),
          your consent where we ask for it (e.g. marketing), and our legitimate interests (security,
          improving our service) where appropriate.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Sharing your data</h2>
        <p>
          We may share data with: payment providers (Stripe), delivery and logistics partners, and
          cloud/hosting and email services that help us run the site. We do not sell your personal data.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Retention</h2>
        <p>
          We keep order and contact data for as long as needed to fulfil orders, handle returns and
          disputes, and comply with legal requirements (e.g. tax and consumer law).
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Your rights</h2>
        <p>
          Depending on applicable law (e.g. UK GDPR), you may have the right to access, correct, delete,
          or restrict processing of your data, and to object or withdraw consent. To exercise these
          rights or ask questions, contact us using the details on this site.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Cookies and similar tech</h2>
        <p>
          We may use cookies and similar technologies for essential operation, security, and to understand
          how the site is used. You can adjust your browser settings to manage cookies.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Changes</h2>
        <p>
          We may update this policy from time to time. The &quot;Last updated&quot; date at the top will change
          when we do. Continued use of the site after changes constitutes acceptance of the updated policy.
        </p>
      </section>

      <section className="policy-page__section">
        <h2>Contact</h2>
        <p>
          For privacy-related questions or requests, please contact us using the details provided on
          our website.
        </p>
      </section>
    </div>
  )
}
