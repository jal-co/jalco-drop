import type { ReactNode } from "react";
import { site, VERSION } from "./site";
import type { Card } from "./types";

function CardTags({ title, card }: { title: string; card: Card }) {
  return (
    <>
      <meta property="og:site_name" content={site.host} />
      <meta property="og:title" content={title} />
      <meta property="og:description" content={card.description} />
      <meta property="og:url" content={card.url} />
      <link rel="alternate" type="application/json" href={`${card.url}?format=json`} />
      <meta name="twitter:card" content={card.image ? "summary_large_image" : "summary"} />
      <meta property="og:type" content={card.video ? "video.other" : "website"} />
      {card.video && (
        <>
          <meta property="og:video" content={card.video.url} />
          <meta property="og:video:secure_url" content={card.video.url} />
          <meta property="og:video:type" content={card.video.type} />
        </>
      )}
      {card.image && <meta property="og:image" content={card.image} />}
      {card.imageSize && (
        <>
          <meta property="og:image:width" content={String(card.imageSize.width)} />
          <meta property="og:image:height" content={String(card.imageSize.height)} />
        </>
      )}
    </>
  );
}

export function Document({ title, card, islands, grain, forms, code, bodyClassName, children }: { title: string; card?: Card; islands?: boolean; grain?: boolean; forms?: boolean; code?: boolean; bodyClassName?: string; children: ReactNode }) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="color-scheme" content="dark" />
        <meta name="robots" content="noindex" />
        <meta name="generator" content={`jalco-drop ${VERSION}`} />
        <title>{title}</title>
        {card && <CardTags title={title} card={card} />}
        <link rel="icon" href="/favicon.png" />
        <link rel="preload" href="/fonts/Geist-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />
        {code && <link rel="preload" href="/fonts/GeistMono-Variable.woff2" as="font" type="font/woff2" crossOrigin="" />}
        <link rel="stylesheet" href="/style.css" />
        <style>{`:root{--marker:${site.accent}}`}</style>
        {islands && <script type="module" src="/js/islands.js" />}
        {grain && <script type="module" src="/grain.js" />}
        {forms && <script defer src="/js/forms.js" />}
      </head>
      <body className={bodyClassName}>{children}</body>
    </html>
  );
}
