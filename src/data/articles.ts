/**
 * Resource center articles — practical guides tied to real listings.
 * Editorial rules (see /editorial-policy): short sentences, specific
 * advice, no unsupported claims about companies, every article connects
 * to live listings and category/city pages.
 */

export interface ArticleSection {
  heading: string;
  body: string[]; // paragraphs
}

export interface Article {
  slug: string;
  title: string;
  excerpt: string;
  category: 'Guides' | 'By city' | 'Owner stories' | 'How CrossLinkd works';
  publishedDaysAgo: number;
  updatedDaysAgo?: number;
  hue: number;
  sections: ArticleSection[];
  relatedListingSlugs: string[];
  relatedCategory?: { label: string; href: string };
  relatedCity?: { label: string; href: string };
}

export const ARTICLES: Article[] = [
  {
    slug: 'hire-christian-plumber-fort-worth',
    title: 'Hiring a Christian-owned plumber in Fort Worth: a 6-point checklist',
    excerpt: 'Licensing, flat-rate quotes, warranty terms, and the faith questions worth asking before you book.',
    category: 'By city',
    publishedDaysAgo: 21,
    hue: 210,
    sections: [
      {
        heading: 'Start with the license, not the label',
        body: [
          'Texas licenses plumbers through the Texas State Board of Plumbing Examiners. Ask for the license number and look it up — it takes two minutes. Every contractor listing on CrossLinkd shows a credential-check date when the license has been verified.',
          'A "Christian-owned" label never replaces a license. It tells you who owns the company, not how well they do the work. Check both.',
        ],
      },
      {
        heading: 'Ask for the quote in writing',
        body: [
          'Reputable shops give flat-rate or written estimates before touching a wrench. Cornerstone Plumbing Co. publishes its flat-rate menu and explains every invoice line by line — that transparency matters more than any slogan.',
          'Get two quotes for jobs over $500. Paying for the cheapest bid often costs more the second time.',
        ],
      },
      {
        heading: 'Warranty and service area',
        body: [
          'Ask what the warranty covers and for how long. Ask whether they charge a trip fee outside their normal service area. Profiles on CrossLinkd list the service area so you can check before you call.',
          'For church and nonprofit buildings, ask about maintenance plans. Several DFW shops offer priority response for ministry facilities.',
        ],
      },
      {
        heading: 'The faith questions worth asking',
        body: [
          'If faith is why you are choosing this plumber, ask directly: "What does being Christian-owned mean for how you run the company?" You are listening for specifics — how they treat employees, handle mistakes, and price work.',
          'See our guide to ownership labels for the difference between Christian-owned, faith-inspired, and founded-by-a-Christian.',
        ],
      },
    ],
    relatedListingSlugs: ['cornerstone-plumbing', 'trinity-auto-works'],
    relatedCategory: { label: 'Plumbers', href: '/search?q=plumber' },
    relatedCity: { label: 'Fort Worth, TX', href: '/locations/fort-worth-tx' },
  },
  {
    slug: 'choose-christian-accountant-nashville',
    title: 'Choosing a Christian accountant or bookkeeper in Nashville',
    excerpt: 'Credentials to confirm, fee structures explained, and when a faith-focused firm actually matters for your taxes.',
    category: 'By city',
    publishedDaysAgo: 14,
    hue: 200,
    sections: [
      {
        heading: 'Confirm the credential',
        body: [
          'CPAs are licensed by the state. Enrolled Agents are licensed by the IRS. Bookkeepers may hold certifications but are not licensed — fine for monthly books, less relevant for complex filings.',
          'On CrossLinkd, accounting listings show which credential was verified and when. If a profile lacks a credential badge, ask the firm directly.',
        ],
      },
      {
        heading: 'Understand the fees before you sign',
        body: [
          'Individual returns are usually flat-fee. Business clients are usually hourly or monthly. Ask what triggers extra charges — amended returns, notices, and year-end cleanup are the usual three.',
          'Cedar Ledger Bookkeeping publishes starting rates on its profile, which is a good sign. Firms that hide pricing are harder to hold accountable.',
        ],
      },
      {
        heading: 'When does faith focus matter?',
        body: [
          'Honest math is honest math. What a faith-focused firm changes is counsel: they will tell you when a plan is legal but unwise, and they are used to clients tithing, giving, and running ministries alongside businesses.',
          'Ask prospective accountants how they handle giving records and clergy housing allowances. The good ones answer without blinking.',
        ],
      },
    ],
    relatedListingSlugs: ['cedar-ledger-bookkeeping', 'beacon-cpa-dallas'],
    relatedCategory: { label: 'Accounting & tax', href: '/industries/accounting-tax' },
    relatedCity: { label: 'Nashville, TN', href: '/locations/nashville-tn' },
  },
  {
    slug: 'questions-before-trusting-christian-label',
    title: '5 questions to ask before you trust a "Christian" label',
    excerpt: 'Christian-owned, faith-inspired, founded by a Christian — the words mean different things. Here is how to tell them apart.',
    category: 'Guides',
    publishedDaysAgo: 35,
    updatedDaysAgo: 6,
    hue: 36,
    sections: [
      {
        heading: '1. Who owns it today?',
        body: [
          'A company can be founded by a Christian and sold years ago. "Christian-owned" is a claim about current ownership — who profits from it and sets its direction. CrossLinkd verifies ownership with a signed attestation plus evidence, and shows the date.',
        ],
      },
      {
        heading: '2. Who runs it day to day?',
        body: [
          'Ownership and operation can differ. A Christian-operated business may be owned by a holding company but led by believers who set hiring, service, and pricing practices. If day-to-day conduct matters to you, ask who manages the team.',
        ],
      },
      {
        heading: '3. Is it faith-inspired, faith-operated, or just faith-branded?',
        body: [
          'Faith-inspired usually means values come from faith. Faith-operated means practices do too — closed Sundays, chaplaincy programs, giving commitments. Faith-branded means the website says so. Look for practices, not adjectives.',
        ],
      },
      {
        heading: '4. Is a church standing behind it?',
        body: [
          'Church-recommended means a congregation publicly endorses the business — usually a member in good standing whose work the church has seen firsthand. It is the strongest community signal, but it is still a human opinion, not a doctrine check.',
        ],
      },
      {
        heading: '5. Does the label change the work?',
        body: [
          'Read the reviews for execution: did they show up, communicate, fix mistakes? Verification badges confirm identity and licenses. Reviews — moderated under our published policy — tell you how the company actually treats people.',
        ],
      },
    ],
    relatedListingSlugs: ['good-samaritan-auto', 'mercy-well-counseling', 'grace-and-grain-bakery'],
    relatedCategory: { label: 'How verification works', href: '/verification' },
  },
  {
    slug: 'owner-interview-grace-and-grain',
    title: 'Owner interview: baking with prayer at Grace & Grain',
    excerpt: 'The Whitakers on 4 a.m. starts, wedding cakes, why they close Sundays, and what "Christian-owned" costs them.',
    category: 'Owner stories',
    publishedDaysAgo: 9,
    hue: 36,
    sections: [
      {
        heading: 'Why close on Sundays?',
        body: [
          '"People think we are leaving money on the table," Aaron Whitaker says, pulling the first sourdough of the day. "We are. On purpose. Sunday is for worship and rest, and my staff knows they can plan their lives around it."',
          'Grace & Grain turns away roughly a dozen weekend orders a month because of the policy. The Whitakers say regulars plan around it too.',
        ],
      },
      {
        heading: 'What faith looks like at 4 a.m.',
        body: [
          'The team prays before the ovens go on. Not every employee is a Christian — "they know who we are when we hire them, and we do not hide it" — and the bakeshop donates day-old bread to shelters every evening.',
          '"The donation is not a strategy," Aaron says. "It is just what we do with the extra."',
        ],
      },
      {
        heading: 'Advice to owners listing on CrossLinkd',
        body: [
          '"Fill out the whole profile," Julie says. "Hours, service area, photos. People call when they trust the page. Half our wedding inquiries mention the reviews by name."',
          'Grace & Grain has been verified since May 2026 — the badge on their profile shows the date, and they re-attest yearly.',
        ],
      },
    ],
    relatedListingSlugs: ['grace-and-grain-bakery', 'loaves-fishes-catering', 'redeemer-coffee-house'],
    relatedCategory: { label: 'Bakeries', href: '/search?q=bakery' },
    relatedCity: { label: 'Dallas, TX', href: '/locations/dallas-tx' },
  },
  {
    slug: 'vetting-a-contractor-who-shares-your-values',
    title: 'Vetting a contractor who shares your values: 7 questions',
    excerpt: 'From pull permits to change orders — the questions that protect your project, whatever the billboard says.',
    category: 'Guides',
    publishedDaysAgo: 28,
    hue: 95,
    sections: [
      {
        heading: 'The seven questions',
        body: [
          '1. Will you pull the permits? (A "no" ends the interview.)',
          '2. Who is on site every day — you or a subcontractor chain?',
          '3. What is your change-order process, in writing?',
          '4. Can I call the last three clients?',
          '5. What is the payment schedule? (Never pay everything up front.)',
          '6. Is your license and insurance current? CrossLinkd shows the verification date on contractor profiles.',
          '7. What does your warranty cover after you drive away?',
        ],
      },
      {
        heading: 'Where faith fits in',
        body: [
          'Shared values help most when the project hits trouble — and something always does. A contractor who answers question 3 without hesitation usually handles problems the same way they handle framing: carefully.',
          'Peachtree Craftsmen in Atlanta includes a change-order template in its welcome packet. That is the level of process you are looking for.',
        ],
      },
    ],
    relatedListingSlugs: ['peachtree-craftsmen', 'true-north-remodels', 'anchor-roofing-fort-worth'],
    relatedCategory: { label: 'Contractors', href: '/search?type=contractor' },
  },
  {
    slug: 'how-crosslinkd-verifies-a-business',
    title: 'How a business gets verified on CrossLinkd',
    excerpt: 'The exact steps from submission to badge: what owners send us, what a human checks, and when we say no.',
    category: 'How CrossLinkd works',
    publishedDaysAgo: 42,
    updatedDaysAgo: 4,
    hue: 160,
    sections: [
      {
        heading: 'Step 1 — Submission',
        body: [
          'An owner submits the listing with contact details, hours, license numbers (if any), and an ownership attestation for the Christian-owned badge. Submission is free. Nothing is published automatically.',
        ],
      },
      {
        heading: 'Step 2 — Human review',
        body: [
          'A moderator checks the basics first: real address or service area, working phone, live website, no duplicates. Listings that fail are told exactly why and may fix and resubmit.',
          'For credential badges, we check license numbers with the issuing authority where records are public. For the Christian-owned badge, we review the attestation against supporting evidence: about pages, business registrations, church membership, or a short call.',
        ],
      },
      {
        heading: 'Step 3 — Badge with a date',
        body: [
          'Approved listings show the badge and the date it was granted, for example "Verified Christian-owned · Aug 2026." Badges are re-checked periodically; owners re-attest yearly. If a business is sold or a license lapses, the badge comes off.',
        ],
      },
      {
        heading: 'What verification is not',
        body: [
          'It is not a doctrine test, a character guarantee, or a promise of future conduct. It is an identity and evidence check at a point in time, published with the date so you can judge how fresh it is. Paying for a premium listing does not skip any step — the two are separate, on purpose.',
        ],
      },
    ],
    relatedListingSlugs: ['mercy-well-counseling', 'cornerstone-plumbing', 'sola-gratia-realty'],
    relatedCategory: { label: 'Verification & badges', href: '/verification' },
  },
];

export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
