/**
 * Unicorn Factory — Brand Copy (single source of truth)
 *
 * Product name, positioning, and the high-visibility marketing strings.
 * Screens import from here instead of hardcoding strings like "Unicorn
 * Factory" or the landing headline — see brand.md for the full rationale
 * and the FR-D2 rule this enforces (no brand literals in screens).
 */

export const product = {
  name: 'Unicorn Factory',
  shortName: 'Unicorn Factory',
  tagline: 'Your idea, engineered — live in 72 hours.',
  positioning:
    'The engineering studio that turns a validated idea into a live, owned MVP — refined free, built for a fixed price, yours in under 72 hours.',
  metaDescription:
    'Refine your idea with us for free. When the Blueprint is right, we engineer your MVP — delivered in under 72 hours — then hand it over, or keep running it for you.',
} as const;

export const nav = {
  signIn: 'Sign In',
  signOut: 'Sign out',
} as const;

export const landing = {
  eyebrow: 'Idea → Owned MVP',
  headline: 'Your idea, engineered — live in 72 hours.',
  subhead:
    'Refine it with us for free. When the Blueprint is right, we build your MVP for a fixed price and hand you the keys — code, app, and IP, yours outright.',
  primaryCta: 'Start Your Blueprint',
  howItWorksTitle: 'From idea to ignition',
  steps: [
    {
      title: 'Refine, for free',
      description:
        'Work through The Workshop with us. Walk away with a Blueprint — a validated idea, a build roadmap, and a firm-price estimate. No commitment.',
    },
    {
      title: 'We forge it',
      description:
        'Commission the build. After a quick Green-Light review to lock the price, we engineer your MVP end-to-end and ship it to a live URL — in under 72 hours.',
    },
    {
      title: 'It’s yours',
      description:
        'Test-drive it in the Proving Ground, then take full Handover — code, app, database, and IP transferred to your own accounts — or let us run it for you.',
    },
  ],
  emailCapture: {
    title: 'Stay ahead of the queue',
    subhead: 'Get notified as we open new build slots.',
    placeholder: 'you@example.com',
    ctaIdle: 'Notify Me',
    ctaLoading: 'Saving…',
    ctaDone: 'Done!',
    successMessage: "You're on the list. We'll be in touch!",
  },
  footer: (year: number) => `© ${year} Unicorn Factory. Built to be owned.`,
} as const;

/**
 * Voice & tone reference for anyone writing new copy (see brand.md for the
 * full do/don't table). Kept here as a lightweight machine-readable anchor.
 */
export const voice = {
  adjectives: ['Precise', 'Confident', 'Warm', 'Direct', 'Un-hyped'],
  avoid: ['revolutionary', 'game-changing', '10x', 'instant', 'magic', 'synergy'],
} as const;
