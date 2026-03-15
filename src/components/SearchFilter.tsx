import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Search, ChevronDown, X, ArrowRight } from "lucide-react";

/* ─── Types ─── */

interface SearchResult {
  id: string;
  title: string;
  galleryId: string;
  galleryName: string;
  gallerySlug: string;
  category: string;
  style: string;
  year: number;
  imageUrl: string;
  tags: string[];
}

type SortOption = "newest" | "oldest" | "alpha";

const CATEGORIES = [
  { key: "Fashion", label: "אופנה" },
  { key: "Interior", label: "פנים" },
  { key: "Architecture", label: "אדריכלות" },
  { key: "Tools", label: "כלים" },
  { key: "Art", label: "אומנות" },
  { key: "Sculpture", label: "פיסול" },
  { key: "Photography", label: "צילום" },
];

const MOCK_GALLERIES = [
  { id: "g1", name: "חלומות עירוניים", slug: "urban-dreams" },
  { id: "g2", name: "עתיד הבד", slug: "fabric-futures" },
  { id: "g3", name: "מרחבים פנימיים", slug: "inner-spaces" },
];

const MOCK_RESULTS: SearchResult[] = [
  { id: "a1", title: "מגדל הרוח", galleryId: "g1", galleryName: "חלומות עירוניים", gallerySlug: "urban-dreams", category: "Architecture", style: "ניאו-ברוטליזם", year: 2024, imageUrl: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", tags: ["אדריכלות", "AI"] },
  { id: "a2", title: "גשר הזכוכית", galleryId: "g1", galleryName: "חלומות עירוניים", gallerySlug: "urban-dreams", category: "Architecture", style: "מינימליזם", year: 2023, imageUrl: "https://images.unsplash.com/photo-1511818966892-d7d671e672a2?w=600&q=80", tags: ["תשתיות", "זכוכית"] },
  { id: "a3", title: "שמלת הלילה", galleryId: "g2", galleryName: "עתיד הבד", gallerySlug: "fabric-futures", category: "Fashion", style: "אוונגרד", year: 2024, imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85f82e?w=600&q=80", tags: ["אופנה", "AI"] },
  { id: "a4", title: "סלון הצללים", galleryId: "g3", galleryName: "מרחבים פנימיים", gallerySlug: "inner-spaces", category: "Interior", style: "מודרני", year: 2022, imageUrl: "https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=600&q=80", tags: ["פנים", "תאורה"] },
  { id: "a5", title: "פסל האוויר", galleryId: "g1", galleryName: "חלומות עירוניים", gallerySlug: "urban-dreams", category: "Sculpture", style: "אורגני", year: 2021, imageUrl: "https://images.unsplash.com/photo-1544413164-5f1b361f5bfa?w=600&q=80", tags: ["פיסול", "חלל"] },
  { id: "a6", title: "כלי הנשמה", galleryId: "g2", galleryName: "עתיד הבד", gallerySlug: "fabric-futures", category: "Tools", style: "פונקציונלי", year: 2020, imageUrl: "https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80", tags: ["כלים", "עיצוב"] },
  { id: "a7", title: "רגע של אמת", galleryId: "g3", galleryName: "מרחבים פנימיים", gallerySlug: "inner-spaces", category: "Photography", style: "דוקומנטרי", year: 2023, imageUrl: "https://images.unsplash.com/photo-1493863641943-9b68992a8d07?w=600&q=80", tags: ["צילום", "רגע"] },
  { id: "a8", title: "צבע חופשי", galleryId: "g1", galleryName: "חלומות עירוניים", gallerySlug: "urban-dreams", category: "Art", style: "אקספרסיוניזם", year: 2022, imageUrl: "https://images.unsplash.com/photo-1547891654-e66ed7ebb968?w=600&q=80", tags: ["אומנות", "צבע"] },
];

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(CATEGORIES.map((c) => [c.key, c.label]));

type SearchState = "idle" | "loading" | "error" | "loaded";

/* ─── Hook: debounce ─── */

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

/* ─── Component ─── */

const SearchFilter = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 300);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState("");
  const [yearRange, setYearRange] = useState<[number, number]>([2020, 2024]);
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [state] = useState<SearchState>("loaded");

  const toggleCategory = useCallback((key: string) => {
    setSelectedCategories((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key]
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedCategories([]);
    setStyleFilter("");
    setYearRange([2020, 2024]);
    setGalleryFilter("all");
    setSortBy("newest");
  }, []);

  const hasActiveFilters = selectedCategories.length > 0 || styleFilter || galleryFilter !== "all" || yearRange[0] !== 2020 || yearRange[1] !== 2024;

  const results = useMemo(() => {
    let filtered = [...MOCK_RESULTS];

    // Text search
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.galleryName.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    // Category
    if (selectedCategories.length > 0) {
      filtered = filtered.filter((r) => selectedCategories.includes(r.category));
    }

    // Style
    if (styleFilter) {
      const s = styleFilter.toLowerCase();
      filtered = filtered.filter((r) => r.style.toLowerCase().includes(s));
    }

    // Year
    filtered = filtered.filter((r) => r.year >= yearRange[0] && r.year <= yearRange[1]);

    // Gallery
    if (galleryFilter !== "all") {
      filtered = filtered.filter((r) => r.galleryId === galleryFilter);
    }

    // Sort
    switch (sortBy) {
      case "newest":
        filtered.sort((a, b) => b.year - a.year);
        break;
      case "oldest":
        filtered.sort((a, b) => a.year - b.year);
        break;
      case "alpha":
        filtered.sort((a, b) => a.title.localeCompare(b.title, "he"));
        break;
    }

    return filtered;
  }, [debouncedQuery, selectedCategories, styleFilter, yearRange, galleryFilter, sortBy]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      {/* Back */}
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה
      </Button>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="חפשי יצירה..."
          className="h-[52px] w-full rounded-lg border border-muted-foreground/30 bg-secondary pr-12 pl-4 text-base text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary"
        />
        {query && (
          <button onClick={() => setQuery("")} className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Filters panel */}
      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              פילטרים
              {hasActiveFilters && (
                <span className="mr-1 h-2 w-2 rounded-full bg-primary" />
              )}
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">
              נקי פילטרים
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4 space-y-5 rounded-lg border border-border bg-card p-5">
          {/* Category chips */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">קטגוריה</p>
            <div className="flex flex-wrap gap-2">
              {CATEGORIES.map((cat) => {
                const active = selectedCategories.includes(cat.key);
                return (
                  <button
                    key={cat.key}
                    onClick={() => toggleCategory(cat.key)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/40 text-foreground hover:border-foreground"
                    }`}
                  >
                    {cat.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Style */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">סגנון</p>
            <Input
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              placeholder="למשל: מינימליזם"
              className="border-muted-foreground/30 bg-secondary text-foreground focus:border-primary"
            />
          </div>

          {/* Year range */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              שנה: {yearRange[0]}–{yearRange[1]}
            </p>
            <Slider
              min={2020}
              max={2024}
              step={1}
              value={yearRange}
              onValueChange={(v) => setYearRange(v as [number, number])}
              className="py-2"
            />
          </div>

          {/* Gallery dropdown */}
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">גלריה</p>
            <Select value={galleryFilter} onValueChange={setGalleryFilter}>
              <SelectTrigger className="border-muted-foreground/30 bg-secondary text-foreground">
                <SelectValue placeholder="כל הגלריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הגלריות</SelectItem>
                {MOCK_GALLERIES.map((g) => (
                  <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      {/* Sort + count bar */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {state === "loaded" ? `נמצאו ${results.length} יצירות` : ""}
        </p>
        <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortOption)}>
          <SelectTrigger className="w-40 border-muted-foreground/30 bg-secondary text-foreground">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">חדש ביותר</SelectItem>
            <SelectItem value="oldest">ישן ביותר</SelectItem>
            <SelectItem value="alpha">א–ב</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Loading */}
      {state === "loading" && (
        <div className="art-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="p-4 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {state === "error" && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">שגיאה בחיפוש</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {/* Empty results */}
      {state === "loaded" && results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא נמצאו יצירות התואמות את החיפוש</p>
          <Button variant="outline" onClick={clearFilters}>נקי פילטרים</Button>
        </div>
      )}

      {/* Results grid */}
      {state === "loaded" && results.length > 0 && (
        <div className="art-grid">
          {results.map((r) => (
            <button
              key={r.id}
              onClick={() => navigate(`/artwork/${r.id}`)}
              className="group overflow-hidden rounded-lg border border-border bg-card text-right transition-all hover:border-primary/40 hover:shadow-[0_0_20px_hsl(var(--primary)/0.1)]"
            >
              <div className="relative aspect-[4/3] overflow-hidden">
                <img
                  src={r.imageUrl}
                  alt={r.title}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform group-hover:scale-105"
                />
                <span className="absolute left-3 top-3 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
                  {CATEGORY_LABELS[r.category] ?? r.category}
                </span>
              </div>
              <div className="p-4">
                <h3 className="text-base font-semibold text-foreground">{r.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{r.galleryName}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default SearchFilter;
