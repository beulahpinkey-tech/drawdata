import { FeedbackForm } from "@/components/FeedbackForm";

export const metadata = {
  title: "Contact & Feedback — DrawData",
  alternates: { canonical: "https://draw-data.com/contact" },
};

export default function ContactPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-12 space-y-8">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">Contact & feedback</div>
        <h1 className="mt-2 font-display text-[40px] leading-tight tracking-tight">
          What should we add next?
        </h1>
        <p className="mt-4 text-dim leading-relaxed">
          Spot a bug? Wish a chart did more? Want to see a new analytics view? Send a note. The
          form goes straight to the owner&rsquo;s inbox via{" "}
          <a href="https://web3forms.com" className="underline-offset-2 hover:underline" target="_blank" rel="noreferrer noopener">Web3Forms</a>;
          we don&rsquo;t store anything beyond what you write.
        </p>
      </header>
      <FeedbackForm />
    </div>
  );
}
