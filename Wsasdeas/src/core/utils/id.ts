/** توليد المعرّفات والتواريخ — مكان واحد حتى يسهل تغييره لاحقاً. */

/**
 * يولّد معرّفاً فريداً.
 * يستخدم `crypto.randomUUID` عند توفره، ويسقط إلى بديل عند غيابه.
 */
export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

/** الوقت الحالي بصيغة ISO 8601. */
export function nowIso(): string {
  return new Date().toISOString();
}

/** تاريخ اليوم بصيغة YYYY-MM-DD (مناسب لحقول input[type=date]). */
export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}
