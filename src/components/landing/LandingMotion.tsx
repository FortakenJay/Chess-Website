import { useEffect } from 'react'

type LatticeMode = 'hero' | 'leak' | 'progress' | 'footer'

export function LandingMotion() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>('.landing-page')
    if (!root) return

    if (window.matchMedia('(max-width: 767px)').matches) {
      const reveals = Array.from(root.querySelectorAll<HTMLElement>('[data-mobile-reveal]'))
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        reveals.forEach((element) => element.classList.add('is-visible'))
        return
      }

      root.classList.add('landing-mobile-motion')
      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return
            entry.target.classList.add('is-visible')
            observer.unobserve(entry.target)
          })
        },
        { rootMargin: '0px 0px -10% 0px', threshold: 0.08 },
      )
      reveals.forEach((element) => observer.observe(element))

      return () => {
        observer.disconnect()
        root.classList.remove('landing-mobile-motion')
      }
    }

    let cancelled = false
    let dispose = () => {}

    const frame = requestAnimationFrame(async () => {
      const [{ default: Lenis }, { gsap }, { ScrollTrigger }, { Flip }] = await Promise.all([
        import('lenis'),
        import('gsap'),
        import('gsap/ScrollTrigger'),
        import('gsap/Flip'),
      ])

      if (cancelled) return

      const lattice = root.querySelector<HTMLElement>('.landing-lattice-global')
      if (!lattice) return

      gsap.registerPlugin(ScrollTrigger, Flip)

      const setLatticeMode = (mode: LatticeMode, animate = true) => {
        if (lattice.dataset.mode === mode) return
        const state = animate ? Flip.getState(lattice) : null
        lattice.dataset.mode = mode
        if (state) {
          Flip.from(state, {
            duration: 0.7,
            ease: 'power3.inOut',
            scale: true,
            prune: true,
            overwrite: true,
          })
        }
      }

      const mm = gsap.matchMedia()

      mm.add('(prefers-reduced-motion: no-preference) and (min-width: 768px)', () => {
        const lenis = new Lenis({
          duration: 1.1,
          easing: (value: number) => Math.min(1, 1.001 - 2 ** (-10 * value)),
        })
        const tick = (time: number) => lenis.raf(time * 1000)

        lenis.on('scroll', ScrollTrigger.update)
        gsap.ticker.add(tick)
        gsap.ticker.lagSmoothing(0)

        const context = gsap.context(() => {
          gsap.to('.landing-hand-left', {
            yPercent: 28,
            ease: 'none',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          gsap.to('.landing-hand-right', {
            yPercent: 34,
            ease: 'none',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          })
          gsap.to('#hero-head', {
            yPercent: -6,
            ease: 'none',
            scrollTrigger: {
              trigger: '#hero',
              start: 'top top',
              end: 'bottom top',
              scrub: true,
              invalidateOnRefresh: true,
            },
          })

          ScrollTrigger.create({
            trigger: '#hero',
            start: 'top 60%',
            end: 'bottom 40%',
            onEnterBack: () => setLatticeMode('hero'),
          })

          const fills = Array.from(lattice.querySelectorAll<HTMLElement>('.landing-lattice-fill'))
          const quietFills = fills.filter((fill) => !fill.parentElement?.hasAttribute('data-leak'))
          const leakFills = fills.filter((fill) => fill.parentElement?.hasAttribute('data-leak'))
          const positions = { value: 0 }
          const share = { value: 0 }
          const positionReadout = root.querySelector<HTMLElement>('[data-position-count]')
          const shareReadout = root.querySelector<HTMLElement>('[data-leak-share]')

          gsap.set(fills, { opacity: 0, scale: 0.82 })
          gsap.set('.landing-leak-result', { opacity: 0, yPercent: 18 })

          const leakTimeline = gsap.timeline()
          leakTimeline
            .to(
              positions,
              {
                value: 66858,
                duration: 0.7,
                ease: 'none',
                onUpdate: () => {
                  if (positionReadout) {
                    positionReadout.textContent = Math.round(positions.value).toLocaleString('en-US')
                  }
                },
              },
              0,
            )
            .to(
              fills,
              {
                opacity: (_, fill) =>
                  Number((fill as HTMLElement).parentElement?.dataset.rate ?? 0),
                scale: 1,
                duration: 1.2,
                ease: 'none',
                stagger: { grid: [8, 8], from: 'center', amount: 1.2 },
              },
              0,
            )
            .to(quietFills, { opacity: 0.05, duration: 0.65, ease: 'none' })
            .to(leakFills, { opacity: 1, scale: 1.06, duration: 0.65, ease: 'none' }, '<')
            .to(
              share,
              {
                value: 17.5,
                duration: 0.5,
                ease: 'none',
                onUpdate: () => {
                  if (shareReadout) shareReadout.textContent = share.value.toFixed(1)
                },
              },
              '<',
            )
            .to('.landing-leak-result', { opacity: 1, yPercent: 0, duration: 0.7, ease: 'none' }, '<0.1')

          ScrollTrigger.create({
            trigger: '#leak',
            start: 'top top',
            end: '+=220%',
            pin: '#leak-stage',
            scrub: 1,
            animation: leakTimeline,
            invalidateOnRefresh: true,
            onEnter: () => setLatticeMode('leak'),
            onEnterBack: () => setLatticeMode('leak'),
          })

          const trendPath = root.querySelector<SVGPathElement>('#trend-path')
          if (trendPath) {
            const length = trendPath.getTotalLength()
            gsap.set(trendPath, { strokeDasharray: length, strokeDashoffset: length })
            gsap.to(trendPath, {
              strokeDashoffset: 0,
              ease: 'none',
              scrollTrigger: {
                trigger: '#progress',
                start: 'top 72%',
                end: 'bottom 64%',
                scrub: true,
                invalidateOnRefresh: true,
              },
            })
          }

          ScrollTrigger.create({
            trigger: '#progress',
            start: 'top 55%',
            end: 'bottom 45%',
            onEnter: () => setLatticeMode('progress'),
            onEnterBack: () => setLatticeMode('progress'),
          })

          ScrollTrigger.create({
            trigger: '#reset',
            start: 'top 58%',
            onEnter: () => setLatticeMode('footer'),
            onLeaveBack: () => setLatticeMode('progress'),
          })

          gsap.fromTo(
            '.landing-reset-hand',
            { opacity: 0, xPercent: (_, element) => (element.classList.contains('landing-reset-hand-left') ? -24 : 24) },
            {
              opacity: 0.72,
              xPercent: (_, element) => (element.classList.contains('landing-reset-hand-left') ? -42 : 42),
              ease: 'none',
              scrollTrigger: {
                trigger: '#reset',
                start: 'top bottom',
                end: 'bottom bottom',
                scrub: true,
                invalidateOnRefresh: true,
              },
            },
          )
        }, root)

        ScrollTrigger.refresh()

        return () => {
          context.revert()
          lenis.off('scroll', ScrollTrigger.update)
          lenis.destroy()
          gsap.ticker.remove(tick)
          gsap.ticker.lagSmoothing(500, 33)
        }
      })

      mm.add('(prefers-reduced-motion: reduce)', () => {
        gsap.set('[data-anim], [data-mobile-reveal]', {
          clearProps: 'transform',
          opacity: 1,
        })

        const sections: Array<[string, LatticeMode]> = [
          ['#hero', 'hero'],
          ['#leak', 'leak'],
          ['#progress', 'progress'],
          ['#reset', 'footer'],
        ]
        const observer = new IntersectionObserver(
          (entries) => {
            const visible = entries
              .filter((entry) => entry.isIntersecting)
              .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
            const mode = visible?.target.getAttribute('data-lattice-mode') as LatticeMode | null
            if (mode) setLatticeMode(mode, false)
          },
          { threshold: [0.35, 0.55] },
        )
        sections.forEach(([selector]) => {
          const section = root.querySelector(selector)
          if (section) observer.observe(section)
        })

        return () => observer.disconnect()
      })

      dispose = () => mm.revert()
    })

    return () => {
      cancelled = true
      cancelAnimationFrame(frame)
      dispose()
    }
  }, [])

  return null
}
