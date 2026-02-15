'use client'

import Link from 'next/link'
import Image from 'next/image'
import { motion } from 'framer-motion'
import styles from './page.module.css'

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
  return (
    <main className={styles.main}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.logoGroup}>
            <Image src="/logo.png" alt="PatraSaar" width={32} height={32} className={styles.logoImg} priority suppressHydrationWarning />
            <span className={styles.logo}>PatraSaar</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#how-it-works" className={styles.navLink}>How It Works</a>
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
              Get Started Free
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true" suppressHydrationWarning>
                <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </Link>
          </motion.div>

          <motion.div className={styles.stats} variants={fadeUp} custom={4}>
            <div className={styles.stat}>
              <span className={styles.statValue}>100%</span>
              <span className={styles.statLabel}>Free</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>10MB</span>
              <span className={styles.statLabel}>Max upload</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.stat}>
              <span className={styles.statValue}>Cited</span>
              <span className={styles.statLabel}>Every answer</span>
            </div>
          </motion.div>
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
