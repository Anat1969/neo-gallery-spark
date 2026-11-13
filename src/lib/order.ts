import { supabase } from "@/integrations/supabase/client";

type OrderTable = "neo_artworks" | "neo_galleries" | "neo_rooms" | "neo_categories";

/** Moves one item to a new index and returns the new list. */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list];
  const [it] = next.splice(from, 1);
  next.splice(to, 0, it);
  return next;
}

/** Saves the order of a list as sort_order 0..n, only for rows whose position changed. */
export async function saveOrder(table: OrderTable, rows: { id: string; sort_order?: number | null }[]) {
  const changed = rows.map((r, i) => ({ id: r.id, i, was: r.sort_order })).filter((r) => r.was !== r.i);
  const results = await Promise.all(changed.map((r) => supabase.from(table).update({ sort_order: r.i }).eq("id", r.id)));
  return results.find((r) => r.error)?.error ?? null;
}

/** The order a person set by dragging; ties fall back to newest first. */
export const bySortOrder = <T extends { sort_order?: number | null; created_at?: string | null }>(a: T, b: T) =>
  (a.sort_order ?? 0) - (b.sort_order ?? 0) || (b.created_at ?? "").localeCompare(a.created_at ?? "");

/** Drag payload between lists (a work onto a room, a gallery onto a category). */
export const DRAG_MIME = "application/x-neo-item";
export const setDragItem = (e: React.DragEvent, kind: "artwork" | "gallery" | "room" | "category", id: string) => {
  e.dataTransfer.setData(DRAG_MIME, JSON.stringify({ kind, id }));
  e.dataTransfer.setData("text/plain", id);
  e.dataTransfer.effectAllowed = "move";
};
export const getDragItem = (e: React.DragEvent): { kind: string; id: string } | null => {
  try {
    const raw = e.dataTransfer.getData(DRAG_MIME);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};
export const isItemDrag = (e: React.DragEvent) => e.dataTransfer.types.includes(DRAG_MIME);
