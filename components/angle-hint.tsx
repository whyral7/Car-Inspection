import type { ReactNode } from "react";
import type { Angle } from "@/lib/photos/angles";

// Line drawings (240x140) of what each photo should frame. The part the dealer must capture
// (odometer digits, warning lights, chassis plate, the right tyre) is picked out in the brand colour.
// Decorative: the label and tip next to them carry the same information.

const W = 240;

const outline = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2.5,
  strokeLinecap: "round",
  strokeLinejoin: "round",
} as const;

/** White fill so a nearer shape hides the lines behind it. */
const PAPER = "#fff";

function Detail({ children }: { children: ReactNode }) {
  return (
    <g strokeWidth={1.6} opacity={0.75}>
      {children}
    </g>
  );
}

function Accent({ children }: { children: ReactNode }) {
  return <g className="text-brand-600">{children}</g>;
}

/** Draws children and their mirror image about the vertical centre line. */
function Symmetric({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <g transform={`translate(${W} 0) scale(-1 1)`}>{children}</g>
    </>
  );
}

function Shadow({ cx = 120, cy, rx, ry = 4 }: { cx?: number; cy: number; rx: number; ry?: number }) {
  return <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="currentColor" stroke="none" opacity={0.12} />;
}

/** Tyre, rim and five spokes. rx < ry gives a wheel seen at an angle. */
function Wheel({ cx, cy, rx, ry = rx }: { cx: number; cy: number; rx: number; ry?: number }) {
  const spokes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    const x = (r: number) => (cx + Math.cos(a) * r * (rx / ry)).toFixed(1);
    const y = (r: number) => (cy + Math.sin(a) * r).toFixed(1);
    return `M${x(ry * 0.2)} ${y(ry * 0.2)} L${x(ry * 0.6)} ${y(ry * 0.6)}`;
  }).join(" ");
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={PAPER} />
      <ellipse cx={cx} cy={cy} rx={rx * 0.66} ry={ry * 0.66} />
      <Detail>
        <ellipse cx={cx} cy={cy} rx={rx * 0.16} ry={ry * 0.16} />
        <path d={spokes} />
      </Detail>
    </g>
  );
}

// ----- Exterior -----

/** Left side of a sedan: front of the car points left. */
function Side() {
  return (
    <>
      <Shadow cy={124} rx={110} />
      <path
        fill={PAPER}
        d="M20 106 C14 104 12 96 14 90 C15 85 18 82 26 80 C46 76 70 72 90 70 C102 60 112 52 124 48 C140 44 160 44 172 47 C184 52 194 62 202 66 L222 68 C228 69 230 74 229 82 L227 102 C226 106 222 107 216 107 L205 107 A22 22 0 0 0 161 107 L81 107 A22 22 0 0 0 37 107 Z"
      />
      {/* Glass */}
      <path d="M98 69 C107 61 114 56 125 53 L143 52 V69 Z" />
      <path d="M149 52 L166 52 C176 54 184 60 191 66 L149 68 Z" />
      {/* Mirror */}
      <path d="M97 69 C92 66 88 62 84 62 C80 62 80 68 84 70 Z" fill={PAPER} />
      <Detail>
        {/* Doors and handles */}
        <path d="M94 72 L90 104 M146 69 V106 M195 67 C195 76 193 82 185 84 C174 86 166 92 164 104" />
        <path d="M124 78 H134 M172 77 H182" strokeWidth={3} />
        {/* Lamps, bumpers, body line, fuel lid */}
        <path d="M15 86 C24 82 34 80 46 79 C44 84 40 87 32 88 L16 90" />
        <path d="M229 74 L214 72 C214 78 216 80 222 81 L229 82" />
        <path d="M16 98 H30 M226 97 H212 M84 102 H158" />
        <path d="M32 92 C80 88 160 86 226 88" />
        <circle cx="206" cy="78" r="3.5" />
      </Detail>
      <Wheel cx={59} cy={106} rx={17} />
      <Wheel cx={183} cy={106} rx={17} />
    </>
  );
}

const BODY_FRONT_REAR =
  "M42 112 V90 C42 80 48 74 58 71 C78 68 100 67 120 67 C140 67 162 68 182 71 C192 74 198 80 198 90 V112 C198 116 196 118 192 118 H48 C44 118 42 116 42 112 Z";

