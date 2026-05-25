import type { Metadata } from "next";
import "../styles/tokens.css";
import { Header } from "@/components/Header";
import { DisclaimerBar } from "@/components/DisclaimerBar";
import { AgeGate } from "@/components/AgeGate";
import { CookieConsent } from "@/components/CookieConsent";
import { MainWrapper } from "@/components/MainWrapper";

export const metadata: Metadata = {
  title: "DrawData — Lottery History, Observed",
  description:
    "Descriptive analytics for Pick 3, Pick 4, and Powerball draw history. For analysis and entertainment only — lottery draws are random and independent.",
  metadataBase: new URL("https://drawdata.example.com"),
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
