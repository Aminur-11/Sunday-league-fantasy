export default function PlayerShirt({
  isCaptain = false,
  className = "",
}: {
  isCaptain?: boolean;
  className?: string;
}) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 64 64"
        className="h-10 w-10 drop-shadow-md sm:h-12 sm:w-12"
        aria-hidden="true"
      >
        <path
          d="M20 8 L6 22 L16 28 L16 58 L48 58 L48 28 L58 22 L44 8 Q32 14 20 8 Z"
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 9 Q32 15 40 9"
          fill="none"
          stroke="#cbd5e1"
          strokeWidth="1.5"
        />
      </svg>
      {isCaptain && (
        <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-pitch-dark shadow ring-2 ring-white">
          C
        </span>
      )}
    </div>
  );
}
