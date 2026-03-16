import { useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react";

export interface Crumb {
  label: string;
  to?: string;
}

interface PageBreadcrumbProps {
  crumbs: Crumb[];
}

const PageBreadcrumb = ({ crumbs }: PageBreadcrumbProps) => {
  const navigate = useNavigate();

  return (
    <nav className="flex items-center gap-1 text-sm text-muted-foreground" dir="rtl">
      {crumbs.map((crumb, i) => {
        const isLast = i === crumbs.length - 1;
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <ChevronLeft className="h-3.5 w-3.5 shrink-0" />}
            {crumb.to && !isLast ? (
              <button
                onClick={() => navigate(crumb.to!)}
                className="transition-colors hover:text-foreground"
              >
                {crumb.label}
              </button>
            ) : (
              <span className={isLast ? "font-medium text-foreground" : ""}>
                {crumb.label}
              </span>
            )}
          </span>
        );
      })}
    </nav>
  );
};

export default PageBreadcrumb;
