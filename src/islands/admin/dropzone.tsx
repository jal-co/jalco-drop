import { useRef, useState, type DragEvent } from "react";
import { FileIcon as FileGlyph, UploadIcon } from "lucide-react";
import { cn } from "cn";
import { formatSize } from "@/view/format";

export function Dropzone({ name, accept, hint, onFile }: { name: string; accept?: string; hint: string; onFile?: (file: File | undefined) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File>();
  const [dragging, setDragging] = useState(false);

  const choose = (files: FileList | null) => {
    const next = files?.[0];
    setFile(next);
    onFile?.(next);
  };

  const drop = (event: DragEvent<HTMLLabelElement>) => {
    event.preventDefault();
    setDragging(false);
    if (!input.current || !event.dataTransfer.files.length) return;
    input.current.files = event.dataTransfer.files;
    choose(event.dataTransfer.files);
  };

  return (
    <label
      onDragOver={(event) => { event.preventDefault(); setDragging(true); }}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      className={cn(
        "flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-border bg-field px-6 py-6 text-center transition-colors has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring hover:border-ring/60",
        dragging && "border-marker bg-marker/10",
      )}
    >
      <input ref={input} type="file" name={name} accept={accept} className="sr-only" onChange={(event) => choose(event.target.files)} />
      {file ? (
        <>
          <FileGlyph className="size-5 text-muted-foreground" />
          <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
          <span className="font-mono text-xs text-muted-foreground tabular-nums">{formatSize(file.size)}, click to change</span>
        </>
      ) : (
        <>
          <UploadIcon className="size-5 text-muted-foreground" />
          <span className="text-sm font-medium">Drop a file or click to choose</span>
          <span className="text-xs text-muted-foreground">{hint}</span>
        </>
      )}
    </label>
  );
}
