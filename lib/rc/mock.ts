import type { Fuel, Transmission } from "@/lib/cars";
import { isBhSeries } from "@/lib/validation/car";
import type { RcDetails, RcProvider } from "./types";

type CatalogueCar = {
  make: string;
  maker: string;
  model: string;
  variants: string[];
  fuels: Fuel[];
  transmissions: Transmission[];
  colours: string[];
};

// Popular used cars in India, so demo reports look real.
const CATALOGUE: CatalogueCar[] = [
  { make: "Maruti Suzuki", maker: "MARUTI SUZUKI INDIA LTD", model: "Swift", variants: ["LXI", "VXI", "ZXI", "ZXI Plus"], fuels: ["petrol", "petrol_cng"], transmissions: ["manual", "automatic"], colours: ["PEARL ARCTIC WHITE", "SOLID FIRE RED", "MAGMA GREY"] },
  { make: "Maruti Suzuki", maker: "MARUTI SUZUKI INDIA LTD", model: "Baleno", variants: ["Sigma", "Delta", "Zeta", "Alpha"], fuels: ["petrol"], transmissions: ["manual", "automatic"], colours: ["NEXA BLUE", "PEARL ARCTIC WHITE", "GRANDEUR GREY"] },
  { make: "Maruti Suzuki", maker: "MARUTI SUZUKI INDIA LTD", model: "Ertiga", variants: ["VXI", "ZXI", "ZXI Plus"], fuels: ["petrol", "petrol_cng"], transmissions: ["manual", "automatic"], colours: ["SILKY SILVER", "PEARL METALLIC AUBURN RED"] },
  { make: "Maruti Suzuki", maker: "MARUTI SUZUKI INDIA LTD", model: "Wagon R", variants: ["LXI", "VXI", "ZXI"], fuels: ["petrol", "petrol_cng"], transmissions: ["manual"], colours: ["SUPERIOR WHITE", "POOLSIDE BLUE"] },
  { make: "Hyundai", maker: "HYUNDAI MOTOR INDIA LTD", model: "Creta", variants: ["E", "EX", "S", "SX", "SX(O)"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["POLAR WHITE", "PHANTOM BLACK", "TITAN GREY"] },
  { make: "Hyundai", maker: "HYUNDAI MOTOR INDIA LTD", model: "i20", variants: ["Magna", "Sportz", "Asta", "Asta(O)"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["FIERY RED", "TYPHOON SILVER"] },
  { make: "Hyundai", maker: "HYUNDAI MOTOR INDIA LTD", model: "Grand i10", variants: ["Era", "Magna", "Sportz", "Asta"], fuels: ["petrol", "petrol_cng"], transmissions: ["manual"], colours: ["POLAR WHITE", "AQUA TEAL"] },
  { make: "Honda", maker: "HONDA CARS INDIA LTD", model: "City", variants: ["V", "VX", "ZX"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["PLATINUM WHITE PEARL", "LUNAR SILVER METALLIC"] },
  { make: "Honda", maker: "HONDA CARS INDIA LTD", model: "Amaze", variants: ["E", "S", "VX"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["RADIANT RED", "METEOROID GREY"] },
  { make: "Tata", maker: "TATA MOTORS LTD", model: "Nexon", variants: ["XE", "XM", "XZ", "XZ Plus"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["FLAME RED", "DAYTONA GREY", "CALGARY WHITE"] },
  { make: "Tata", maker: "TATA MOTORS LTD", model: "Tiago", variants: ["XE", "XM", "XT", "XZ Plus"], fuels: ["petrol", "petrol_cng"], transmissions: ["manual", "automatic"], colours: ["ARIZONA BLUE", "PURE SILVER"] },
  { make: "Mahindra", maker: "MAHINDRA & MAHINDRA LTD", model: "XUV500", variants: ["W6", "W8", "W10"], fuels: ["diesel"], transmissions: ["manual", "automatic"], colours: ["NAPOLI BLACK", "PEARL WHITE"] },
  { make: "Mahindra", maker: "MAHINDRA & MAHINDRA LTD", model: "Scorpio", variants: ["S5", "S7", "S11"], fuels: ["diesel"], transmissions: ["manual"], colours: ["NAPOLI BLACK", "DSAT SILVER"] },
  { make: "Toyota", maker: "TOYOTA KIRLOSKAR MOTOR PVT LTD", model: "Innova Crysta", variants: ["GX", "VX", "ZX"], fuels: ["diesel", "petrol"], transmissions: ["manual", "automatic"], colours: ["SUPER WHITE", "SILVER METALLIC", "AVANT GARDE BRONZE"] },
  { make: "Kia", maker: "KIA INDIA PVT LTD", model: "Seltos", variants: ["HTE", "HTK Plus", "HTX", "GTX Plus"], fuels: ["petrol", "diesel"], transmissions: ["manual", "automatic"], colours: ["GLACIER WHITE PEARL", "INTENSE RED"] },
  { make: "Renault", maker: "RENAULT INDIA PVT LTD", model: "Kwid", variants: ["RXE", "RXL", "RXT"], fuels: ["petrol"], transmissions: ["manual", "automatic"], colours: ["ICE COOL WHITE", "FIERY RED"] },
];

const INSURERS = ["ICICI Lombard General Insurance", "Bajaj Allianz General Insurance", "HDFC ERGO General Insurance", "Tata AIG General Insurance", "New India Assurance"];

/** FNV-1a: the same number always gives the same fake car. */
function hash(s: string) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

function pick<T>(items: readonly T[], seed: number) {
  return items[seed % items.length];
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Numbers with ZZ as the series letters (MH12ZZ1234, 22BH1234ZZ) act as "not on record" so the manual form can be tried. */
export function isMockNotFound(regNumber: string) {
  return /ZZ\d{1,4}$|BH\d{4}ZZ$/.test(regNumber);
}

export function mockRcDetails(regNumber: string, now = new Date()): RcDetails {
  const h = hash(regNumber);
  const car = pick(CATALOGUE, h);
  const variant = pick(car.variants, h >>> 4);
  const fuel = pick(car.fuels, h >>> 8);
  const transmission = pick(car.transmissions, h >>> 10);

  // BH numbers carry their registration year; others get a plausible 2012-2023 car.
  const year = isBhSeries(regNumber) ? 2000 + Number(regNumber.slice(0, 2)) : 2012 + ((h >>> 12) % 12);
  const owners = 1 + ((h >>> 16) % 3);
  let registeredOn = new Date(Date.UTC(year, (h >>> 18) % 12, 1 + ((h >>> 20) % 28)));
  // A BH number from this year can't have been registered in a later month.
  if (registeredOn > now) registeredOn = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  // Insurance renews on the registration anniversary. About 1 in 6 has lapsed in the last 2 months.
  const lapsed = (h >>> 24) % 6 === 0;
  const insurance = new Date(Date.UTC(now.getUTCFullYear(), registeredOn.getUTCMonth(), registeredOn.getUTCDate()));
  if (insurance <= now && !lapsed) insurance.setUTCFullYear(insurance.getUTCFullYear() + 1);
  if (lapsed) insurance.setTime(now.getTime() - (1 + ((h >>> 26) % 60)) * 86_400_000);

  const fuelLabel = fuel === "petrol_cng" ? "PETROL/CNG" : fuel.toUpperCase();

  return {
    make: car.make,
    model: car.model,
    variant,
    fuel,
    transmission,
    year,
    owners,
    insurance_valid_upto: isoDate(insurance),
    raw: {
      source: "mock",
      rc_number: regNumber,
      registration_date: isoDate(registeredOn),
      manufacturing_date: `${String(registeredOn.getUTCMonth() + 1).padStart(2, "0")}/${year}`,
      owner_name: "R***** K****",
      owner_number: String(owners),
      maker_description: car.maker,
      maker_model: `${car.model.toUpperCase()} ${variant.toUpperCase()}`,
      body_type: "SALOON",
      vehicle_category: "LMV",
      fuel_type: fuelLabel,
      color: pick(car.colours, h >>> 6),
      norms_type: year >= 2020 ? "BHARAT STAGE VI" : "BHARAT STAGE IV",
      insurance_company: pick(INSURERS, h >>> 14),
      insurance_upto: isoDate(insurance),
      registered_at: isBhSeries(regNumber) ? "BH SERIES" : `${regNumber.slice(0, 2)} RTO ${regNumber.slice(2, 4).replace(/\D/g, "")}`,
      rc_status: "ACTIVE",
    },
  };
}

export function createMockProvider({ delayMs = 700 }: { delayMs?: number } = {}): RcProvider {
  return {
    name: "mock",
    async lookup(regNumber) {
      // Feels like a real network call so loading states get exercised.
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      return isMockNotFound(regNumber) ? null : mockRcDetails(regNumber);
    },
  };
}
