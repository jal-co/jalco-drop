import { Document } from "@/view/document";
import { site } from "@/view/site";
import { SketchUnderline } from "@/view/sketch-underline";
import { GrainArt } from "./share";

export function CardPage({ sender, title, details, seed }: { sender: string; title: string; details: string[]; seed: string }) {
  return (
    <Document title={title} grain bodyClassName="viewer-page card-page">
      <div className="og-card">
        <div className="og-text">
          <p className="og-kicker"><SketchUnderline text={sender} /> sent you</p>
          <h1 className="og-title">{title}</h1>
          <p className="og-meta">{details.map((detail) => <span key={detail}>{detail}</span>)}</p>
          <p className="og-site">{site.host}</p>
        </div>
        <GrainArt seed={seed} still className="og-art" />
      </div>
    </Document>
  );
}
