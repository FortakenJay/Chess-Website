import { Link } from '@tanstack/react-router'
import { BrandLogo } from '@/components/BrandLogo'
import { ButtonLink } from '@/components/ui/Button'
import { LandingLattice } from './LandingLattice'
import { LandingMotion } from './LandingMotion'
import './landing.css'

export function LandingPage() {
  return (
    <div className="landing-page">
      <LandingMotion />
      <LandingLattice mode="hero" className="landing-lattice-global" />
      <a
        href="#main"
        className="skip-link"
        onClick={(event) => {
          event.preventDefault()
          const main = document.getElementById('main')
          main?.focus()
          main?.scrollIntoView()
        }}
      >
        Skip to content
      </a>
      <div className="landing-noise" aria-hidden />

      <header className="landing-nav">
        <div className="landing-nav-inner">
          <BrandLogo className="landing-brand" />
          <nav aria-label="Product" className="landing-product-nav">
            <a href="#leak">Leaks</a>
            <a href="#progress">Drills</a>
            <Link to="/signup">Puzzles</Link>
            <Link to="/signup">Openings</Link>
          </nav>
          <nav aria-label="Account" className="landing-account-nav">
            <Link to="/login">Log in</Link>
            <Link to="/signup" className="landing-nav-cta">
              Connect
            </Link>
          </nav>
        </div>
      </header>

      <main id="main" tabIndex={-1}>
        <section id="hero" className="landing-hero" data-lattice-mode="hero" aria-labelledby="hero-title">
          <span className="landing-notation">1. e4</span>
          <div className="landing-hero-hands" aria-hidden>
            <img
              src="/landing-hand-left-cutout.webp"
              alt=""
              width={1241}
              height={555}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="landing-hand landing-hand-left"
              data-anim
            />
            <img
              src="/landing-hand-right-cutout.webp"
              alt=""
              width={1253}
              height={862}
              loading="eager"
              fetchPriority="high"
              decoding="async"
              className="landing-hand landing-hand-right"
              data-anim
            />
          </div>

          <div className="landing-hero-copy-position">
            <div id="hero-head" className="landing-hero-copy" data-anim>
              <h1 id="hero-title">
                You don&apos;t lose to opponents.
                <span>You lose to the same mistake, 40 times.</span>
              </h1>
              <p>Connect your account. See the mistake. Drill it away.</p>
              <div className="landing-hero-actions">
                <ButtonLink to="/signup" variant="primary" className="landing-primary-cta">
                  Connect Chess.com
                </ButtonLink>
                <ButtonLink to="/review" variant="ghost" className="landing-secondary-cta">
                  Free review
                </ButtonLink>
              </div>
            </div>
          </div>
        </section>

        <section id="leak" className="landing-leak" data-lattice-mode="leak" aria-labelledby="leak-title">
          <div id="leak-stage" className="landing-leak-stage">
            <span className="landing-notation">2. Nf3</span>
            <LandingLattice mode="leak" className="landing-lattice-mobile" />
            <div className="landing-leak-copy" data-mobile-reveal>
              <p className="landing-sample-label">ANONYMIZED SAMPLE / REAL ANALYZED GAMES</p>
              <h2 id="leak-title">Your losses have an address.</h2>
              <p className="landing-leak-intro">
                Engine analysis maps every costly move. The cluster shows what to practice first.
              </p>

              <div className="landing-position-count">
                <strong data-position-count>66,858</strong>
                <span>positions analyzed across 2,419 games</span>
              </div>

              <div className="landing-leak-result">
                <span>YOUR PRIMARY LEAK</span>
                <strong>Middlegame. Hanging piece.</strong>
                <p>
                  <b data-leak-share>17.5</b>% of classified mistakes
                </p>
              </div>
            </div>
          </div>
        </section>

        <section
          id="progress"
          className="landing-progress"
          data-lattice-mode="progress"
          aria-labelledby="progress-title"
        >
          <span className="landing-notation">3. Bb5</span>
          <div className="landing-progress-inner">
            <div className="landing-progress-copy" data-mobile-reveal>
              <h2 id="progress-title">Your worst pattern should show up less.</h2>
              <p>
                Track weekly accuracy and repeat mistakes so you always know what to drill next.
              </p>
              <ButtonLink to="/signup" variant="primary" className="landing-primary-cta">
                Connect Chess.com
              </ButtonLink>
            </div>

            <figure className="landing-trend" data-mobile-reveal>
              <figcaption>
                <span>WEEKLY ACCURACY</span>
                <strong>78.9% average</strong>
              </figcaption>
              <svg viewBox="0 0 600 260" role="img" aria-label="Six weeks of real sample accuracy data">
                <g className="landing-trend-guides" aria-hidden>
                  <line x1="0" y1="40" x2="600" y2="40" />
                  <line x1="0" y1="130" x2="600" y2="130" />
                  <line x1="0" y1="220" x2="600" y2="220" />
                </g>
                <path
                  id="trend-path"
                  d="M 10 142 C 46 142, 76 188, 126 188 S 190 132, 242 132 S 316 58, 358 58 S 430 68, 474 68 S 548 124, 590 124"
                  pathLength="1"
                />
                <g className="landing-trend-points" aria-hidden>
                  <circle cx="10" cy="142" r="5" />
                  <circle cx="126" cy="188" r="5" />
                  <circle cx="242" cy="132" r="5" />
                  <circle cx="358" cy="58" r="5" />
                  <circle cx="474" cy="68" r="5" />
                  <circle cx="590" cy="124" r="5" />
                </g>
              </svg>
              <div className="landing-trend-meta">
                <span>1,968 games</span>
                <span>57,979 positions</span>
                <span>Real sample profile</span>
              </div>
            </figure>
          </div>
        </section>

        <footer id="reset" className="landing-reset" data-lattice-mode="footer">
          <span className="landing-notation">4. #</span>
          <div className="landing-reset-hands" aria-hidden>
            <img
              src="/landing-hand-left-cutout.webp"
              alt=""
              width={1241}
              height={555}
              loading="lazy"
              decoding="async"
              className="landing-reset-hand landing-reset-hand-left"
            />
            <img
              src="/landing-hand-right-cutout.webp"
              alt=""
              width={1253}
              height={862}
              loading="lazy"
              decoding="async"
              className="landing-reset-hand landing-reset-hand-right"
            />
          </div>
          <div className="landing-reset-copy" data-mobile-reveal>
            <h2>Find the pattern. Fix the move.</h2>
            <ButtonLink to="/signup" variant="primary" className="landing-primary-cta">
              Connect Chess.com
            </ButtonLink>
          </div>
          <div className="landing-footer-row">
            <BrandLogo size="sm" className="landing-brand" />
            <nav aria-label="Footer">
              <Link to="/review">Free review</Link>
              <Link to="/preview">Preview</Link>
              <Link to="/login">Log in</Link>
            </nav>
          </div>
        </footer>
      </main>
    </div>
  )
}