function Tyres() {
  return (
    <>
      <rect x="48" y="108" width="20" height="19" rx="4" fill={PAPER} />
      <rect x="172" y="108" width="20" height="19" rx="4" fill={PAPER} />
    </>
  );
}

function Front() {
  return (
    <>
      <Shadow cy={127} rx={92} />
      <Tyres />
      <path fill={PAPER} d="M66 70 L84 38 C86 34 89 32 94 32 H146 C151 32 154 34 156 38 L174 70" />
      <path d="M74 68 L90 40 H150 L166 68 Z" />
      <path fill={PAPER} d={BODY_FRONT_REAR} />
      <Symmetric>
        <path d="M68 68 L50 67" />
        <path d="M50 61 H40 C36 61 33 64 33 67 C33 71 36 73 40 73 H50 Z" fill={PAPER} />
        <path d="M50 82 C52 79 56 78 62 78 L94 82 C94 88 90 90 84 90 H56 C52 90 50 86 50 82 Z" />
        <Detail>
          <path d="M58 84 H72" />
          <circle cx="62" cy="105" r="4" />
          <path d="M72 106 H94" />
        </Detail>
      </Symmetric>
      <path d="M98 84 H142 C142 92 138 98 132 100 H108 C102 98 98 92 98 84 Z" />
      <rect x="103" y="104" width="34" height="9" rx="1.5" />
      <Detail>
        <path d="M101 89 H139 M104 94 H136" />
        <circle cx="120" cy="79" r="2.5" />
        <path d="M64 76 C90 73 150 73 176 76" />
        <path d="M98 66 L118 60 M136 66 L156 60" />
      </Detail>
    </>
  );
}

function Rear() {
  return (
    <>
      <Shadow cy={127} rx={92} />
      <Tyres />
      <path fill={PAPER} d="M70 70 L86 40 C88 36 91 34 96 34 H144 C149 34 152 36 154 40 L170 70" />
      <path d="M78 68 L92 42 H148 L162 68 Z" />
      <path fill={PAPER} d={BODY_FRONT_REAR} />
      <Symmetric>
        <path d="M46 80 C46 76 50 74 56 74 L84 76 L82 90 H52 C48 90 46 86 46 80 Z" />
        <Detail>
          <path d="M80 98 L76 75" />
          <path d="M54 110 H70" />
        </Detail>
      </Symmetric>
      <rect x="103" y="84" width="34" height="10" rx="1.5" />
      <rect x="160" y="117" width="12" height="4" rx="2" />
      <Detail>
        <path d="M64 72 C90 70 150 70 176 72 M80 98 H160 M48 104 H192" />
        <path d="M88 50 H152 M84 57 H156" />
        <circle cx="120" cy="78" r="2.5" />
      </Detail>
    </>
  );
}

/** Seen from the front-left corner: front face on the left, left side running away to the right. */
function CornerFront() {
  return (
    <>
      <Shadow cx={128} cy={121} rx={106} ry={6} />
      <path
        fill={PAPER}
        d="M26 110 C22 108 20 102 20 96 L22 88 C23 85 26 84 30 84 C40 78 50 70 60 66 C66 56 74 48 82 45 C110 42 156 42 184 45 C196 50 204 58 210 62 L226 64 C230 65 231 70 230 76 L229 96 C228 99 226 100 222 100 L208 101 A13 16 0 0 0 184 103 L115 108 A17 20 0 0 0 81 110 L72 112 C60 113 40 112 26 110 Z"
      />
      {/* Front face edge, hood edge, windscreen */}
      <path d="M30 84 C44 82 56 81 68 80 C70 90 71 100 72 112 M68 80 C84 74 100 69 116 66 C122 58 128 50 134 44" />
      <path d="M68 63 C74 56 80 50 88 47 H128 C124 53 119 59 113 64 C98 63 82 63 68 63 Z" />
      {/* Side glass */}
      <path d="M122 65 C127 58 132 51 138 48 H158 V64 Z" />
      <path d="M164 48 H180 C188 52 196 58 202 62 L164 63 Z" />
      <path d="M120 64 C114 60 110 58 106 59 C103 61 104 66 108 67 Z" fill={PAPER} />
      {/* Lamps, grille, plate */}
      <path d="M50 86 C56 84 64 83 70 83 C78 81 86 79 92 77 C90 82 84 86 76 87 L52 90 Z" />
      <path d="M24 90 C28 89 32 88 36 88 L35 93 L24 94 Z" />
      <path d="M38 92 H48 V100 H39 Z" />
      <rect x="35" y="103" width="14" height="6" rx="1" />
      <Detail>
        <path d="M120 67 L117 106 M161 64 V104 M204 63 C204 72 202 80 196 84 C190 87 186 92 186 100" />
        <path d="M140 74 H149 M184 72 H192" strokeWidth={3} />
        <path d="M76 94 C120 89 180 85 226 82" />
        <path d="M54 104 H68" />
      </Detail>
      <Wheel cx={98} cy={110} rx={13} ry={16} />
      <Wheel cx={196} cy={104} rx={10} ry={13} />
    </>
  );
}

