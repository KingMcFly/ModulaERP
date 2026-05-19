/** Chilean RUT/RUN validation and formatting. Works for nationals (1-29M) and foreigners (50M+). */

export function cleanRut(rut: string): string {
  return rut.replace(/[.\-\s]/g, '').toUpperCase();
}

export function formatRut(rut: string): string {
  const clean = cleanRut(rut);
  if (clean.length < 2) return rut;
  const dv   = clean.slice(-1);
  const body = clean.slice(0, -1);
  const dotted = body.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return `${dotted}-${dv}`;
}

export function validateRut(rut: string): boolean {
  const clean = cleanRut(rut);
  if (!/^\d{7,8}[0-9K]$/.test(clean)) return false;
  const body = clean.slice(0, -1);
  const dv   = clean.slice(-1);
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rem = 11 - (sum % 11);
  const expected = rem === 11 ? '0' : rem === 10 ? 'K' : rem.toString();
  return dv === expected;
}

/** Returns true if the string looks like a RUT (numbers with optional dots/dash, ends in digit or K). */
export function looksLikeRut(value: string): boolean {
  const clean = cleanRut(value);
  return /^\d{7,8}[0-9K]$/.test(clean);
}
