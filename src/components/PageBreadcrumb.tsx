import { useNavigate } from "react-router-dom";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  crumbs: Crumb[];
  /** Render as a sticky bar at the top of the page */
  sticky?: boolean;
}

const PageBreadcrumb = ({ crumbs, sticky = false }: PageBreadcrumbProps) => {
  const navigate = useNavigate();

  const inner = (
    <nav
      aria-label="מיקום בניווט"
      className="mb-6 flex flex-wrap items-center gap-1 font-mono text-xs text-muted-foreground"
      dir="rtl"
    >
      <button
        onClick={() => navigate("/")}
        title="דף הבית"
        className="flex min-h-0 items-center transition-colors hover:text-foreground"
      >
        בית
      </button>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <span aria-hidden="true" className="shrink-0 text-muted-foreground">/</span>
            {crumb.to && !isLast ? (
              <button
                onClick={() => navigate(crumb.to!)}
                className="min-h-0 transition-colors hover:text-foreground"
              >
                {crumb.label}
              </button>
            ) : (
              <span
                aria-current={isLast ? "page" : undefined}
                className={isLast ? "font-medium text-foreground" : ""}
              >
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );

  if (!sticky) return inner;

  return (
    <div className="sticky top-16 z-30 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
      {inner}
    </div>
  );
};

export default PageBreadcrumb;
