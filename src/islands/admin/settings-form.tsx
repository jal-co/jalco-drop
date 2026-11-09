import { useState, type ReactNode } from "react";
import { CheckIcon, PlusIcon } from "lucide-react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { CODE_THEMES, type CodeTheme, type SiteConfig } from "@/config";
import { SketchUnderline } from "@/view/sketch-underline";
import { ConfirmForm } from "./confirm-form";
import type { SettingsState } from "./types";

const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ACCENT_PRESETS = [
  { name: "Orange", value: "#ff4f00" },
  { name: "Rose", value: "#f43f5e" },
  { name: "Pink", value: "#ec4899" },
  { name: "Violet", value: "#8b5cf6" },
  { name: "Blue", value: "#3b82f6" },
  { name: "Teal", value: "#14b8a6" },
  { name: "Green", value: "#22c55e" },
  { name: "Amber", value: "#f59e0b" },
];

const themeLabel = (theme: CodeTheme) => theme.split("-").map((word) => word[0].toUpperCase() + word.slice(1)).join(" ");

function Swatch({ name, value, selected, onSelect }: { name: string; value: string; selected: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      aria-label={name}
      aria-pressed={selected}
      title={name}
      onClick={onSelect}
      style={{ background: value }}
      className={cn(
        "grid size-10 place-items-center rounded-full text-white outline-none transition-[scale,box-shadow] duration-150 active:scale-[0.96] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
        selected ? "shadow-[0_0_0_2px_var(--card),0_0_0_4px_currentColor]" : "shadow-[inset_0_0_0_1px_oklch(1_0_0/12%)] hover:scale-105",
      )}
    >
      {selected && <CheckIcon className="size-4 drop-shadow" style={{ color: "white" }} />}
    </button>
  );
}

function AccentPicker({ accent, onChange }: { accent: string; onChange: (accent: string) => void }) {
  const custom = !ACCENT_PRESETS.some((preset) => preset.value === accent.toLowerCase());
  return (
    <div className="flex flex-col gap-4">
      <div role="group" aria-label="Accent colour" className="flex flex-wrap items-center gap-2.5" style={{ color: HEX_COLOR.test(accent) ? accent : undefined }}>
        {ACCENT_PRESETS.map((preset) => <Swatch key={preset.value} name={preset.name} value={preset.value} selected={accent.toLowerCase() === preset.value} onSelect={() => onChange(preset.value)} />)}
        <label
          title="Custom colour"
          className={cn(
            "relative grid size-10 cursor-pointer place-items-center rounded-full bg-fill text-muted-foreground transition-[scale,box-shadow] duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
            custom ? "shadow-[0_0_0_2px_var(--card),0_0_0_4px_currentColor]" : "shadow-rim hover:scale-105",
          )}
          style={custom && HEX_COLOR.test(accent) ? { background: accent, color: accent } : undefined}
        >
          {custom ? <CheckIcon className="size-4 drop-shadow" style={{ color: "white" }} /> : <PlusIcon className="size-4" />}
          <input type="color" aria-label="Custom colour" value={HEX_COLOR.test(accent) ? accent : "#000000"} onChange={(event) => onChange(event.target.value)} className="sr-only" />
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Input aria-label="Accent hex" name="accent" required pattern="#[0-9a-fA-F]{6}" spellCheck={false} value={accent} onChange={(event) => onChange(event.target.value)} className="w-32 font-mono" />
        <p className="text-sm text-muted-foreground" style={HEX_COLOR.test(accent) ? { "--marker": accent } : undefined}>
          <SketchUnderline text="Underlines" />, gradients, badges and selection
        </p>
      </div>
    </div>
  );
}

function ThemeGrid({ theme, samples, onChange }: { theme: CodeTheme; samples: SettingsState["themeSamples"]; onChange: (theme: CodeTheme) => void }) {
  return (
    <div role="radiogroup" aria-label="Code theme" className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {CODE_THEMES.map((name) => (
        <label
          key={name}
          className={cn(
            "group relative flex cursor-pointer flex-col overflow-hidden rounded-xl bg-[var(--viewer-bg)] transition-shadow duration-150 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-ring",
            theme === name ? "shadow-[0_0_0_2px_var(--marker)]" : "shadow-rim hover:shadow-[inset_0_0_0_1px_var(--border)]",
          )}
        >
          <input type="radio" name="theme" value={name} checked={theme === name} onChange={() => onChange(name)} className="sr-only" />
          <div className="theme-sample pointer-events-none" dangerouslySetInnerHTML={{ __html: samples[name] ?? "" }} />
          <span className="flex items-center justify-between gap-2 border-t border-border px-3 py-2 text-[0.8125rem] font-medium">
            {themeLabel(name)}
            {theme === name && <CheckIcon className="size-3.5 text-marker" />}
          </span>
        </label>
      ))}
    </div>
  );
}

function Section({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="gap-5 py-6">
      <CardHeader className="px-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="px-6">{children}</CardContent>
    </Card>
  );
}

export function SettingsForm({ settings }: { settings: SettingsState }) {
  const [draft, setDraft] = useState(settings.current);
  const [submitting, setSubmitting] = useState(false);
  const update = (patch: Partial<SiteConfig>) => setDraft((current) => ({ ...current, ...patch }));
  const accentStyle = HEX_COLOR.test(draft.accent) ? { "--marker": draft.accent } : undefined;
  return (
    <form method="post" action="/admin/settings" onSubmit={() => setSubmitting(true)} className="mx-auto flex w-full max-w-4xl flex-col gap-4" style={accentStyle}>
      <Section title="Identity" description="How links introduce themselves.">
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
            <FieldLabel htmlFor="settings-home">Home redirect</FieldLabel>
            <Input id="settings-home" name="home" type="url" required value={draft.homeUrl} onChange={(event) => update({ homeUrl: event.target.value })} />
            <FieldDescription>Where visitors to the bare domain are sent.</FieldDescription>
          </Field>
        </FieldGroup>
      </Section>
      <Section title="Accent" description="One colour carries the whole site.">
        <AccentPicker accent={draft.accent} onChange={(accent) => update({ accent })} />
      </Section>
      <Section title="Code theme" description="Used for code, diffs and markdown code blocks.">
        <ThemeGrid theme={draft.codeTheme} samples={settings.themeSamples} onChange={(codeTheme) => update({ codeTheme })} />
      </Section>
      <div className="sticky bottom-4 z-10 flex flex-wrap items-center justify-end gap-2 rounded-2xl bg-popover p-2 pl-4 shadow-overlay">
        <p className="mr-auto text-[0.8125rem] text-muted-foreground">Applies straight away.</p>
        {settings.overridden && (
          <ConfirmForm
            action="/admin/settings/reset"
            trigger={<Button type="button" variant="ghost">Reset</Button>}
            title="Reset settings?"
            description={`Goes back to the deploy values: ${settings.fromDeploy.name}, ${settings.fromDeploy.owner}, ${settings.fromDeploy.accent}, ${themeLabel(settings.fromDeploy.codeTheme)}.`}
            confirm="Reset"
          />
        )}
        <Button type="submit" disabled={submitting}>{submitting ? "Saving…" : "Save settings"}</Button>
      </div>
    </form>
  );
}
