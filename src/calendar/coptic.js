/**
 * Civil Gregorian → Coptic (Anno Martyrum) conversion.
 * Pure JS, no network. Valid for modern dates (1900–2100).
 *
 * Coptic New Year (1 Thout) is 11 September, or 12 September in Gregorian leap years.
 */

export const COPTIC_MONTHS = [
  "Thout",
  "Paopi",
  "Hathor",
  "Koiak",
  "Tobi",
  "Meshir",
  "Paremhat",
  "Paremoude",
  "Pashons",
  "Paoni",
  "Epip",
  "Mesori",
  "Nasie",
];

export function isGregorianLeap(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function utcDay(year, monthIndex, day) {
  return Date.UTC(year, monthIndex, day);
}

export function gregorianToCoptic(date = new Date()) {
  const year = date.getFullYear();
  const month = date.getMonth();
  const day = date.getDate();
  const newYearDay = isGregorianLeap(year) ? 12 : 11;
  const onOrAfterNewYear =
    month > 8 || (month === 8 && day >= newYearDay);

  let copticYear;
  let startYear;
  let startDay;
  if (onOrAfterNewYear) {
    copticYear = year - 283;
    startYear = year;
    startDay = newYearDay;
  } else {
    copticYear = year - 284;
    startYear = year - 1;
    startDay = isGregorianLeap(startYear) ? 12 : 11;
  }

  const elapsed = Math.round(
    (utcDay(year, month, day) - utcDay(startYear, 8, startDay)) / 86400000,
  );
  const copticMonth = Math.floor(elapsed / 30) + 1;
  const copticDay = (elapsed % 30) + 1;
  return { year: copticYear, month: copticMonth, day: copticDay };
}

export function formatCopticDate(date = new Date()) {
  const { year, month, day } = gregorianToCoptic(date);
  const monthName = COPTIC_MONTHS[month - 1] || `Month ${month}`;
  return `${day} ${monthName} ${year}`;
}

export function formatCopticLabel(date = new Date()) {
  return `Coptic: ${formatCopticDate(date)}`;
}
