import type { Crumb } from "@/components/PageBreadcrumb";

interface BuildArgs {
  category?: string | null;
  gallery?: { name?: string | null; slug?: string | null } | null;
  room?: { name?: string | null; slug?: string | null } | null;
  artworkTitle?: string | null;
}

/**
 * Builds the full navigation hierarchy:
 * גלריות > קטגוריה > גלריה > חדר > יצירה
 * Every level except the last one is clickable.
 */
export function buildCrumbs({ category, gallery, room, artworkTitle }: BuildArgs): Crumb[] {
  const crumbs: Crumb[] = [{ label: "גלריות", to: "/" }];

  if (category) {
    crumbs.push({ label: category, to: `/?category=${encodeURIComponent(category)}` });
  }

  if (gallery?.name) {
    crumbs.push({
      label: gallery.name,
      to: gallery.slug ? `/gallery/${gallery.slug}` : undefined,
    });
  }

  if (room?.name) {
    crumbs.push({
      label: room.name,
      to: gallery?.slug && room.slug ? `/gallery/${gallery.slug}/room/${room.slug}` : undefined,
    });
  }

  if (artworkTitle) {
    crumbs.push({ label: artworkTitle });
  }

  return crumbs;
}
