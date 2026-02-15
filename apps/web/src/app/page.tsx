import Link from 'next/link'
import styles from './page.module.css'

export default function LandingPage() {
  return (
    <main className={styles.main}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.logo}>PatraSaar</span>
          <Link href="/login" className={styles.loginButton}>
            Sign In
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroContent}>
          <p className={styles.eyebrow}>AI-powered legal document analysis</p>
          <h1 className={styles.headline}>
            Legal Clarity,
            <br />
            <span className={styles.headlineAccent}>Distilled.</span>
          </h1>
          <p className={styles.subheadline}>
            Upload Indian legal documents and get plain-language explanations backed by source
            citations. Contracts, FIRs, court orders, notices. All simplified.
          </p>
          <div className={styles.ctas}>
            <Link href="/login" className={styles.primaryCta}>
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.featuresGrid}>
          <article className={styles.featureCard}>
            <h3>Upload Anything</h3>
            <p>
              PDF, DOCX, TXT, scanned images, or a link. We parse it all into readable text,
              including handwritten and photographed documents.
            </p>
          </article>
          <article className={styles.featureCard}>
            <h3>Ask Questions</h3>
            <p>
              Chat with your documents like you would with a lawyer. Ask about clauses, risks,
              obligations, or anything else.
            </p>
          </article>
          <article className={styles.featureCard}>
            <h3>Cited Answers</h3>
            <p>
              Every response references the exact section, clause, or page. Nothing is made up.
              You can verify every claim.
            </p>
          </article>
          <article className={styles.featureCard}>
            <h3>Completely Free</h3>
            <p>
              No subscriptions, no hidden costs. PatraSaar is free to use for everyone.
            </p>
          </article>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <p className={styles.disclaimer}>
            PatraSaar provides legal information for educational purposes only. This service does
            not constitute legal advice. For specific legal matters, consult a qualified lawyer.
          </p>
          <p className={styles.copyright}>PatraSaar, 2026</p>
        </div>
      </footer>
    </main>
  )
}
