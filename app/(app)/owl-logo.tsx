export function OwlLogo({ className = "h-8 w-8" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      {/* orelhas em tufo, fundidas direto na faixa da sobrancelha (sem lacuna) */}
      <path
        d="M18,32 L10,28 L6,8 L16,20 L12,4 L24,18 L22,2 L34,22 L42,26 L50,36
           L58,26 L66,22 L78,2 L76,18 L88,4 L84,20 L94,8 L90,28 L82,32
           Q66,40 58,42 Q50,46 42,42 Q34,40 18,32 Z"
        fill="var(--brand)"
      />

      {/* rosto com bordas serrilhadas (textura de penas), afunilando até o queixo */}
      <path
        d="M18,32 L10,40 L20,48 L12,58 L24,66 L18,76 L32,82 L26,90 L50,97
           L74,90 L68,82 L82,76 L76,66 L88,58 L80,48 L90,40 L82,32
           Q66,40 58,42 Q50,46 42,42 Q34,40 18,32 Z"
        fill="var(--brand)"
      />

      {/* olhos (vazados, cor de fundo) com pupila dourada */}
      <circle cx="32" cy="50" r="13" fill="var(--chumbo)" />
      <circle cx="68" cy="50" r="13" fill="var(--chumbo)" />
      <circle cx="32" cy="50" r="13" fill="none" stroke="var(--brand)" strokeWidth="1.5" />
      <circle cx="68" cy="50" r="13" fill="none" stroke="var(--brand)" strokeWidth="1.5" />
      <circle cx="32" cy="50" r="4.5" fill="var(--brand)" />
      <circle cx="68" cy="50" r="4.5" fill="var(--brand)" />

      {/* bico */}
      <path d="M50,56 L58,64 L50,78 L42,64 Z" fill="var(--chumbo)" />

      {/* penas do peito */}
      <path
        d="M28,84 L34,76 L40,84 L50,74 L60,84 L66,76 L72,84"
        stroke="var(--chumbo)"
        strokeWidth="2.5"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
