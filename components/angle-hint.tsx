import type { Angle } from "@/lib/photos/angles";

// Simple outline drawings (200x120) that show what each photo should frame.
// Decorative: the label and tip next to them carry the same information.

const stroke = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 3,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** White fill so a wheel covers the body line behind it. */
const solid = { fill: "#fff" } as const;

function Wheel({ cx, cy, r = 14 }: { cx: number; cy: number; r?: number }) {
  return (
    <>
      <circle cx={cx} cy={cy} r={r} {...solid} />
      <circle cx={cx} cy={cy} r={r * 0.36} />
    </>
  );
}

function Side() {
  return (
    <>
      <path d="M14 82 V70 Q14 63 22 61 L56 55 L74 35 Q77 31 83 31 H128 Q134 31 138 35 L156 55 L182 61 Q190 63 190 71 V82 Q190 86 186 86 H14 Z" />
      <path d="M72 55 L85 38 H104 V55 Z" />
      <path d="M110 38 H127 L142 55 H110 Z" />
      <path d="M106 66 H116" />
      <Wheel cx={54} cy={86} />
      <Wheel cx={148} cy={86} />
    </>
  );
}

function Front() {
  return (
    <>
      <path d="M52 60 L62 32 Q64 27 71 27 H129 Q136 27 138 32 L148 60" />
      <path d="M70 58 L76 36 H124 L130 58" />
      <rect x="26" y="58" width="148" height="34" rx="10" />
      <rect x="34" y="64" width="30" height="12" rx="6" />
      <rect x="136" y="64" width="30" height="12" rx="6" />
      <rect x="76" y="67" width="48" height="11" rx="3" />
      <rect x="86" y="81" width="28" height="9" rx="2" />
      <rect x="32" y="92" width="18" height="14" rx="4" {...solid} />
      <rect x="150" y="92" width="18" height="14" rx="4" {...solid} />
      <path d="M26 64 H16 V72 H26 M174 64 H184 V72 H174" />
    </>
  );
}

function Rear() {
  return (
    <>
      <path d="M54 58 L62 34 Q64 30 70 30 H130 Q136 30 138 34 L146 58" />
      <rect x="26" y="58" width="148" height="34" rx="10" />
      <rect x="32" y="63" width="28" height="11" rx="3" />
      <rect x="140" y="63" width="28" height="11" rx="3" />
      <path d="M80 68 H120" />
      <rect x="84" y="76" width="32" height="10" rx="2" />
      <rect x="32" y="92" width="18" height="14" rx="4" {...solid} />
      <rect x="150" y="92" width="18" height="14" rx="4" {...solid} />
    </>
  );
}

/** Seen from the front-left corner: the front face on the left, the left side on the right. */
function Corner({ rear }: { rear: boolean }) {
  return (
    <g transform={rear ? "translate(200 0) scale(-1 1)" : undefined}>
      {/* Body: front face (far end left, nearest corner x=72) and side running away to the right. */}
      <path d="M16 66 L72 54 L186 60 Q192 61 192 67 V88 Q192 92 188 92 L72 98 L16 90 Z" />
      <path d="M72 54 V98" />
      {/* Cabin */}
      <path d="M86 55 L100 30 Q102 27 106 27 H140 Q144 27 147 30 L170 59" />
      <path d="M104 55 L112 36 H138 L156 56 Z" />
      {/* Lamp on the end face */}
      {rear ? <rect x="22" y="70" width="26" height="9" rx="3" transform="rotate(-10 35 74)" /> : <rect x="24" y="70" width="28" height="10" rx="5" transform="rotate(-10 38 75)" />}
      <path d="M52 84 L68 82" />
      <Wheel cx={104} cy={98} r={13} />
      <Wheel cx={172} cy={93} r={11} />
    </g>
  );
}

function Engine() {
  return (
    <>
      <rect x="22" y="16" width="156" height="88" rx="10" />
      <rect x="34" y="28" width="36" height="22" rx="3" />
      <path d="M42 28 V24 M62 28 V24" />
      <rect x="84" y="34" width="46" height="46" rx="4" />
      <circle cx="96" cy="46" r="4" />
      <circle cx="118" cy="46" r="4" />
      <circle cx="96" cy="68" r="4" />
      <circle cx="118" cy="68" r="4" />
      <circle cx="152" cy="60" r="18" />
      <circle cx="152" cy="60" r="4" />
      <path d="M70 40 H84 M70 70 H84 M130 57 H134" />
    </>
  );
}

function Chassis() {
  return (
    <>
      <rect x="30" y="30" width="140" height="60" rx="6" />
      <circle cx="42" cy="42" r="3" />
      <circle cx="158" cy="42" r="3" />
      <circle cx="42" cy="78" r="3" />
      <circle cx="158" cy="78" r="3" />
      <path d="M56 46 H144 M56 60 H144 M56 74 H108" />
    </>
  );
}

