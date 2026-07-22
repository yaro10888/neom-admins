/**
 * تحويل أسماء الحقول بين قاعدة البيانات والتطبيق.
 *
 * Postgres يستخدم snake_case (member_id) والتطبيق يستخدم camelCase (memberId).
 * التحويل هنا تلقائي وعام، فلا نحتاج كتابة مُحوّل يدوي لكل جدول.
 */

/** الحقول الرقمية — تُحوَّل قسراً إلى أرقام لأن Postgres قد يعيد numeric كنص. */
const NUMERIC_FIELDS = new Set([
  'age',
  'level',
  'salary',
  'amount',
  'budget',
  'spent',
  'progress',
  'impressions',
  'clicks',
  'conversions',
  'number',
]);

function toSnake(key: string): string {
  return key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function toCamel(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, letter: string) => letter.toUpperCase());
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** صف من قاعدة البيانات → كيان التطبيق. */
export function rowToEntity<T>(row: Record<string, unknown>): T {
  return convert(row, toCamel, true) as T;
}

/** كيان التطبيق → صف لقاعدة البيانات. */
export function entityToRow(entity: Record<string, unknown>): Record<string, unknown> {
  return convert(entity, toSnake, false) as Record<string, unknown>;
}

function convert(
  value: unknown,
  transform: (key: string) => string,
  coerceNumbers: boolean,
): unknown {
  if (Array.isArray(value)) {
    return value.map((item) => convert(item, transform, coerceNumbers));
  }

  if (!isPlainObject(value)) return value;

  const result: Record<string, unknown> = {};
  for (const [key, raw] of Object.entries(value)) {
    const nextKey = transform(key);
    let nextValue = convert(raw, transform, coerceNumbers);

    // Postgres يعيد أحياناً numeric كنص — نعيده رقماً حتى تعمل الحسابات
    if (coerceNumbers && typeof nextValue === 'string' && NUMERIC_FIELDS.has(nextKey)) {
      const parsed = Number(nextValue);
      if (!Number.isNaN(parsed)) nextValue = parsed;
    }

    result[nextKey] = nextValue;
  }

  return result;
}
