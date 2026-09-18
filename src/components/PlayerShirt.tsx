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
          d="M16 8 L6 18 L14 26 L14 58 L50 58 L50 26 L58 18 L48 8 L40 13 Q32 18 24 13 Z"
          fill="#ffffff"
          stroke="#94a3b8"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
        <path
          d="M24 13 Q32 18 40 13"
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