/** Seen from the rear-left corner: left side on the left, rear face on the right. */
function CornerRear() {
  // Drawn with the rear face on the left like CornerFront, then mirrored.
  return (
    <g transform={`translate(${W} 0) scale(-1 1)`}>
      <Shadow cx={128} cy={121} rx={106} ry={6} />
      <path
        fill={PAPER}
        d="M26 110 C22 108 20 102 20 96 L22 86 C23 83 26 82 30 82 C36 78 42 74 48 70 C56 58 64 50 74 46 C100 42 140 42 160 44 C172 50 184 58 192 62 C206 64 220 68 226 72 C230 74 232 80 231 86 L230 96 C229 99 227 100 223 100 L212 101 A13 16 0 0 0 188 103 L115 108 A17 20 0 0 0 81 110 L72 112 C60 113 40 112 26 110 Z"
      />
      {/* Rear face edge, boot lid, rear glass */}
      <path d="M30 82 C44 81 56 80 68 80 C70 90 71 100 72 112 M68 80 C76 76 86 72 96 70 C102 60 108 52 114 46" />
      <path d="M54 68 C60 59 66 52 76 48 H108 C104 55 99 62 94 68 C80 67 66 67 54 68 Z" />
      {/* Side glass */}
      <path d="M102 67 C107 59 112 52 118 48 H140 V65 Z" />
      <path d="M146 48 H160 C168 52 176 57 182 61 L146 64 Z" />
      <path d="M184 61 C188 56 192 54 196 55 C199 57 198 62 194 63 Z" fill={PAPER} />
      {/* Tail lamps, plate */}
      <path d="M48 84 C56 83 64 82 70 82 C78 80 86 78 94 77 C92 82 86 85 78 86 L50 89 Z" />
      <path d="M24 88 L36 87 L35 92 L24 93 Z" />
      <rect x="37" y="94" width="14" height="6" rx="1" />
      <Detail>
        <path d="M100 70 C99 82 99 94 101 104 M143 65 V104 M188 62 L186 92" />
        <path d="M124 74 H133 M166 72 H174" strokeWidth={3} />
        <path d="M76 94 C120 89 180 85 226 84" />
        <path d="M24 102 C40 104 56 105 70 105" />
        <ellipse cx="34" cy="108" rx="4" ry="2" />
      </Detail>
      <Wheel cx={98} cy={110} rx={13} ry={16} />
      <Wheel cx={200} cy={104} rx={10} ry={13} />
    </g>
  );
}

// ----- Under the bonnet and details -----

function Engine() {
  return (
    <>
      {/* Raised bonnet and its stay */}
      <path d="M44 30 Q120 6 196 30 L186 40 Q120 22 54 40 Z" fill={PAPER} />
      <path d="M68 40 L80 62" />
      {/* Bay, slam panel, headlamps */}
      <path d="M30 44 L54 40 Q120 30 186 40 L210 44 L222 116 H18 Z" />
      <path d="M22 104 H218" />
      <Symmetric>
        <path d="M22 106 H60 L57 115 H21 Z" />
      </Symmetric>
      {/* Engine cover */}
      <rect x="84" y="54" width="74" height="40" rx="8" fill={PAPER} />
      <Detail>
        <path d="M96 64 H146 M96 72 H146 M96 80 H146" />
        <circle cx="140" cy="86" r="3" />
      </Detail>
      {/* Battery */}
      <rect x="38" y="56" width="34" height="22" rx="2" />
      <Detail>
        <path d="M46 56 V52 M64 56 V52 M44 64 H50 M60 64 H66 M63 61 V67" />
      </Detail>
      {/* Air filter box and intake */}
      <rect x="168" y="52" width="40" height="26" rx="4" />
      <Detail>
        <path d="M168 66 C160 66 160 60 158 60" />
        <path d="M174 58 H202 M174 72 H202" />
      </Detail>
      {/* Reservoirs */}
      <circle cx="56" cy="92" r="6" />
      <circle cx="186" cy="92" r="5" />
      <Detail>
        <circle cx="56" cy="92" r="2.5" />
      </Detail>
    </>
  );
}

