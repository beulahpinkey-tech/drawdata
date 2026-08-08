import { PickerView } from "./PickerView";

export const metadata = {
  title: "Choose what to explore — DrawData",
  alternates: { canonical: "https://draw-data.com/picker" },
};

export default function PickerPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 space-y-10">
      <header>
        <div className="text-[11px] uppercase tracking-[0.2em] text-dim font-mono">Choose what to explore</div>
        <h1 className="mt-2 font-display text-[42px] sm:text-[48px] leading-tight tracking-tight">
          Where would you like to dig?
        </h1>
        <p className="mt-3 text-dim leading-relaxed max-w-3xl">
          Pick a national game to enter directly, or pick a state for its daily Pick 3 / Pick 4 history.
          You can change this any time from the header. Descriptive analytics only — no predictions.
        </p>
      </header>
      <PickerView />
    </div>
  );
}
