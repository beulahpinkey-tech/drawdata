type Props = {
  value: number | string;
  variant?: "digit" | "white" | "red" | "muted";
  size?: "sm" | "md" | "lg";
};

const SIZES = {
  sm: "h-7 w-7 text-[12px]",
  md: "h-9 w-9 text-[14px]",
  lg: "h-12 w-12 text-[18px]",
};

export function NumberBall({ value, variant = "white", size = "md" }: Props) {
  const styles =
    variant === "digit"
      ? "bg-gradient-to-b from-white/[0.10] to-white/[0.04] text-text border-edge"
      : variant === "white"
      ? "bg-gradient-to-b from-white/[0.12] to-white/[0.04] text-text border-edge"
      : variant === "red"
      ? "bg-gradient-to-b from-hot/30 to-hot/10 text-text border-hot/50"
      : "bg-transparent text-dim border-edge";
  return (
    <div
      className={`inline-flex items-center justify-center rounded-full border font-mono tabular-nums transition-all duration-150 hover:scale-110 hover:shadow-[0_0_12px_rgba(233,184,74,0.25)] ${SIZES[size]} ${styles}`}
    >
      {value}
    </div>
  );
}
