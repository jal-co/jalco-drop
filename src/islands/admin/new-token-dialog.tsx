import { useState } from "react";
import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel, FieldLegend, FieldSet } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PERMISSIONS } from "@/tokens";
import { Dropzone } from "./dropzone";
import { PERMISSION_LABELS } from "./types";

export function NewTokenDialog() {
  const [submitting, setSubmitting] = useState(false);
  return (
    <Dialog>
      <DialogTrigger render={<Button />}>
        <PlusIcon data-icon="inline-start" />
        <span className="max-sm:sr-only">New token</span>
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New token</DialogTitle>
          <DialogDescription>Lets a bot or script upload without the admin token. It is shown once.</DialogDescription>
        </DialogHeader>
        <form method="post" action="/admin/tokens" encType="multipart/form-data" onSubmit={() => setSubmitting(true)}>
          <FieldGroup className="gap-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="token-name">Name</FieldLabel>
                <Input id="token-name" name="name" required maxLength={60} autoComplete="off" placeholder="Grokbot" />
              </Field>
              <Field>
                <FieldLabel htmlFor="token-sender">Shows as</FieldLabel>
                <Input id="token-sender" name="sender" maxLength={60} autoComplete="off" placeholder="Same as name" />
              </Field>
            </div>
            <FieldSet>
              <FieldLegend variant="label">Can</FieldLegend>
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {PERMISSIONS.map((permission) => (
                  <Field key={permission} orientation="horizontal" className="w-auto">
                    <Checkbox id={`permission-${permission}`} name="permissions" value={permission} defaultChecked={permission === "upload"} />
                    <FieldLabel htmlFor={`permission-${permission}`} className="font-normal">{PERMISSION_LABELS[permission]}</FieldLabel>
                  </Field>
                ))}
              </div>
            </FieldSet>
            <Field>
              <FieldLabel>Avatar</FieldLabel>
              <Dropzone name="avatar" accept="image/png,image/jpeg,image/webp,image/gif,image/svg+xml" hint="PNG, JPEG, WebP, GIF or SVG, up to 256 KB" />
            </Field>
            <DialogFooter>
              <DialogClose render={<Button variant="ghost" />}>Cancel</DialogClose>
              <Button type="submit" disabled={submitting}>{submitting ? "Creating…" : "Create token"}</Button>
            </DialogFooter>
          </FieldGroup>
        </form>
      </DialogContent>
    </Dialog>
  );
}
