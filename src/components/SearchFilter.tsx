import { useState, useMemo, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
  topic: string;
}

type SortOption = "newest" | "oldest" | "alpha";

function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const SearchFilter = () => {
  const navigate = useNavigate();

  const [query, setQuery] = useState("");
  const debouncedQuery = useDebounce(query, 250);

  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [styleFilter, setStyleFilter] = useState("");
  const [yearRange, setYearRange] = useState<[number, number]>([2000, new Date().getFullYear()]);
  const [galleryFilter, setGalleryFilter] = useState("all");
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: rawResults = [], isLoading, isError } = useQuery({
    queryKey: ["search-artworks"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artworks")
        .select(
          "id, title, topic, image_url, style, year, tags, gallery_id, gallery:galleries(id, name, slug, category)",
        );

      if (error) throw error;

      return (data ?? []).map((row: any) => ({
        id: row.id,
        title: row.title ?? "",
        topic: row.topic ?? "",
        galleryId: row.gallery_id,
        galleryName: row.gallery?.name ?? "",
        gallerySlug: row.gallery?.slug ?? "",
        category: row.gallery?.category ?? "",
        style: row.style ?? "",
        year: row.year ?? new Date().getFullYear(),
        imageUrl: row.image_url ?? "",
        tags: row.tags ?? [],
      })) as SearchResult[];
    },
  });

  const categoryOptions = useMemo(
    () => Array.from(new Set(rawResults.map((r) => r.category).filter(Boolean))),
    [rawResults],
  );

  const galleryOptions = useMemo(
    () =>
      Array.from(
        new Map(
          rawResults.map((r) => [r.galleryId, { id: r.galleryId, name: r.galleryName }]),
        ).values(),
      ).filter((g) => g.id && g.name),
    [rawResults],
  );

  const minYear = useMemo(
    () => Math.min(...rawResults.map((r) => r.year), new Date().getFullYear()),
    [rawResults],
  );
  const maxYear = useMemo(
    () => Math.max(...rawResults.map((r) => r.year), new Date().getFullYear()),
    [rawResults],
  );

  useEffect(() => {
    if (rawResults.length > 0) {
      setYearRange([minYear, maxYear]);
    }
  }, [minYear, maxYear, rawResults.length]);

  const toggleCategory = useCallback((category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((c) => c !== category) : [...prev, category],
    );
  }, []);

  const clearFilters = useCallback(() => {
    setQuery("");
    setSelectedCategories([]);
    setStyleFilter("");
    setYearRange([minYear, maxYear]);
    setGalleryFilter("all");
    setSortBy("newest");
  }, [maxYear, minYear]);

  const hasActiveFilters =
    selectedCategories.length > 0 ||
    styleFilter ||
    galleryFilter !== "all" ||
    yearRange[0] !== minYear ||
    yearRange[1] !== maxYear;

  const results = useMemo(() => {
    let filtered = [...rawResults];

    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      filtered = filtered.filter(
        (r) =>
          r.title.toLowerCase().includes(q) ||
          r.topic.toLowerCase().includes(q) ||
          r.galleryName.toLowerCase().includes(q) ||
          r.tags.some((t) => t.toLowerCase().includes(q)),
      );
    }

    if (selectedCategories.length > 0) {
      filtered = filtered.filter((r) => selectedCategories.includes(r.category));
    }

    if (styleFilter) {
      const s = styleFilter.toLowerCase();
      filtered = filtered.filter((r) => r.style.toLowerCase().includes(s));
    }

    filtered = filtered.filter((r) => r.year >= yearRange[0] && r.year <= yearRange[1]);

    if (galleryFilter !== "all") {
      filtered = filtered.filter((r) => r.galleryId === galleryFilter);
    }

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
  }, [
    debouncedQuery,
    galleryFilter,
    rawResults,
    selectedCategories,
    sortBy,
    styleFilter,
    yearRange,
  ]);

  return (
    <div className="min-h-screen bg-background px-4 py-8 md:px-8 lg:px-12">
      <Button
        variant="ghost"
        onClick={() => navigate("/")}
        className="mb-6 gap-2 text-muted-foreground hover:text-foreground"
      >
        <ArrowRight className="h-4 w-4" />
        חזרה
      </Button>

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
          <button
            onClick={() => setQuery("")}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      <Collapsible open={filtersOpen} onOpenChange={setFiltersOpen} className="mb-6">
        <div className="flex items-center justify-between">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
              <ChevronDown className={`h-4 w-4 transition-transform ${filtersOpen ? "rotate-180" : ""}`} />
              פילטרים
              {hasActiveFilters && <span className="mr-1 h-2 w-2 rounded-full bg-primary" />}
            </Button>
          </CollapsibleTrigger>
          {hasActiveFilters && (
            <Button variant="ghost" onClick={clearFilters} className="text-sm text-muted-foreground hover:text-foreground">
              נקי פילטרים
            </Button>
          )}
        </div>

        <CollapsibleContent className="mt-4 space-y-5 rounded-lg border border-border bg-card p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-foreground">קטגוריה</p>
            <div className="flex flex-wrap gap-2">
              {categoryOptions.map((category) => {
                const active = selectedCategories.includes(category);
                return (
                  <button
                    key={category}
                    onClick={() => toggleCategory(category)}
                    className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${
                      active
                        ? "bg-primary text-primary-foreground"
                        : "border border-muted-foreground/40 text-foreground hover:border-foreground"
                    }`}
                  >
                    {category}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">סגנון</p>
            <Input
              value={styleFilter}
              onChange={(e) => setStyleFilter(e.target.value)}
              placeholder="למשל: מינימליזם"
              className="border-muted-foreground/30 bg-secondary text-foreground focus:border-primary"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">
              שנה: {yearRange[0]}–{yearRange[1]}
            </p>
            <Slider
              min={minYear}
              max={maxYear}
              step={1}
              value={yearRange}
              onValueChange={(v) => setYearRange(v as [number, number])}
              className="py-2"
            />
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-foreground">גלריה</p>
            <Select value={galleryFilter} onValueChange={setGalleryFilter}>
              <SelectTrigger className="border-muted-foreground/30 bg-secondary text-foreground">
                <SelectValue placeholder="כל הגלריות" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">כל הגלריות</SelectItem>
                {galleryOptions.map((g) => (
                  <SelectItem key={g.id} value={g.id}>
                    {g.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CollapsibleContent>
      </Collapsible>

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">{!isLoading ? `נמצאו ${results.length} יצירות` : ""}</p>
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

      {isLoading && (
        <div className="art-grid">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="overflow-hidden rounded-lg bg-card">
              <Skeleton className="aspect-[4/3] w-full" />
              <div className="space-y-2 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isError && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">שגיאה בחיפוש</p>
          <Button onClick={() => window.location.reload()}>נסי שוב</Button>
        </div>
      )}

      {!isLoading && !isError && results.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-4 py-24">
          <p className="text-lg text-muted-foreground">לא נמצאו תוצאות</p>
          <Button variant="outline" onClick={clearFilters}>
            נקי פילטרים
          </Button>
        </div>
      )}

      {!isLoading && !isError && results.length > 0 && (
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
                  {r.category}
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
