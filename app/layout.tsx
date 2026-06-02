import type { Metadata } from "next";
import "../styles/tokens.css";
import { Header } from "@/components/Header";
import { DisclaimerBar } from "@/components/DisclaimerBar";
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
    "Free interactive analytics on every Powerball, Mega Millions, Pick 3 and Pick 4 draw from Wisconsin, Pennsylvania, and New Jersey. Frequency, gaps, sums, pairs, and a transparent Formula Lab — descriptive only, no predictions.",
  keywords: [
    "powerball history",
    "mega millions history",
    "pick 3 numbers",
    "pick 4 numbers",
    "lottery analytics",
    "lottery frequency",
    "pick 3 history pennsylvania",
    "pick 3 history new jersey",
    "wisconsin lottery pick 3",
    "powerball winning numbers",
    "mega millions winning numbers",
  ],
  authors: [{ name: "DrawData" }],
  openGraph: {
    type: "website",
    title: "DrawData — Lottery Draw Analytics",
    description:
      "Descriptive analytics for Powerball, Mega Millions, and state Pick 3 / Pick 4 games. Frequency, gaps, sums, pairs, and a transparent backtester.",
    siteName: "DrawData",
  },
  twitter: {
    card: "summary_large_image",
    title: "DrawData — Lottery Draw Analytics",
    description:
      "Powerball, Mega Millions, Pick 3 and Pick 4 history with frequency, gaps, and an honest formula backtester.",
  },
  robots: { index: true, follow: true },
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
      </head>
      <body className="grain">
        <a href="#main-content" className="skip-link">Skip to main content</a>
        <AgeGate />
        <div className="relative z-10 flex min-h-screen flex-col">
          <Header />
          <MainWrapper>{children}</MainWrapper>
          <DisclaimerBar />
        </div>
        <CookieConsent />
      </body>
    </html>
  );
}
