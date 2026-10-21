import { supabase, STORAGE_BUCKET } from "@/integrations/supabase/client";

export type MediaType = "image" | "video" | "pdf" | "model" | "audio" | "file";

export const MEDIA_LABEL: Record<MediaType, string> = {
  image: "תמונה",
  video: "וידאו",
  pdf: "PDF",
  model: "תלת־ממד",
  audio: "שמע",
  file: "קובץ",
};

/** Accept string for file inputs: everything Anat produces. */
export const ACCEPT_ALL =
  "image/*,video/*,audio/*,application/pdf,.pdf,.glb,.gltf,.usdz,.obj,.stl,.fbx,.ply,.3dm,.zip,.psd,.ai,.svg";

const MODEL_EXT = ["glb", "gltf", "usdz", "obj", "stl", "fbx", "ply", "3dm"];

const ext = (name: string) => (name.split(".").pop() ?? "").toLowerCase();

export function detectMediaType(file: File): MediaType {
  const e = ext(file.name);
  if (MODEL_EXT.includes(e)) return "model";
  if (file.type === "application/pdf" || e === "pdf") return "pdf";
  if (file.type.startsWith("image/") && e !== "psd") return "image";
  if (file.type.startsWith("video/")) return "video";
  if (file.type.startsWith("audio/")) return "audio";
  return "file";
}

/** Model formats the in-browser viewer can render. */
export const isViewableModel = (url: string) => /\.(glb|gltf)(\?|$)/i.test(url);

const PUBLIC_MARK = `/storage/v1/object/public/${STORAGE_BUCKET}/`;

/**
 * Resized WebP served by Supabase image transformation (a 1.3MB PNG becomes ~30KB at 400px).
 * Falls back to the original URL for anything outside our bucket or not a raster image.
 */
export function thumbUrl(url: string | null | undefined, width: number, quality = 72): string {
  if (!url) return "";
  if (!url.includes(PUBLIC_MARK) || /\.(svg|gif)(\?|$)/i.test(url)) return url;
  return `${url.replace("/storage/v1/object/public/", "/storage/v1/render/image/public/")}?width=${width}&quality=${quality}&resize=contain`;
}

export const srcSet = (url: string | null | undefined, widths = [320, 640, 960, 1400]) =>
  url && url.includes(PUBLIC_MARK) ? widths.map((w) => `${thumbUrl(url, w)} ${w}w`).join(", ") : undefined;

async function putFile(file: Blob, name: string, folder: string): Promise<string> {
  const path = `${folder}/${crypto.randomUUID()}.${ext(name) || "bin"}`;
  const { error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(path, file, { contentType: file.type || undefined, cacheControl: "31536000", upsert: false });
  if (error) {
    if (/maximum allowed size|too large|413/i.test(error.message)) {
      throw new Error("הקובץ גדול מהמגבלה של האחסון. נסי קובץ קטן יותר או דחוס.");
    }
    throw error;
  }
  return supabase.storage.from(STORAGE_BUCKET).getPublicUrl(path).data.publicUrl;
}

const canvasToBlob = (c: HTMLCanvasElement) =>
  new Promise<Blob | null>((res) => c.toBlob((b) => res(b), "image/jpeg", 0.85));

async function videoPoster(file: File): Promise<{ blob: Blob | null; w?: number; h?: number }> {
  const url = URL.createObjectURL(file);
  try {
    const v = document.createElement("video");
    v.muted = true;
    v.playsInline = true;
    v.preload = "auto";
    v.src = url;
    await new Promise<void>((res, rej) => {
      v.onloadeddata = () => res();
      v.onerror = () => rej(new Error("video"));
      setTimeout(() => res(), 8000);
    });
    v.currentTime = Math.min(1, (v.duration || 2) / 3);
    await new Promise<void>((res) => {
      v.onseeked = () => res();
      setTimeout(() => res(), 4000);
    });
    const c = document.createElement("canvas");
    c.width = v.videoWidth || 1280;
    c.height = v.videoHeight || 720;
    c.getContext("2d")?.drawImage(v, 0, 0, c.width, c.height);
    return { blob: await canvasToBlob(c), w: c.width, h: c.height };
  } catch {
    return { blob: null };
  } finally {
    URL.revokeObjectURL(url);
  }
}

async function pdfPoster(file: File): Promise<{ blob: Blob | null; w?: number; h?: number }> {
  try {
    const pdfjs = await import("pdfjs-dist");
    const worker = await import("pdfjs-dist/build/pdf.worker.min.mjs?url");
    pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
    const doc = await pdfjs.getDocument({ data: await file.arrayBuffer() }).promise;
    const page = await doc.getPage(1);
    const vp = page.getViewport({ scale: 1.6 });
    const c = document.createElement("canvas");
    c.width = vp.width;
    c.height = vp.height;
    await page.render({ canvasContext: c.getContext("2d")!, viewport: vp, canvas: c } as never).promise;
    return { blob: await canvasToBlob(c), w: c.width, h: c.height };
  } catch {
    return { blob: null };
  }
}

async function imageSize(file: File): Promise<{ w?: number; h?: number }> {
  try {
    const bmp = await createImageBitmap(file);
    const r = { w: bmp.width, h: bmp.height };
    bmp.close();
    return r;
  } catch {
    return {};
  }
}

export interface UploadedMedia {
  media_url: string;
  media_type: MediaType;
  image_url: string;
  mime: string;
  file_size: number;
  width?: number;
  height?: number;
  title: string;
}

/** Upload any file Anat produces; creates a poster image for video and PDF so the wall stays visual. */
export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const media_type = detectMediaType(file);
  const media_url = await putFile(file, file.name, "artworks");
  let image_url = "";
  let width: number | undefined;
  let height: number | undefined;

  if (media_type === "image") {
    image_url = media_url;
    ({ w: width, h: height } = await imageSize(file));
  } else if (media_type === "video" || media_type === "pdf") {
    const p = media_type === "video" ? await videoPoster(file) : await pdfPoster(file);
    if (p.blob) image_url = await putFile(p.blob, "poster.jpg", "posters");
    width = p.w;
    height = p.h;
  }

  return {
    media_url,
    media_type,
    image_url,
    mime: file.type,
    file_size: file.size,
    width,
    height,
    title: file.name.replace(/\.[^.]+$/, "").replace(/[_-]+/g, " ").trim() || "יצירה חדשה",
  };
}

/** Upload a single image (covers) and return its public URL. */
export const uploadImage = (file: File, folder = "covers") => putFile(file, file.name, folder);
