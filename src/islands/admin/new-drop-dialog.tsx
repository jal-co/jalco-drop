import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger, DialogClose } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Dropzone } from "./dropzone";

const EXPIRY_OPTIONS = [
  { value: "", label: "Never" },
  { value: "1h", label: "1 hour" },
  { value: "1d", label: "1 day" },
  { value: "7d", label: "7 days" },
  { value: "30d", label: "30 days" },
];

export function NewDropDialog() {
  const [mode, setMode] = useState("file");
  const [fileName, setFileName] = useState<string>();
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        <span className="max-sm:sr-only">New drop</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New drop</DialogTitle>
        </DialogHeader>
        <form method="post" action="/api/items" encType="multipart/form-data" onSubmit={() => setSubmitting(true)}>
          <FieldGroup className="gap-5">
            <Tabs value={mode} onValueChange={(value) => setMode(String(value))}>
              <TabsList className="bg-field shadow-rim">
                <TabsTrigger value="file">File</TabsTrigger>
                <TabsTrigger value="text">Paste text</TabsTrigger>
              </TabsList>
              <TabsContent value="file" keepMounted className="pt-3 data-hidden:hidden">
                <Dropzone name="file" hint="Up to 100 MB" onFile={(file) => setFileName(file?.name)} />
              </TabsContent>
              <TabsContent value="text" keepMounted className="pt-3 data-hidden:hidden">
                <Textarea name="text" rows={8} spellCheck={false} aria-label="Text" disabled={mode !== "text"} required={mode === "text"} />
              </TabsContent>
            </Tabs>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="drop-name">Name</FieldLabel>
                <Input id="drop-name" name="name" autoComplete="off" placeholder={fileName ?? (mode === "text" ? "paste.txt" : "From the file")} />
              </Field>
              <Field>
                <FieldLabel htmlFor="drop-slug">Slug</FieldLabel>
                <Input id="drop-slug" name="slug" autoComplete="off" spellCheck={false} placeholder="Random" />
              </Field>
              <Field>
                <FieldLabel htmlFor="drop-password">Password</FieldLabel>
                <Input id="drop-password" type="password" name="password" autoComplete="new-password" placeholder="None" />
              </Field>
              <Field>
                <FieldLabel htmlFor="drop-expires">Expires</FieldLabel>
                <Select name="expires" items={EXPIRY_OPTIONS} defaultValue="">
                  <SelectTrigger id="drop-expires" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {EXPIRY_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button type="submit" disabled={submitting}>{submitting ? "Uploading…" : "Create drop"}</Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
