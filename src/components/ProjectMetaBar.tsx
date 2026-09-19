import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ExternalLink, Save, Sparkles } from "lucide-react";

type MetaTable = "galleries" | "categories";

interface ProjectMetaBarProps {
  table: MetaTable;
  rowId: string;
  label: string;
  projectName: string | null | undefined;
  appUrl: string | null | undefined;
  editable: boolean;
  onSaved?: () => void;
}

const normalizeUrl = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

const ProjectMetaBar = ({
  table,
  rowId,
  label,
  projectName,
  appUrl,
  editable,
  onSaved,
}: ProjectMetaBarProps) => {
  const { toast } = useToast();
  const [project, setProject] = useState(projectName ?? "");
  const [url, setUrl] = useState(appUrl ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setProject(projectName ?? "");
    setUrl(appUrl ?? "");
  }, [projectName, appUrl, rowId]);

  const dirty = project !== (projectName ?? "") || url !== (appUrl ?? "");

  const save = async () => {
    setSaving(true);
    const { error } = await supabase
      .from(table)
      .update({ project_name: project.trim(), app_name: url.trim() })
      .eq("id", rowId);
    setSaving(false);

    if (error) {
      toast({ title: "שגיאה בשמירה", description: error.message, variant: "destructive" });
      return;
    }
    toast({ title: "פרטי הפרויקט נשמרו" });
    onSaved?.();
  };

  if (!editable) {
    const hasProject = !!(projectName ?? "").trim();
    const hasUrl = !!(appUrl ?? "").trim();
    if (!hasProject && !hasUrl) return null;

    return (
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground" dir="rtl">
        <Sparkles className="h-3.5 w-3.5 text-primary" />
        <span>{label}</span>
        {hasProject && <span className="text-foreground/90">{projectName}</span>}
        {hasUrl && (
          <a
            href={normalizeUrl(appUrl!)}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-primary hover:text-primary/80"
          >
            קישור לאפליקציה
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div
      className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border bg-card p-3"
      dir="rtl"
    >
      <span className="text-sm font-semibold text-muted-foreground">{label}</span>
      <Input
        value={project}
        onChange={(e) => setProject(e.target.value)}
        placeholder="שם הפרויקט שיצר"
        aria-label={`שם הפרויקט — ${label}`}
        className="h-10 w-52"
      />
      <Input
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder="קישור לאפליקציה"
        aria-label={`קישור לאפליקציה — ${label}`}
        className="h-10 w-64"
        dir="ltr"
      />
      <Button
        onClick={save}
        disabled={!dirty || saving}
        size="sm"
        className="h-10 gap-1"
        title="שמירת שם הפרויקט והקישור"
      >
        <Save className="h-4 w-4" />
        {saving ? "שומרת..." : "שמירה"}
      </Button>
    </div>
  );
};

export default ProjectMetaBar;
