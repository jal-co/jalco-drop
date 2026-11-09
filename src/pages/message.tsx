import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from "@/components/ui/empty";
import { Document } from "@/view/document";
import { site } from "@/view/site";

function MessagePage({ title, description }: { title: string; description: string }) {
  return (
    <Document title={title}>
      <main className="grid min-h-dvh place-items-center p-6">
        <Empty>
          <EmptyHeader>
            <p className="text-[0.8125rem] text-muted-foreground">{site.name}</p>
            <EmptyTitle className="text-xl font-semibold tracking-tight">{title}</EmptyTitle>
            <EmptyDescription>{description}</EmptyDescription>
          </EmptyHeader>
        </Empty>
      </main>
    </Document>
  );
}

export const NotFoundPage = () => <MessagePage title="Nothing here" description="This link expired, was deleted, or never existed. Ask whoever sent it for a new one." />;

export const ErrorPage = ({ message }: { message: string }) => <MessagePage title="That didn’t work" description={message} />;
