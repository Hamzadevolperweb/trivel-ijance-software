export function formatMinorCurrency(amountMinor: bigint, currency: string, locale = "en-PK") {
  const zero = BigInt(0);
  const minorUnitScale = BigInt(100);
  const negative = amountMinor < zero;
  const absolute = negative ? -amountMinor : amountMinor;
  const wholeUnits = absolute / minorUnitScale;
  const minorUnits = (absolute % minorUnitScale).toString().padStart(2, "0");
  const displayUnits = negative ? (wholeUnits === zero ? -BigInt(1) : -wholeUnits) : wholeUnits;
  const parts = new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).formatToParts(displayUnits);

  return parts.map((part) => {
    if (part.type === "fraction") return minorUnits;
    if (negative && wholeUnits === zero && part.type === "integer") return "0";
    return part.value;
  }).join("");
}
