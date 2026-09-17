export const slugify = (text: string) =>
  text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u0590-\u05FF\s-]/g, "")
    .replace(/[\s]+/g, "-");

/**
 * Returns `base`, or `base-2`, `base-3`, ... until the result is not already taken.
 * `taken` should contain every slug currently in use, excluding the row being edited.
 */
export const uniqueSlug = (base: string, taken: Iterable<string>) => {
  const used = new Set(taken);
  if (!used.has(base)) return base;

  let suffix = 2;
  while (used.has(`${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
};

const FALLBACK = "הפעולה נכשלה";

/** Converts a raw database error into a short Hebrew message. */
export const friendlyDbError = (error: unknown): string => {
  const err = error as { code?: string; message?: string } | null;
  const message = typeof err?.message === "string" ? err.message : "";

  if (err?.code === "23505" || /duplicate key value/.test(message)) {
    if (/categories_name_key/.test(message)) return "יש כבר קטגוריה עם השם הזה";
    if (/galleries_slug_key/.test(message)) return "יש כבר גלריה עם הכתובת הזו";
    if (/artworks_pkey|favorites/.test(message)) return "הפריט כבר קיים";
    return "יש כבר פריט עם השם הזה — בחרי שם אחר";
  }

  if (err?.code === "23503") return "אי אפשר לשמור — פריט קשור חסר";
  if (err?.code === "42501" || /row level security/.test(message)) {
    return "אין לך הרשאה לבצע את הפעולה הזו";
  }

  return message || FALLBACK;
};
