import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import { CODE_THEMES, type CodeTheme, type SiteConfig } from "@/config";
import { SketchUnderline } from "@/view/sketch-underline";
import { ConfirmForm } from "./confirm-form";
import type { SettingsState } from "./types";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const THEME_OPTIONS = CODE_THEMES.map((theme) => ({ value: theme, label: theme.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ") }));

function ThemePreview({ theme }: { theme: CodeTheme }) {
  const [html, setHtml] = useState<string>();
  useEffect(() => {
    const controller = new AbortController();
    fetch(`/admin/theme-preview?theme=${theme}`, { signal: controller.signal })
      .then((response) => response.text())
      .then(setHtml, () => undefined);
    return () => controller.abort();
  }, [theme]);
  if (html === undefined) return <div className="grid h-28 place-items-center"><Spinner /></div>;
  return <div className="theme-preview" dangerouslySetInnerHTML={{ __html: html }} />;
}

function Preview({ draft }: { draft: SiteConfig }) {
  const accent = HEX_COLOR.test(draft.accent) ? draft.accent : undefined;
  return (
    <Card className="gap-4 py-5" style={accent ? { "--marker": accent } : undefined}>
      <CardHeader className="px-5">
        <CardDescription>Preview</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-5 px-5">
        <div>
          <p className="text-[0.8125rem] text-muted-foreground">{draft.name || "Site name"}</p>
          <p className="mt-2 text-lg font-[450] text-muted-foreground"><SketchUnderline text={draft.owner || "Someone"} /> sent you</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">my-project</p>
        </div>
        <div className="overflow-hidden rounded-xl bg-[var(--viewer-bg)] shadow-rim">
          <ThemePreview key={draft.codeTheme} theme={draft.codeTheme} />
        </div>
      </CardContent>
    </Card>
  );
}

export function SettingsForm({ settings }: { settings: SettingsState }) {
  const [draft, setDraft] = useState(settings.current);
  const [submitting, setSubmitting] = useState(false);
  const update = (patch: Partial<SiteConfig>) => setDraft((current) => ({ ...current, ...patch }));
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
      <Card className="py-6">
        <CardHeader className="px-6">
          <CardTitle>Site settings</CardTitle>
          <CardDescription>Changes apply straight away, no redeploy. The domain and bucket live in wrangler.jsonc.</CardDescription>
        </CardHeader>
        <CardContent className="px-6">
          <form method="post" action="/admin/settings" onSubmit={() => setSubmitting(true)}>
            <FieldGroup className="gap-5">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field>
                  <FieldLabel htmlFor="settings-name">Site name</FieldLabel>
                  <Input id="settings-name" name="name" required maxLength={40} value={draft.name} onChange={(event) => update({ name: event.target.value })} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="settings-owner">Sender name</FieldLabel>
                  <Input id="settings-owner" name="owner" required maxLength={60} value={draft.owner} onChange={(event) => update({ owner: event.target.value })} />
                  <FieldDescription>Shown as “{draft.owner || "Someone"} sent you”.</FieldDescription>
                </Field>
              </div>
              <Field>
                <FieldLabel htmlFor="settings-accent">Accent colour</FieldLabel>
                <div className="flex items-center gap-2">
                  <input type="color" aria-label="Pick accent colour" value={HEX_COLOR.test(draft.accent) ? draft.accent : "#000000"} onChange={(event) => update({ accent: event.target.value })} className="size-10 shrink-0 cursor-pointer rounded-xl border-0 bg-field p-1 shadow-rim" />
                  <Input id="settings-accent" name="accent" required pattern="#[0-9a-fA-F]{6}" spellCheck={false} value={draft.accent} onChange={(event) => update({ accent: event.target.value })} className="font-mono" />
                </div>
                <FieldDescription>Drives the gradient, underline, warning badges and selection.</FieldDescription>
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-theme">Code theme</FieldLabel>
                <Select name="theme" items={THEME_OPTIONS} value={draft.codeTheme} onValueChange={(value) => { const theme = CODE_THEMES.find((name) => name === value); if (theme) update({ codeTheme: theme }); }}>
                  <SelectTrigger id="settings-theme" className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {THEME_OPTIONS.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              </Field>
              <Field>
                <FieldLabel htmlFor="settings-home">Home redirect</FieldLabel>
                <Input id="settings-home" name="home" type="url" required value={draft.homeUrl} onChange={(event) => update({ homeUrl: event.target.value })} />
                <FieldDescription>Where visitors to / are sent.</FieldDescription>
              </Field>
              <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                {settings.overridden && (
                  <ConfirmForm
                    action="/admin/settings/reset"
                    trigger={<Button type="button" variant="ghost" className="mr-auto">Reset to deploy values</Button>}
                    title="Reset settings?"
                    description={`Goes back to the values in wrangler.jsonc: ${settings.fromDeploy.name}, ${settings.fromDeploy.owner}, ${settings.fromDeploy.accent}, ${settings.fromDeploy.codeTheme}.`}
                    confirm="Reset"
                  />
                )}
                <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save settings"}</Button>
              </div>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
      <Preview draft={draft} />
    </div>
  );
}
