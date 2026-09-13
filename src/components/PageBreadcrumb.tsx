import { useNavigate } from "react-router-dom";
import { ChevronLeft, Home } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  crumbs: Crumb[];
  /** Render as a sticky bar at the top of the page */
  sticky?: boolean;
}

const PageBreadcrumb = ({ crumbs, sticky = true }: PageBreadcrumbProps) => {
  const navigate = useNavigate();

  const inner = (
    <nav
      aria-label="מיקום בניווט"
      className="flex flex-wrap items-center gap-1 text-sm text-muted-foreground"
      dir="rtl"
    >
      <button
        onClick={() => navigate("/")}
        title="דף הבית"
        className="flex items-center transition-colors hover:text-primary"
      >
        <Home className="h-3.5 w-3.5" />
      </button>

      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            <ChevronLeft className="h-3.5 w-3.5 shrink-0" />
            {crumb.to && !isLast ? (
              <button
                onClick={() => navigate(crumb.to!)}
                className="transition-colors hover:text-primary"
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
    <div className="sticky top-0 z-30 -mx-4 mb-4 border-b border-border bg-background/85 px-4 py-3 backdrop-blur-sm md:-mx-8 md:px-8 lg:-mx-12 lg:px-12">
      {inner}
    </div>
  );
};

export default PageBreadcrumb;