function Chassis() {
  // A riveted plate on the door pillar; the 17-character number is the row that matters.
  const chars = Array.from({ length: 17 }, (_, i) => <rect key={i} x={52 + i * 8} y={66} width={5} height={9} rx={1} />);
  return (
    <>
      {/* Door pillar and striker for context */}
      <Detail>
        <path d="M24 10 V130 M216 10 V130" />
        <rect x="196" y="100" width="12" height="18" rx="2" />
      </Detail>
      <rect x="40" y="34" width="160" height="72" rx="6" fill={PAPER} />
      <circle cx="49" cy="43" r="2.5" />
      <circle cx="191" cy="43" r="2.5" />
      <circle cx="49" cy="97" r="2.5" />
      <circle cx="191" cy="97" r="2.5" />
      <Detail>
        <path d="M60 48 H120 M60 56 H104" />
        <path d="M60 88 H140 M60 94 H118" />
      </Detail>
      <Accent>
        <g fill="currentColor" stroke="none">
          {chars}
        </g>
      </Accent>
    </>
  );
}

function ticks(cx: number, cy: number, r: number, count: number, from = 0.75, to = 2.25) {
  return Array.from({ length: count }, (_, i) => {
    const a = Math.PI * (from + ((to - from) * i) / (count - 1));
    const long = i % 2 === 0 ? 7 : 4;
    const p = (rr: number) => `${(cx + Math.cos(a) * rr).toFixed(1)} ${(cy + Math.sin(a) * rr).toFixed(1)}`;
    return `M${p(r)} L${p(r - long)}`;
  }).join(" ");
}

function Odometer() {
  return (
    <>
      {/* Cluster hood */}
      <path d="M14 44 Q120 0 226 44 V112 Q120 128 14 112 Z" />
      {/* Rev counter and speedometer */}
      <circle cx="66" cy="72" r="34" fill={PAPER} />
      <circle cx="174" cy="72" r="34" fill={PAPER} />
      <Detail>
        <path d={ticks(66, 72, 30, 9)} />
        <path d={ticks(174, 72, 30, 13)} />
        <circle cx="66" cy="72" r="3" />
        <circle cx="174" cy="72" r="3" />
      </Detail>
      <path d="M66 72 L48 86 M174 72 L156 58" />
      {/* Display with the odometer reading */}
      <rect x="104" y="56" width="32" height="44" rx="4" fill={PAPER} />
      <Detail>
        <path d="M110 64 H130 M110 70 H124" />
      </Detail>
      <Accent>
        <rect x="104" y="80" width="32" height="14" rx="2" strokeWidth={2} />
        <g fill="currentColor" stroke="none">
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={107.5 + i * 5.4} y={83.5} width={3.6} height={7} rx={0.8} />
          ))}
        </g>
      </Accent>
    </>
  );
}

function Dashboard() {
  return (
    <>
      {/* Windscreen base and dashboard top */}
      <Detail>
        <path d="M6 22 Q120 4 234 22" />
      </Detail>
      <path d="M6 44 Q120 22 234 44 V70 Q234 78 226 78 H134 L128 130 M6 44 V70 Q6 78 14 78 H24" />
      {/* Instrument cluster with warning lights */}
      <path d="M38 50 Q74 36 110 50 V68 H38 Z" fill={PAPER} />
      <Detail>
        <circle cx="56" cy="60" r="7" />
        <circle cx="92" cy="60" r="7" />
      </Detail>
      <Accent>
        <path d="M68 56 L74 66 H62 Z M68 59 V62" strokeWidth={1.8} />
        <path d="M78 58 H86 V64 H78 Z M80 58 V56 M84 58 V56" strokeWidth={1.8} />
      </Accent>
      {/* Steering wheel */}
      <circle cx="74" cy="96" r="34" fill={PAPER} />
      <circle cx="74" cy="96" r="27" />
      <path d="M48 90 C58 86 66 86 74 86 C82 86 90 86 100 90 M74 104 V122" />
      <ellipse cx="74" cy="96" rx="11" ry="9" fill={PAPER} />
      {/* Centre screen and vents */}
      <rect x="146" y="40" width="54" height="30" rx="4" />
      <Detail>
        <rect x="138" y="86" width="26" height="12" rx="4" />
        <rect x="182" y="86" width="26" height="12" rx="4" />
        <path d="M142 92 H160 M186 92 H204" />
        <path d="M146 108 H200 M146 116 H200" />
      </Detail>
    </>
  );
}

