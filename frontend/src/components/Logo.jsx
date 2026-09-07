/* Trading Legend brand logo — pure SVG (koi image file ki zaroorat nahi).
   Gradient TL monogram: flag-style T crossbar + L base, orange→yellow. */

export default function LogoMark({ size = 26 }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      role="img"
      aria-label="Trading Legend"
    >
      <defs>
        <linearGradient id="tlGrad" x1="88" y1="10" x2="14" y2="92" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFD23F" />
          <stop offset="0.52" stopColor="#FF9E1B" />
          <stop offset="1" stopColor="#FF5A1F" />
        </linearGradient>
      </defs>
      {/* T — ribbon/flag crossbar (tilted up-right) */}
      <path d="M6 30 L84 12 L89 26 L22 44 Z" fill="url(#tlGrad)" />
      {/* ribbon fold shadow */}
      <path d="M6 30 L22 44 L8 46 Z" fill="#E8480F" />
      {/* T stem flowing into L base */}
      <path d="M26 42 L42 39 L42 70 L82 62 L85 77 L26 87 Z" fill="url(#tlGrad)" />
    </svg>
  );
}
