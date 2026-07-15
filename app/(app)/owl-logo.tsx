export function OwlLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* orelhas em tufo */}
      <path
        d="M14 32 L11 8 L24 20 L34 11 L28 34 Z"
        fill="var(--brand)"
      />
      <path
        d="M86 32 L89 8 L76 20 L66 11 L72 34 Z"
        fill="var(--brand)"
      />

      {/* cabeça / corpo */}
      <path
        d="M18 34
           Q18 16 34 16
           L66 16
           Q82 16 82 34
           L82 62
           Q82 90 50 93
           Q18 90 18 62
           Z"
        fill="var(--brand)"
      />

      {/* crista central entre os olhos */}
      <path d="M50 30 L58 50 L42 50 Z" fill="var(--chumbo)" />

      {/* olhos (vazados, cor de fundo) */}
      <circle cx="35" cy="50" r="13" fill="var(--chumbo)" />
      <circle cx="65" cy="50" r="13" fill="var(--chumbo)" />
      <circle cx="35" cy="50" r="4" fill="var(--brand)" />
      <circle cx="65" cy="50" r="4" fill="var(--brand)" />

      {/* bico */}
      <path d="M45 62 L55 62 L50 76 Z" fill="var(--chumbo)" />

      {/* penas do peito */}
      <path
        d="M26 78 L32 68 L38 78 L44 66 L50 80 L56 66 L62 78 L68 68 L74 78"
        stroke="var(--chumbo)"
        strokeWidth="3"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
