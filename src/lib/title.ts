/**
 * Titles that are really file names (Midjourney exports such as "anatsht A young woman ... b67265d8 1415 4724 ...")
 * or the empty placeholder are never shown. Returns "" when there is nothing worth showing.
 */
const PLACEHOLDER = "יצירה חדשה";
const UUID_SPACED = /[0-9a-f]{8}[ _-][0-9a-f]{4}[ _-][0-9a-f]{4}[ _-][0-9a-f]{4}[ _-][0-9a-f]{12}/i;

export const isFileLikeTitle = (t: string) =>
  UUID_SPACED.test(t) ||
  /^[a-z0-9]+[_ ](?=.*\s)/i.test(t) && /^[\x20-\x7e]+$/.test(t) && t.length > 40 ||
  /\.(png|jpe?g|webp|gif|mp4|mov|pdf|glb|gltf)$/i.test(t) ||
  /^(img|image|dsc|screenshot|photo)[\s_-]*\d/i.test(t);

export const displayTitle = (t?: string | null) => {
  const s = (t ?? "").trim();
  if (!s || s === PLACEHOLDER || isFileLikeTitle(s)) return "";
  return s;
};

/** Title for a fresh upload: a clean name from the file, or nothing when the name is machine-made. */
export const titleFromFile = (name: string) => {
  const base = name.replace(/\.[^.]+$/, "");
  if (isFileLikeTitle(name) || isFileLikeTitle(base)) return "";
  return base.replace(/[_-]+/g, " ").trim();
};
