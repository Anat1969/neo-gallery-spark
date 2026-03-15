import { useState } from "react";
import { Share2, Printer, Mail, Link2, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface ShareExportProps {
  title: string;
  topic: string;
  post: string;
  tags: string[];
  imageUrl: string;
  style?: string;
  concept?: string;
  year?: number;
  inspirationUrl?: string;
  /** Show admin-only export button */
  isAdmin?: boolean;
}

const ShareExport = ({
  title,
  topic,
  post,
  tags,
  imageUrl,
  style,
  concept,
  year,
  inspirationUrl,
  isAdmin = false,
}: ShareExportProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState<string | null>(null);

  const url = window.location.href;

  const withLoading = async (key: string, fn: () => Promise<void>) => {
    setLoading(key);
    try {
      await fn();
    } catch {
      toast({ title: "הפעולה נכשלה — נסי שוב", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const handleShare = () =>
    withLoading("share", async () => {
      if (navigator.share) {
        await navigator.share({ title, text: topic, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "הקישור הועתק" });
      }
    });

  const handlePrint = () =>
    withLoading("print", async () => {
      window.print();
    });

  const handleEmail = () =>
    withLoading("email", async () => {
      const subject = encodeURIComponent(title);
      const body = encodeURIComponent(`${title}\n${topic}\n\n${post}\n\n${url}`);
      window.open(`mailto:?subject=${subject}&body=${body}`, "_self");
      toast({ title: "אפליקציית המייל נפתחה" });
    });

  const handleCopyLink = () =>
    withLoading("copy", async () => {
      await navigator.clipboard.writeText(url);
      toast({ title: "הקישור הועתק ללוח" });
    });

  const handleExport = () =>
    withLoading("export", async () => {
      const data = { title, topic, post, tags, imageUrl, style, concept, year, inspirationUrl, url };
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `${title.replace(/\s+/g, "-")}.json`;
      a.click();
      URL.revokeObjectURL(a.href);
      toast({ title: "הקובץ הורד בהצלחה" });
    });

  const actions = [
    { key: "share", label: "שתפי", icon: Share2, onClick: handleShare },
    { key: "print", label: "הדפיסי", icon: Printer, onClick: handlePrint },
    { key: "email", label: "שלחי", icon: Mail, onClick: handleEmail },
    { key: "copy", label: "העתיקי קישור", icon: Link2, onClick: handleCopyLink },
  ];

  return (
    <>
      {/* Action bar */}
      <div className="flex flex-wrap gap-2">
        {actions.map(({ key, label, icon: Icon, onClick }) => (
          <Button
            key={key}
            variant="outline"
            onClick={onClick}
            disabled={loading !== null}
            className="gap-2 border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Icon className="h-4 w-4" />
            {label}
          </Button>
        ))}
        {isAdmin && (
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={loading !== null}
            className="gap-2 border-muted-foreground/40 text-muted-foreground hover:border-primary hover:text-primary"
          >
            <Download className="h-4 w-4" />
            ייצאי נתונים
          </Button>
        )}
      </div>

      {/* Print stylesheet */}
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #print-area, #print-area * { visibility: visible !important; }
          #print-area {
            position: absolute; inset: 0;
            background: white; color: black;
            padding: 2rem; font-family: Heebo, sans-serif;
            direction: rtl;
          }
          #print-area img { max-width: 100%; max-height: 50vh; object-fit: contain; }
          #print-area h1 { font-size: 1.5rem; margin: 1rem 0 0.25rem; }
          #print-area .topic { color: #666; margin-bottom: 0.75rem; }
          #print-area .post { line-height: 1.7; margin-bottom: 1rem; }
          #print-area .tags { display: flex; flex-wrap: wrap; gap: 0.5rem; }
          #print-area .tag { border: 1px solid #333; border-radius: 999px; padding: 0.15rem 0.6rem; font-size: 0.75rem; }
        }
      `}</style>
      <div id="print-area" className="hidden">
        <img src={imageUrl} alt={title} />
        <h1>{title}</h1>
        <p className="topic">{topic}</p>
        <p className="post">{post}</p>
        <div className="tags">
          {tags.map((t) => (
            <span key={t} className="tag">{t}</span>
          ))}
        </div>
      </div>
    </>
  );
};

export default ShareExport;
