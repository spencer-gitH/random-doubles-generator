import { useId } from "react";

const HEX = "50,6 88.1,28 88.1,72 50,94 11.9,72 11.9,28";

const PIPS: [number, number][] = [
  [50, 28],
  [24.6, 50],
  [37.3, 72],
  [78.6, 44.5],
  [69.0, 61.0],
  [59.5, 77.5],
];

export default function DiceIcon({
  size = 36,
  className = "",
  state = "idle",
}: {
  size?: number;
  className?: string;
  state?: "idle" | "spin" | "static";
}) {
  const rawId = useId();
  const maskId = `dm-${rawId.replace(/:/g, "_")}`;
  const animClass =
    state === "spin" ? "dice-spin" : state === "idle" ? "dice-idle" : "";

  return (
    <span
      className={`dice-mark ${animClass} ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="dice-svg"
        aria-hidden="true"
      >
        <defs>
          <mask
            id={maskId}
            maskUnits="userSpaceOnUse"
            x="0"
            y="0"
            width="100"
            height="100"
          >
            <rect width="100" height="100" fill="white" />
            <g stroke="black" strokeWidth="3.5" strokeLinecap="butt">
              <line x1="50" y1="50" x2="11.9" y2="28" />
              <line x1="50" y1="50" x2="88.1" y2="28" />
              <line x1="50" y1="50" x2="50" y2="94" />
            </g>
            {PIPS.map(([cx, cy], i) => (
              <circle key={i} cx={cx} cy={cy} r="3.6" fill="black" />
            ))}
          </mask>
        </defs>
        <polygon points={HEX} fill="currentColor" mask={`url(#${maskId})`} />
      </svg>
    </span>
  );
}
