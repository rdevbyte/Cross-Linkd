/**
 * Resource center articles — practical guides. Do not invent businesses,
 * reviews, credentials, or verification results. See /editorial-policy.
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
          'Texas licenses plumbers through the Texas State Board of Plumbing Examiners. Ask for the license number and look it up yourself. CrossLinkd does not confirm licenses.',
          'A "Christian-owned" label on this directory is owner-submitted. It does not tell you how well the company does the work. Check both the license and the work.',
        ],
      },
      {
        heading: 'Ask for the quote in writing',
        body: [
          'Reputable shops give flat-rate or written estimates before touching a wrench. Ask for the menu or the invoice lines in writing. Do not treat a directory profile as that proof.',
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
    relatedListingSlugs: [],
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
          'CrossLinkd does not show a credential-verified badge. Ask the firm for the license or enrollment number and check it with the state board or the IRS.',
        ],
      },
      {
        heading: 'Understand the fees before you sign',
        body: [
          'Individual returns are usually flat-fee. Business clients are usually hourly or monthly. Ask what triggers extra charges — amended returns, notices, and year-end cleanup are the usual three.',
          'Ask for starting rates in writing. Firms that will not explain pricing are harder to hold accountable. Do not assume a directory profile has published rates unless you can see them on that listing.',
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
    relatedListingSlugs: [],
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
          'A company can be founded by a Christian and sold years ago. "Christian-owned" is a claim about current ownership. On CrossLinkd that claim is self-identified. CrossLinkd does not independently confirm it.',
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
          'A church member or neighbor may recommend a business. On CrossLinkd, that kind of note is community reported. It is an opinion, not a CrossLinkd investigation or a doctrinal seal.',
        ],
      },
      {
        heading: '5. Does the label change the work?',
        body: [
          'Read reviews for execution: did they show up, communicate, and fix mistakes? Reviews on CrossLinkd are community reported. They are not a verification of identity or licenses. Check those yourself.',
        ],
      },
    ],
    relatedListingSlugs: [],
    relatedCategory: { label: 'Listing Statuses', href: '/listing-statuses' },
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
          '6. Is your license and insurance current? Ask for the documents. CrossLinkd does not show a license verification date.',
          '7. What does your warranty cover after you drive away?',
        ],
      },
      {
        heading: 'Where faith fits in',
        body: [
          'Shared values help most when the project hits trouble — and something always does. A contractor who answers question 3 without hesitation usually handles problems the same way they handle framing: carefully.',
          'Ask for a written change-order template before the work starts. That process matters more than a faith label on a directory profile.',
        ],
      },
    ],
    relatedListingSlugs: [],
    relatedCategory: { label: 'Contractors', href: '/search?type=contractor' },
  },
  {
    slug: 'how-crosslinkd-verifies-a-business',
    title: 'What CrossLinkd does not verify',
    excerpt: 'Listings are owner-submitted. CrossLinkd does not independently verify faith, ownership, licenses, credentials, or service quality.',
    category: 'How CrossLinkd works',
    publishedDaysAgo: 42,
    updatedDaysAgo: 0,
    hue: 160,
    sections: [
      {
        heading: 'Owner-submitted',
        body: [
          'An owner can submit a listing for free and may identify the business as Christian-owned. That identification is theirs. CrossLinkd does not independently confirm it.',
        ],
      },
      {
        heading: 'Completeness is not a background check',
        body: [
          'CrossLinkd may review a submission for missing fields and obvious inconsistencies. That review does not confirm faith, ownership, licenses, certifications, credentials, or service quality.',
          'If a profile mentions a license, ask the business for the number and check it with the issuing authority yourself.',
        ],
      },
      {
        heading: 'There is no Verified badge',
        body: [
          'CrossLinkd does not publish a generic Verified badge, a credential-verified badge, or a Christian-ownership-confirmed badge. Owner claimed means someone showed control of a contact channel. It does not mean the business was investigated.',
        ],
      },
      {
        heading: 'Do your own diligence',
        body: [
          'Read the profile as owner-submitted information. Contact the business. Check licenses, insurance, and references before you hire or support the organization. Listing on CrossLinkd is not an endorsement.',
        ],
      },
    ],
    relatedListingSlugs: [],
    relatedCategory: { label: 'Listing Statuses', href: '/listing-statuses' },
  },
];

export const articleBySlug = (slug: string) => ARTICLES.find((a) => a.slug === slug);