function Seat({ cx }: { cx: number }) {
  const x = (d: number) => cx + d;
  return (
    <>
      <path d={`M${x(-6)} 30 V36 M${x(6)} 30 V36`} />
      <rect x={x(-15)} y="12" width="30" height="18" rx="7" fill={PAPER} />
      <path
        fill={PAPER}
        d={`M${x(-28)} 42 Q${x(-30)} 36 ${x(-22)} 35 H${x(22)} Q${x(30)} 36 ${x(28)} 42 L${x(32)} 96 Q${x(32)} 100 ${x(28)} 100 H${x(-28)} Q${x(-32)} 100 ${x(-32)} 96 Z`}
      />
      <Detail>
        <path d={`M${x(-17)} 40 L${x(-19)} 96 M${x(17)} 40 L${x(19)} 96`} />
      </Detail>
      <path
        fill={PAPER}
        d={`M${x(-36)} 100 H${x(36)} Q${x(41)} 100 ${x(41)} 106 V114 Q${x(41)} 120 ${x(35)} 120 H${x(-35)} Q${x(-41)} 120 ${x(-41)} 114 V106 Q${x(-41)} 100 ${x(-36)} 100 Z`}
      />
    </>
  );
}

function FrontSeats() {
  return (
    <>
      <Seat cx={66} />
      <Seat cx={174} />
      {/* Centre console and gear lever */}
      <path d="M110 92 H130 V124 H110 Z" />
      <path d="M120 92 V80" />
      <circle cx="120" cy="76" r="5" fill={PAPER} />
      <Detail>
        <path d="M114 106 H126" />
      </Detail>
    </>
  );
}

function RearSeats() {
  return (
    <>
      <Detail>
        {/* Rear window and parcel shelf */}
        <path d="M30 8 Q120 0 210 8 M14 30 H226" />
      </Detail>
      {[66, 120, 174].map((cx) => (
        <g key={cx}>
          <path d={`M${cx - 6} 32 V38 M${cx + 6} 32 V38`} />
          <rect x={cx - 15} y="16" width="30" height="16" rx="6" fill={PAPER} />
        </g>
      ))}
      <path fill={PAPER} d="M20 46 Q20 38 30 38 H210 Q220 38 220 46 L224 96 Q224 100 220 100 H20 Q16 100 16 96 Z" />
      <Detail>
        <path d="M100 38 V100 M44 44 L42 96 M196 44 L198 96" />
      </Detail>
      <path fill={PAPER} d="M14 100 H226 Q232 100 232 106 V116 Q232 122 226 122 H14 Q8 122 8 116 V106 Q8 100 14 100 Z" />
      <Detail>
        <path d="M120 100 V122" />
        <rect x="70" y="96" width="8" height="6" rx="1.5" />
        <rect x="162" y="96" width="8" height="6" rx="1.5" />
      </Detail>
    </>
  );
}

function Boot() {
  return (
    <>
      {/* Open lid */}
      <path d="M40 26 Q120 4 200 26 L192 36 Q120 16 48 36 Z" fill={PAPER} />
      {/* Opening, back wall, side walls */}
      <path d="M36 40 H204 L214 104 H26 Z" />
      <path d="M66 52 H174 L170 80 H70 Z" />
      <Detail>
        <path d="M36 40 L66 52 M204 40 L174 52 M70 80 L26 104 M170 80 L214 104" />
        <path d="M108 94 H132" strokeWidth={3} />
      </Detail>
      {/* Tail lamps and bumper sill */}
      <Symmetric>
        <path d="M14 44 L32 42 L28 72 L14 74 Z" />
      </Symmetric>
      <path d="M20 104 H220 V116 Q220 122 214 122 H26 Q20 122 20 116 Z" fill={PAPER} />
      <rect x="103" y="108" width="34" height="9" rx="1.5" />
    </>
  );
}

