import { z } from "zod";

const isoDate = z.string().refine((value) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
}, "Select a valid date.");

export const packageInput = z.object({
  packageId: z.string().uuid().optional().or(z.literal("")),
  code: z.string().trim().min(2).max(30).regex(/^[A-Z0-9-]+$/i, "Use letters, numbers, and hyphens for the package code."),
  name: z.string().trim().min(3).max(120),
  durationDays: z.coerce.number().int().min(1).max(90),
  departureDate: isoDate,
  returnDate: isoDate,
  makkahHotel: z.string().trim().max(120),
  madinahHotel: z.string().trim().max(120),
  roomType: z.string().trim().max(60),
  transportDetails: z.string().trim().max(500),
  flightDetails: z.string().trim().max(500),
  inclusions: z.string().max(2000),
  exclusions: z.string().max(2000),
  capacity: z.coerce.number().int().min(1).max(10000),
  price: z.string().trim().refine(
    (value) => /^\d{1,10}(?:\.\d{1,2})?$/.test(value) && BigInt(value.replace(".", "")) > BigInt(0),
    "Enter a positive amount with up to two decimal places.",
  ),
  currency: z.string().trim()
    .regex(/^[A-Za-z]{3}$/, "Enter a 3-letter currency code.")
    .refine((value) => {
      try {
        new Intl.NumberFormat("en", { style: "currency", currency: value.toUpperCase() });
        return true;
      } catch (error) {
        if (error instanceof RangeError) return false;
        throw error;
      }
    }, "Enter a supported ISO currency code."),
  status: z.enum(["DRAFT", "ACTIVE", "FULL", "ARCHIVED"]),
}).refine((value) => value.returnDate > value.departureDate, {
  message: "Return date must be after the departure date.",
  path: ["returnDate"],
});

export type PackageInput = z.infer<typeof packageInput>;

export function decimalToMinorUnits(value: string) {
  const [whole, fraction = ""] = value.split(".");
  return BigInt(whole) * BigInt(100) + BigInt(fraction.padEnd(2, "0"));
}
