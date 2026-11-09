import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Document } from "@/view/document";
import { site } from "@/view/site";

function AuthCard({ title, description, action, field, autoComplete, submit, error }: { title: string; description?: string; action: string; field: { name: string; label: string }; autoComplete: string; submit: string; error?: string }) {
  return (
    <Document title={title} forms>
      <main className="grid min-h-dvh place-items-center p-6">
        <Card className="w-full max-w-sm gap-6 py-6">
          <CardHeader className="px-6">
            <p className="text-[0.8125rem] text-muted-foreground">{site.name}</p>
            <CardTitle className="text-xl font-semibold tracking-tight [overflow-wrap:anywhere]">{title}</CardTitle>
            {description && <CardDescription>{description}</CardDescription>}
          </CardHeader>
          <CardContent className="px-6">
            <form method="post" action={action}>
              <FieldGroup className="gap-5">
                <Field data-invalid={error ? true : undefined}>
                  <FieldLabel htmlFor={field.name}>{field.label}</FieldLabel>
                  <Input id={field.name} type="password" name={field.name} autoComplete={autoComplete} required autoFocus aria-invalid={error ? true : undefined} />
                  {error && <FieldError>{error}</FieldError>}
                </Field>
                <Button type="submit" size="lg" className="w-full">{submit}</Button>
              </FieldGroup>
            </form>
          </CardContent>
        </Card>
      </main>
    </Document>
  );
}

export const LoginPage = ({ error }: { error?: string }) => (
  <AuthCard title="Sign in" action="/admin/login" field={{ name: "token", label: "Admin token" }} autoComplete="current-password" submit="Sign in" error={error} />
);

export const UnlockPage = ({ slug, error }: { slug: string; error?: string }) => (
  <AuthCard title={slug} description="This drop needs a password." action={`/${slug}`} field={{ name: "password", label: "Password" }} autoComplete="off" submit="Unlock" error={error} />
);