function Spare() {
  const lugs = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2;
    return <circle key={i} cx={120 + Math.cos(a) * 15} cy={68 + Math.sin(a) * 15} r={2.5} />;
  });
  const holes = Array.from({ length: 5 }, (_, i) => {
    const a = (i * 2 * Math.PI) / 5 - Math.PI / 2 + Math.PI / 5;
    const p = (r: number, da: number) => `${(120 + Math.cos(a + da) * r).toFixed(1)} ${(68 + Math.sin(a + da) * r).toFixed(1)}`;
    return <path key={i} d={`M${p(24, -0.3)} L${p(32, -0.2)} A32 32 0 0 1 ${p(32, 0.2)} L${p(24, 0.3)} A24 24 0 0 0 ${p(24, -0.3)} Z`} />;
  });
  return (
    <>
      {/* Boot well */}
      <Detail>
        <rect x="40" y="6" width="160" height="128" rx="40" />
      </Detail>
      {/* Tyre, tread band, rim */}
      <circle cx="120" cy="68" r="56" fill={PAPER} />
      <Detail>
        <circle cx="120" cy="68" r="50" strokeDasharray="4 5" />
      </Detail>
      <circle cx="120" cy="68" r="38" />
      <Detail>{holes}</Detail>
      <circle cx="120" cy="68" r="8" />
      <Detail>{lugs}</Detail>
      {/* Wheel spanner */}
      <path d="M192 112 L222 82" strokeWidth={4} />
      <circle cx="225" cy="79" r="5" />
    </>
  );
}

/** Tread close-up (left) and a top-down car with the wheel to photograph highlighted (right). */
function Tyre({ corner }: { corner: NonNullable<Angle["corner"]> }) {
  const wheels = { fl: [139, 22], fr: [191, 22], rl: [139, 88], rr: [191, 88] } as const;
  const active = wheels[corner];
  const chevrons = Array.from({ length: 7 }, (_, i) => {
    const y = 18 + i * 14;
    return `M34 ${y + 6} L50 ${y} L66 ${y + 6} L82 ${y} L98 ${y + 6}`;
  }).join(" ");
  return (
    <>
      {/* Tread face of the tyre, as seen with the wheel turned */}
      <path d="M32 10 H100 Q114 66 100 122 H32 Q18 66 32 10 Z" fill={PAPER} />
      <path d="M50 10 Q46 66 50 122 M66 10 V122 M82 10 Q86 66 82 122" />
      <Detail>
        <path d={chevrons} />
      </Detail>
      {/* Top-down car, front at the top */}
      <Detail>
        <path d="M170 4 L165 11 H175 Z" fill="currentColor" />
      </Detail>
      {(Object.keys(wheels) as (keyof typeof wheels)[])
        .filter((k) => k !== corner)
        .map((k) => (
          <rect key={k} x={wheels[k][0]} y={wheels[k][1]} width="10" height="22" rx="3" fill={PAPER} />
        ))}
      <path d="M170 14 C186 14 192 20 192 32 V104 C192 116 186 122 170 122 C154 122 148 116 148 104 V32 C148 20 154 14 170 14 Z" fill={PAPER} />
      <path d="M154 46 Q170 38 186 46 L184 58 Q170 54 156 58 Z" />
      <path d="M156 92 Q170 96 184 92 L186 102 Q170 108 154 102 Z" />
      <Detail>
        <path d="M156 58 V92 M184 58 V92" />
        <path d="M148 58 L142 56 V62 L148 64 M192 58 L198 56 V62 L192 64" />
      </Detail>
      {/* The wheel to photograph sits on top so the body can't hide it */}
      <Accent>
        <rect x={active[0]} y={active[1]} width="10" height="22" rx="3" fill="currentColor" />
        <circle cx={active[0] + 5} cy={active[1] + 11} r="18" strokeWidth={2} strokeDasharray="4 4" />
      </Accent>
    </>
  );
}

export function AngleHint({ angle, className = "" }: { angle: Angle; className?: string }) {
  let drawing: ReactNode;
  switch (angle.hint) {
    case "side": drawing = <Side />; break;
    case "front": drawing = <Front />; break;
    case "rear": drawing = <Rear />; break;
    case "corner_front": drawing = <CornerFront />; break;
    case "corner_rear": drawing = <CornerRear />; break;
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
    <svg viewBox="0 0 240 140" aria-hidden="true" focusable="false" className={`${angle.flip ? "-scale-x-100" : ""} ${className}`} {...outline}>
      {drawing}
    </svg>
  );
}
