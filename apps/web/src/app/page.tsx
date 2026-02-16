'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import styles from './page.module.css'
import FireplaceLibrary from './components/FireplaceLibrary'

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.5, type: 'tween' as const },
  }),
}

const stagger = {
  visible: { transition: { staggerChildren: 0.1 } },
}

const steps = [
  {
    num: '01',
    title: 'Upload your document',
    desc: 'Drop a PDF, DOCX, TXT, or paste a link. We handle scanned and handwritten documents too.',
  },
  {
    num: '02',
    title: 'We process and index it',
    desc: 'Your document is split into sections, embedded, and indexed for fast retrieval. This takes seconds.',
  },
  {
    num: '03',
    title: 'Ask anything',
    desc: 'Chat with your document in plain language. Ask about clauses, risks, deadlines, obligations.',
  },
  {
    num: '04',
    title: 'Get cited answers',
    desc: 'Every response references the exact section or clause. You can verify every claim instantly.',
  },
]

export default function LandingPage() {
  const scrollToHow = (e: React.MouseEvent) => {
    e.preventDefault()
    document.getElementById('how-it-works')?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <main className={styles.main}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <span className={styles.logo}>PatraSaar</span>
          <div className={styles.navLinks}>
            <a href="#how-it-works" onClick={scrollToHow} className={styles.navLinkGold}>How It Works</a>
            <Link href="/login" className={styles.loginButton}>
              Sign In
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} aria-hidden="true" />
        <div className={styles.heroGlowSecondary} aria-hidden="true" />

        <motion.div
          className={styles.heroContent}
          initial="hidden"
          animate="visible"
          variants={stagger}
        >
          <motion.p className={styles.eyebrow} variants={fadeUp} custom={0}>
            AI-powered legal document analysis
          </motion.p>
          <motion.h1 className={styles.headline} variants={fadeUp} custom={1}>
            Legal Clarity,
            <br />
            <span className={styles.headlineAccent}>Distilled.</span>
          </motion.h1>
          <motion.p className={styles.subheadline} variants={fadeUp} custom={2}>
            Upload Indian legal documents and get plain-language explanations backed by source
            citations. Contracts, FIRs, court orders, notices. All simplified.
          </motion.p>
          <motion.div className={styles.ctas} variants={fadeUp} custom={3}>
            <Link href="/login" className={styles.primaryCta}>
              Upload Document
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" suppressHydrationWarning>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
            <a
              href="https://github.com/ab1nv/patra-saar"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.githubCta}
              aria-label="View source on GitHub"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" suppressHydrationWarning>
                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
              </svg>
            </a>
          </motion.div>

          <motion.div className={styles.stats} variants={fadeUp} custom={4}>
            <div className={styles.stat}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>Free</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>10MB</span>
              <span className={styles.statLabel}>100 pages limit</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>Cited</span>
              <span className={styles.statLabel}>Every answer</span>
            </div>
          </motion.div>
        </motion.div>

        {/* Fireplace Library SVG -- right side */}
        <motion.div
          className={styles.heroIllustration}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6, duration: 0.8 }}
        >
          <FireplaceLibrary />
        </motion.div>
      </section>

      {/* How It Works */}
      <section className={styles.howItWorks} id="how-it-works">
        <div className={styles.sectionInner}>
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            How It Works
          </motion.h2>
          <div className={styles.stepsGrid}>
            {steps.map((step, i) => (
              <motion.div
                key={step.num}
                className={styles.stepCard}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.1, duration: 0.45 }}
                whileHover={{ y: -4, transition: { duration: 0.2 } }}
              >
                <span className={styles.stepNum}>{step.num}</span>
                <h3 className={styles.stepTitle}>{step.title}</h3>
                <p className={styles.stepDesc}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.sectionInner}>
          <motion.h2
            className={styles.sectionTitle}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-80px' }}
            transition={{ duration: 0.5 }}
          >
            Built for Indian Legal Documents
          </motion.h2>
          <div className={styles.featuresGrid}>
            {[
              {
                icon: '📄',
                title: 'Upload Anything',
                desc: 'PDF, DOCX, TXT, scanned images, or a link. We parse it all into readable text, including handwritten and photographed documents.',
              },
              {
                icon: '💬',
                title: 'Ask Questions',
                desc: 'Chat with your documents like you would with a lawyer. Ask about clauses, risks, obligations, or anything else.',
              },
              {
                icon: '📌',
                title: 'Cited Answers',
                desc: 'Every response references the exact section, clause, or page. Nothing is made up. You can verify every claim.',
              },
              {
                icon: '🆓',
                title: 'Completely Free',
                desc: 'No subscriptions, no hidden costs. PatraSaar is free to use for everyone.',
              },
            ].map((feat, i) => (
              <motion.article
                key={feat.title}
                className={styles.featureCard}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                whileHover={{ borderColor: 'var(--accent-primary)', transition: { duration: 0.2 } }}
              >
                <span className={styles.featureIcon}>{feat.icon}</span>
                <h3>{feat.title}</h3>
                <p>{feat.desc}</p>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <motion.div
          className={styles.sectionInner}
          initial={{ opacity: 0, scale: 0.97 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <h2 className={styles.ctaTitle}>Ready to simplify your legal documents?</h2>
          <p className={styles.ctaDesc}>Upload your first document and start asking questions in seconds. No credit card needed.</p>
          <Link href="/login" className={styles.primaryCta}>
            Start Now
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" suppressHydrationWarning>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </motion.div>
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
