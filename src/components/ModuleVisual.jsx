import { useId } from "react";

function VisualGlyph({ variant }) {
  switch (variant) {
    case "crane":
      return (
        <>
          <path d="M180 284V82M158 284h44M154 112h246M180 112l70-46 64 46M350 112v92" />
          <path d="M334 204h32v38h-32zM366 223h46M412 223v34" />
          <circle cx="412" cy="267" r="10" />
          <path d="M180 146l-26 24 52 28-52 29 52 29-26 28" opacity=".55" />
        </>
      );
    case "rover":
      return (
        <>
          <path d="M206 245h220l-30-62H238zM252 183l55-45 56 45M307 138V91" />
          <circle cx="307" cy="76" r="17" />
          <circle cx="246" cy="263" r="29" />
          <circle cx="386" cy="263" r="29" />
          <path d="M326 76c66 9 108 40 137 91M327 92c45 8 74 29 95 61M288 76c-66 9-108 40-137 91" opacity=".55" />
        </>
      );
    case "printer":
      return (
        <>
          <path d="M160 278V82h320v196M160 111h320M320 111v61M296 172h48l18 30h-84z" />
          <path d="M221 260h198M239 239h162M260 218h120M282 197h76" opacity=".72" />
          <path d="M320 172v21" />
          <circle cx="320" cy="190" r="5" />
        </>
      );
    case "drone":
      return (
        <>
          <path d="M258 174h124l30 46-92 42-92-42zM258 191l-77-51M382 191l77-51M258 216l-77 51M382 216l77 51" />
          <circle cx="166" cy="130" r="38" />
          <circle cx="474" cy="130" r="38" />
          <circle cx="166" cy="277" r="38" />
          <circle cx="474" cy="277" r="38" />
          <path d="M298 262v30h44v-30" />
        </>
      );
    case "vision":
      return (
        <>
          <path d="M116 184s76-105 204-105 204 105 204 105-76 105-204 105S116 184 116 184z" />
          <circle cx="320" cy="184" r="72" />
          <circle cx="320" cy="184" r="24" />
          <path d="M320 92v34M320 242v34M228 184h34M378 184h34" opacity=".62" />
        </>
      );
    case "quality":
      return (
        <>
          <path d="M320 65l140 48v85c0 82-52 126-140 159-88-33-140-77-140-159v-85z" />
          <path d="M246 200l48 47 103-112" />
          <path d="M250 111h140" opacity=".45" />
        </>
      );
    case "planerka":
      return (
        <>
          <path d="M138 180h96M278 180h84M406 180h96M320 180V92M320 180v88M234 180l86-88M362 180l-42-88M234 180l86 88M362 180l-42 88" opacity=".62" />
          <circle cx="118" cy="180" r="28" />
          <circle cx="256" cy="180" r="28" />
          <circle cx="384" cy="180" r="28" />
          <circle cx="522" cy="180" r="28" />
          <circle cx="320" cy="72" r="28" />
          <circle cx="320" cy="288" r="28" />
          <path d="M310 180l9 10 20-23" />
        </>
      );
    default:
      return (
        <>
          <path d="M126 262h94v-82h104v-70h104v-42h86M220 220h104M324 150h104" />
          <circle cx="126" cy="262" r="18" />
          <circle cx="220" cy="180" r="18" />
          <circle cx="324" cy="110" r="18" />
          <circle cx="428" cy="68" r="18" />
          <path d="M428 68h86M486 50l28 18-28 18" />
        </>
      );
  }
}

export default function ModuleVisual({ variant = "operations", label, compact = false }) {
  const uid = useId().replaceAll(":", "");
  const glowId = `glow-${uid}`;
  const fillId = `fill-${uid}`;
  const gridId = `grid-${uid}`;

  return (
    <svg
      className={`module-visual ${compact ? "module-visual--compact" : ""}`}
      viewBox="0 0 640 360"
      role="img"
      aria-label={label}
      preserveAspectRatio="xMidYMid slice"
    >
      <title>{label}</title>
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#08151d" />
          <stop offset=".55" stopColor="#0b2029" />
          <stop offset="1" stopColor="#071016" />
        </linearGradient>
        <filter id={glowId} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <pattern id={gridId} width="32" height="32" patternUnits="userSpaceOnUse">
          <path d="M32 0H0V32" fill="none" stroke="#37ddf5" strokeOpacity=".08" />
        </pattern>
      </defs>
      <rect width="640" height="360" fill={`url(#${fillId})`} />
      <rect width="640" height="360" fill={`url(#${gridId})`} />
      <circle cx="510" cy="56" r="132" fill="#37ddf5" opacity=".035" />
      <circle cx="112" cy="318" r="124" fill="#8f7cff" opacity=".04" />
      <g fill="none" stroke="#37ddf5" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" filter={`url(#${glowId})`}>
        <VisualGlyph variant={variant} />
      </g>
      <path d="M28 30h72M28 30v24M612 330h-72M612 330v-24" fill="none" stroke="#9db0b8" strokeOpacity=".38" />
      <text x="32" y="330" fill="#7f98a2" fontFamily="monospace" fontSize="12" letterSpacing="2">{variant.toUpperCase()}</text>
      <circle cx="604" cy="30" r="4" fill="#43d79e" />
    </svg>
  );
}
