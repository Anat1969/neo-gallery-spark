import { Link } from "react-router-dom";
import { thumbUrl } from "@/lib/media";

export interface StripWork {
  id: string;
  title: string;
  image_url: string;
  media_type?: string | null;
}

/**
 * A slow, endless contact strip of the latest works across all galleries.
 * Pauses under the pointer; each frame leads to the work.
 */
const LatestStrip = ({ works }: { works: StripWork[] }) => {
  const loop = [...works, ...works];
  return (
    <section className="relative -mx-4 mb-14 overflow-hidden md:-mx-8 lg:-mx-12" aria-label="עבודות אחרונות">
      <div className="mb-3 px-4 font-mono text-xs tracking-[0.2em] text-muted-foreground md:px-8 lg:px-12">עבודות אחרונות</div>
      <div className="pointer-events-none absolute inset-y-0 left-0 z-[1] w-16 bg-gradient-to-r from-background to-transparent md:w-32" />
      <div className="pointer-events-none absolute inset-y-0 right-0 z-[1] w-16 bg-gradient-to-l from-background to-transparent md:w-32" />
      <div className="strip-track flex w-max gap-4 px-4" style={{ direction: "ltr" }}>
        {loop.map((w, i) => (
          <Link
            key={w.id + i}
            to={`/artwork/${w.id}`}
            className="group relative h-40 shrink-0 overflow-hidden rounded-sm bg-secondary shadow-deep md:h-56"
            aria-label={w.title}
            tabIndex={i >= works.length ? -1 : 0}
          >
            <img
              src={thumbUrl(w.image_url, 480)}
              alt=""
              loading={i < 6 ? "eager" : "lazy"}
              decoding="async"
              className="h-full w-auto max-w-none object-cover transition-transform duration-700 group-hover:scale-105"
              style={{ minWidth: "8rem" }}
            />
            <span dir="rtl" className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-3 pt-8 text-sm font-light text-white transition-transform duration-500 group-hover:translate-y-0">
              {w.title}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
};

export default LatestStrip;
