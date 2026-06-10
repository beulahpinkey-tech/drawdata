import type { Metadata } from "next";
import "../styles/tokens.css";
import { Header } from "@/components/Header";
import { SiteFooter } from "@/components/SiteFooter";
import { BallfieldMount } from "@/components/3d/BallfieldMount";
import { AgeGate } from "@/components/AgeGate";
import { CookieConsent } from "@/components/CookieConsent";
import { MainWrapper } from "@/components/MainWrapper";

export const metadata: Metadata = {
  metadataBase: new URL("https://draw-data.com"),
  title: {
    default: "DrawData — Pick 3, Pick 4, Powerball & Mega Millions History",
    template: "%s — DrawData",
  },
  description:
    "Free interactive analytics on every Powerball, Mega Millions, Pick 3 and Pick 4 draw from Wisconsin, Pennsylvania, New Jersey, and Texas. Frequency, gaps, sums, pairs, and a transparent Formula Lab — descriptive only, no predictions.",
  alternates: {
    canonical: "https://draw-data.com",
  },
  keywords: [
    "drawdata",
    "draw data",
    "draw-data",
    "lottery analytics",
    "lottery frequency",
    "powerball history",
    "powerball winning numbers",
    "mega millions history",
    "mega millions winning numbers",
    "pick 3 numbers",
    "pick 4 numbers",
    "wisconsin lottery pick 3",
    "pennsylvania pick 3 history",
    "new jersey pick 3 history",
    "texas pick 3 history",
    "texas daily 4 history",
  ],
  authors: [{ name: "DrawData" }],
  openGraph: {
    type: "website",
    title: "DrawData — Lottery Draw Analytics",
    description:
      "Descriptive analytics for Powerball, Mega Millions, and state Pick 3 / Pick 4 games. Frequency, gaps, sums, pairs, and a transparent backtester.",
    siteName: "DrawData",
    url: "https://draw-data.com",
    locale: "en_US",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "DrawData — Powerball, Mega Millions, Pick 3 & Pick 4 history",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "DrawData — Lottery Draw Analytics",
    description:
      "Powerball, Mega Millions, Pick 3 and Pick 4 history with frequency, gaps, and an honest formula backtester.",
    images: ["/og-image.svg"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
};

// JSON-LD structured data. Two top-level types so Google understands
// (a) this is a website with a Sitelinks Search Box candidate, and
// (b) "DrawData" is the publisher behind the data — both improve how
// our results render in SERPs and feed brand-name disambiguation
// ("draw-data.com" → this site, not the eponymous Excel template).
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "DrawData",
  alternateName: ["draw-data.com", "Draw Data"],
  url: "https://draw-data.com",
  description:
    "Free interactive analytics on Powerball, Mega Millions, and state Pick 3 / Pick 4 winning numbers. Descriptive only — no predictions.",
  publisher: { "@id": "https://draw-data.com/#org" },
  potentialAction: {
    "@type": "SearchAction",
    target: "https://draw-data.com/picker?q={search_term_string}",
    "query-input": "required name=search_term_string",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  "@id": "https://draw-data.com/#org",
  name: "DrawData",
  url: "https://draw-data.com",
  logo: "https://draw-data.com/og-image.svg",
  sameAs: ["https://github.com/beulahpinkey-tech/drawdata"],
  description:
    "DrawData publishes descriptive analytics on US lottery draw history — Powerball, Mega Millions, and state Pick 3 / Pick 4 games across Wisconsin, Pennsylvania, New Jersey, Texas, and North Carolina.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin=""
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600;9..144,700&family=Hanken+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
      </head>
      <body className="grain">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        {/* Site-wide scroll-driven 3D lottery-ball field. Fixed, z-0,
            pointer-events-none — sits behind the z-10 content wrapper
            on every route. Balls reveal one-by-one with scroll. */}
        <BallfieldMount />
        <AgeGate />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <MainWrapper>{children}</MainWrapper>
          <SiteFooter />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
