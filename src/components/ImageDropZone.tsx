import { useCallback, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";

interface ImageDropZoneProps {
  value: string;
  onChange: (url: string) => void;
  bucket?: string;
  folder?: string;
}

const ImageDropZone = ({ value, onChange, bucket = "neo-gallery-images", folder = "covers" }: ImageDropZoneProps) => {
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = useCallback(async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({ title: "שגיאה", description: "רק קבצי תמונה מותרים", variant: "destructive" });
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() ?? "png";
      const path = `${folder}/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage.from(bucket).upload(path, file);
      if (error) throw error;
      const { data } = supabase.storage.from(bucket).getPublicUrl(path);
      onChange(data.publicUrl);
    } catch (err: any) {
      toast({ title: "שגיאה בהעלאה", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  }, [bucket, folder, onChange, toast]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) upload(file);
  }, [upload]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    const file = Array.from(e.clipboardData.items).find(i => i.type.startsWith("image/"))?.getAsFile();
    if (file) {
      e.preventDefault();
      upload(file);
    }
  }, [upload]);

  return (
    <div className="space-y-2">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onPaste={handlePaste}
        onClick={() => !value && fileRef.current?.click()}
        tabIndex={0}
        className={`relative flex aspect-video cursor-pointer items-center justify-center overflow-hidden rounded-lg border-2 border-dashed transition-colors ${
          dragging
            ? "border-primary bg-primary/10"
            : value
              ? "border-border"
              : "border-muted-foreground/30 hover:border-primary/50"
        }`}
      >
        {uploading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/70">
            <span className="text-xs text-muted-foreground">טוען...</span>
          </div>
        )}

        {value ? (
          <>
            <img src={value} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(""); }}
              aria-label="הסרת תמונה"
              className="absolute right-2 top-2 flex h-7 items-center justify-center rounded-full bg-background/80 px-2 text-xs text-muted-foreground backdrop-blur-sm hover:text-destructive"
            >
              הסרה
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); fileRef.current?.click(); }}
              aria-label="העלאת תמונה אחרת"
              className="absolute bottom-2 right-2 flex h-7 items-center justify-center rounded-full bg-background/80 px-2 text-xs text-muted-foreground backdrop-blur-sm hover:text-primary"
            >
              העלאה
            </button>
          </>
        ) : (
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <p className="text-xs">גררי תמונה, הדביקי מהלוח, או לחצי לבחירה</p>
          </div>
        )}
      </div>

      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={handlePaste}
        placeholder="או הדביקי URL של תמונה"
        dir="ltr"
        className="text-left text-xs"
      />

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) upload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
};

export default ImageDropZone;