function Odometer() {
  const ticks = Array.from({ length: 9 }, (_, i) => {
    const a = Math.PI * (1.15 + (i * 0.7) / 8);
    return `M${100 + 30 * Math.cos(a)} ${54 + 30 * Math.sin(a)} L${100 + 37 * Math.cos(a)} ${54 + 37 * Math.sin(a)}`;
  }).join(" ");
  return (
    <>
      <circle cx="100" cy="54" r="42" />
      <path d={ticks} />
      <path d="M100 54 L122 34" />
      <circle cx="100" cy="54" r="4" />
      <rect x="64" y="98" width="72" height="16" rx="3" />
      <path d="M76 98 V114 M88 98 V114 M100 98 V114 M112 98 V114 M124 98 V114" />
    </>
  );
}

function Dashboard() {
  return (
    <>
      <path d="M8 40 Q100 8 192 40" />
      <rect x="46" y="16" width="60" height="22" rx="6" />
      <circle cx="64" cy="27" r="7" />
      <circle cx="88" cy="27" r="7" />
      <circle cx="76" cy="76" r="32" />
      <circle cx="76" cy="76" r="9" />
      <path d="M76 85 V108 M67 72 L45 64 M85 72 L107 64" />
      <rect x="130" y="26" width="46" height="28" rx="4" />
      <path d="M153 66 L166 90 H140 Z M153 74 V82 M153 86 V86.5" />
    </>
  );
}

function Seat({ x }: { x: number }) {
  return (
    <>
      <rect x={x + 18} y="12" width="24" height="14" rx="5" />
      <rect x={x} y="30" width="60" height="48" rx="10" />
      <rect x={x - 4} y="82" width="68" height="22" rx="8" />
    </>
  );
}

function FrontSeats() {
  return (
    <>
      <Seat x={26} />
      <Seat x={114} />
      <path d="M100 40 V100" />
    </>
  );
}

function RearSeats() {
  return (
    <>
      <rect x="38" y="12" width="24" height="14" rx="5" />
      <rect x="88" y="12" width="24" height="14" rx="5" />
      <rect x="138" y="12" width="24" height="14" rx="5" />
      <rect x="18" y="30" width="164" height="48" rx="10" />
      <path d="M73 30 V78 M127 30 V78" />
      <rect x="12" y="82" width="176" height="22" rx="8" />
    </>
  );
}

function Boot() {
  return (
    <>
      <path d="M30 30 Q100 4 170 30" />
      <path d="M30 36 H170 L186 106 H14 Z" />
      <path d="M42 56 H158" />
      <circle cx="100" cy="82" r="16" />
      <circle cx="100" cy="82" r="5" />
    </>
  );
}

function Spare() {
  return (
    <>
      <circle cx="100" cy="60" r="48" />
      <circle cx="100" cy="60" r="31" />
      <circle cx="100" cy="60" r="12" />
      <circle cx="100" cy="48" r="2.5" />
      <circle cx="112" cy="60" r="2.5" />
      <circle cx="100" cy="72" r="2.5" />
      <circle cx="88" cy="60" r="2.5" />
    </>
  );
}

/** A close-up of tread (left) plus a top-down car with the wheel to photograph highlighted (right). */
function Tyre({ corner }: { corner: NonNullable<Angle["corner"]> }) {
  const wheels = {
    fl: { x: 142, y: 28 },
    fr: { x: 178, y: 28 },
    rl: { x: 142, y: 78 },
    rr: { x: 178, y: 78 },
  } as const;
  return (
    <>
      <rect x="10" y="22" width="108" height="76" rx="10" />
      <path d="M36 22 V98 M64 22 V98 M92 22 V98" />
      <path d="M14 44 H32 M40 56 H60 M68 44 H88 M96 56 H114 M14 70 H32 M40 82 H60 M68 70 H88 M96 82 H114" />
      <rect x="148" y="16" width="30" height="90" rx="12" />
      <path d="M163 8 L158 16 H168 Z" />
      <path d="M152 40 H174 M152 82 H174" />
      {(Object.keys(wheels) as (keyof typeof wheels)[]).map((k) => (
        <rect
          key={k}
          x={wheels[k].x}
          y={wheels[k].y}
          width="8"
          height="18"
          rx="2.5"
          className={k === corner ? "text-brand-700" : undefined}
          fill={k === corner ? "currentColor" : "#fff"}
          strokeWidth={k === corner ? 4 : 3}
        />
      ))}
    </>
  );
}

export function AngleHint({ angle, className = "" }: { angle: Angle; className?: string }) {
  let drawing;
  switch (angle.hint) {
    case "side": drawing = <Side />; break;
    case "front": drawing = <Front />; break;
    case "rear": drawing = <Rear />; break;
    case "corner_front": drawing = <Corner rear={false} />; break;
    case "corner_rear": drawing = <Corner rear />; break;
    case "engine": drawing = <Engine />; break;
    case "chassis": drawing = <Chassis />; break;
    case "odometer": drawing = <Odometer />; break;
    case "dashboard": drawing = <Dashboard />; break;
    case "front_seats": drawing = <FrontSeats />; break;
    case "rear_seats": drawing = <RearSeats />; break;
    case "boot": drawing = <Boot />; break;
    case "spare": drawing = <Spare />; break;
    case "tyre": drawing = <Tyre corner={angle.corner ?? "fl"} />; break;
  }
  return (
    <svg viewBox="0 0 200 120" aria-hidden="true" focusable="false" className={`${angle.flip ? "-scale-x-100" : ""} ${className}`} {...stroke}>
      {drawing}
    </svg>
  );
}
