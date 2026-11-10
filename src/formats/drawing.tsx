import type { ReactNode } from "react";
import { asNumber as num, asText as str, entries, isEntry, isText, parseJson, type Entry } from "./json-value";
import type { Json, TextFormat } from "./types";

type Point = { x: number; y: number };
type Bounds = { minX: number; minY: number; maxX: number; maxY: number };
type Drawing = { tool: string; background: string; nodes: ReactNode[]; bounds: Bounds; count: number };

const MAX_ELEMENTS = 5_000;
const PADDING = 32;
const SAFE_IMAGE = /^data:image\/(png|jpe?g|gif|webp);base64,/;
const HAND_FONT = "Excalifont, Virgil, 'Segoe Print', 'Bradley Hand', cursive";
const SANS_FONT = "Geist, Helvetica, Arial, sans-serif";
const MONO_FONT = "'Geist Mono', 'Cascadia Code', Menlo, monospace";


function createBounds() {
  const bounds: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const extend = (x: number, y: number) => {
    bounds.minX = Math.min(bounds.minX, x);
    bounds.minY = Math.min(bounds.minY, y);
    bounds.maxX = Math.max(bounds.maxX, x);
    bounds.maxY = Math.max(bounds.maxY, y);
  };
  return { bounds, extend };
}

const pathThrough = (points: Point[]) => points.map((point, index) => `${index ? "L" : "M"}${point.x.toFixed(1)} ${point.y.toFixed(1)}`).join(" ");

function arrowhead(tip: Point, from: Point, size: number) {
  const angle = Math.atan2(tip.y - from.y, tip.x - from.x);
  const wing = (offset: number) => ({ x: tip.x - size * Math.cos(angle + offset), y: tip.y - size * Math.sin(angle + offset) });
  return pathThrough([wing(0.45), tip, wing(-0.45)]);
}

function TextLines({ lines, x, y, size, font, color, anchor, lineHeight = 1.25 }: { lines: string[]; x: number; y: number; size: number; font: string; color: string; anchor: "start" | "middle" | "end"; lineHeight?: number }) {
  return (
    <text x={x} y={y} fontSize={size} fontFamily={font} fill={color} stroke="none" textAnchor={anchor}>
      {lines.map((line, index) => (
        <tspan key={index} x={x} dy={index === 0 ? size * 0.9 : size * lineHeight}>{line || " "}</tspan>
      ))}
    </text>
  );
}

const DASH = new Map([["dashed", "8 6"], ["dotted", "1.5 6"]]);

function fromExcalidraw(file: Entry): Drawing | null {
  const elements = entries(file.elements).filter((element) => element.isDeleted !== true);
  if (!elements.length || elements.length > MAX_ELEMENTS) return null;
  const files = isEntry(file.files) ? file.files : {};
  const { bounds, extend } = createBounds();
  const nodes = elements.map((element, index) => {
    const x = num(element.x);
    const y = num(element.y);
    const width = num(element.width);
    const height = num(element.height);
    const stroke = str(element.strokeColor, "#1e1e1e");
    const fill = str(element.backgroundColor, "transparent") === "transparent" ? "none" : str(element.backgroundColor);
    const style = {
      stroke,
      strokeWidth: num(element.strokeWidth, 2),
      strokeDasharray: DASH.get(str(element.strokeStyle)),
      strokeLinecap: "round" as const,
      strokeLinejoin: "round" as const,
      opacity: num(element.opacity, 100) / 100,
    };
    const rotate = num(element.angle) ? `rotate(${(num(element.angle) * 180) / Math.PI} ${x + width / 2} ${y + height / 2})` : undefined;
    extend(x, y);
    extend(x + width, y + height);
    const type = str(element.type);
    if (type === "rectangle" || type === "frame" || type === "magicframe") {
      const radius = isEntry(element.roundness) ? Math.min(32, Math.min(width, height) * 0.25) : 0;
      return (
        <g key={index} transform={rotate}>
          <rect x={x} y={y} width={width} height={height} rx={radius} fill={type === "rectangle" ? fill : "none"} {...style} {...(type === "rectangle" ? {} : { stroke: "#bbb", strokeWidth: 1 })} />
          {type !== "rectangle" && <text x={x} y={y - 8} fontSize={14} fontFamily={SANS_FONT} fill="#888">{str(element.name, "Frame")}</text>}
        </g>
      );
    }
    if (type === "ellipse") return <ellipse key={index} transform={rotate} cx={x + width / 2} cy={y + height / 2} rx={width / 2} ry={height / 2} fill={fill} {...style} />;
    if (type === "diamond") {
      const points = `${x + width / 2},${y} ${x + width},${y + height / 2} ${x + width / 2},${y + height} ${x},${y + height / 2}`;
      return <polygon key={index} transform={rotate} points={points} fill={fill} {...style} />;
    }
    if (type === "line" || type === "arrow" || type === "freedraw") {
      const points = (Array.isArray(element.points) ? element.points : [])
        .filter((point): point is Json[] => Array.isArray(point))
        .map((point) => ({ x: x + num(point[0]), y: y + num(point[1]) }));
      points.forEach((point) => extend(point.x, point.y));
      if (points.length < 2) return null;
      const size = 12 + style.strokeWidth * 3;
      const heads = type === "arrow" ? [str(element.endArrowhead) && arrowhead(points[points.length - 1], points[points.length - 2], size), str(element.startArrowhead) && arrowhead(points[0], points[1], size)] : [];
      return (
        <g key={index} transform={rotate} fill="none" {...style} strokeWidth={type === "freedraw" ? style.strokeWidth * 1.5 : style.strokeWidth}>
          <path d={pathThrough(points)} fill={type === "line" && fill !== "none" ? fill : "none"} />
          {heads.map((head, headIndex) => head && <path key={headIndex} d={head} strokeDasharray={undefined} />)}
        </g>
      );
    }
    if (type === "text") {
      const size = num(element.fontSize, 20);
      const family = num(element.fontFamily, 1);
      const align = str(element.textAlign, "left");
      const anchor = align === "center" ? "middle" : align === "right" ? "end" : "start";
      const anchorX = anchor === "middle" ? x + width / 2 : anchor === "end" ? x + width : x;
      const font = family === 3 || family === 8 ? MONO_FONT : family === 2 || family === 6 || family === 7 ? SANS_FONT : HAND_FONT;
      return (
        <g key={index} transform={rotate} opacity={style.opacity}>
          <TextLines lines={str(element.text).split("\n")} x={anchorX} y={y} size={size} font={font} color={stroke} anchor={anchor} lineHeight={num(element.lineHeight, 1.25)} />
        </g>
      );
    }
    if (type === "image") {
      const asset = files[str(element.fileId)];
      const href = isEntry(asset) ? str(asset.dataURL) : "";
      return SAFE_IMAGE.test(href) ? <image key={index} transform={rotate} href={href} x={x} y={y} width={width} height={height} /> : <rect key={index} x={x} y={y} width={width} height={height} fill="#eee" />;
    }
    return null;
  });
  const appState = isEntry(file.appState) ? file.appState : {};
  return { tool: "Excalidraw", background: str(appState.viewBackgroundColor, "#ffffff"), nodes, bounds, count: elements.length };
}

const TL_COLORS = new Map([
  ["black", ["#1d1d1d", "#e8e8e8"]], ["grey", ["#9fa8b2", "#eceef0"]], ["light-violet", ["#e085f4", "#f5eafa"]], ["violet", ["#ae3ec9", "#ecdcf2"]],
  ["blue", ["#4465e9", "#dce1f8"]], ["light-blue", ["#4ba1f1", "#ddedfa"]], ["yellow", ["#f1ac4b", "#f9f0e6"]], ["orange", ["#e16919", "#f8e2d4"]],
  ["green", ["#099268", "#d3e9e3"]], ["light-green", ["#4cb05e", "#dbf0e0"]], ["light-red", ["#f87777", "#f4dadb"]], ["red", ["#e03131", "#f4dadb"]], ["white", ["#ffffff", "#ffffff"]],
]);
const TL_STROKE = new Map([["s", 2], ["m", 3.5], ["l", 5], ["xl", 10]]);
const TL_FONT_SIZE = new Map([["s", 18], ["m", 24], ["l", 36], ["xl", 44]]);
const TL_LABEL_SIZE = new Map([["s", 18], ["m", 22], ["l", 26], ["xl", 32]]);
const TL_FONT = new Map([["draw", HAND_FONT], ["sans", SANS_FONT], ["serif", "Georgia, serif"], ["mono", MONO_FONT]]);

const color = (name: Json | undefined) => TL_COLORS.get(str(name, "black")) ?? TL_COLORS.get("black")!;

function richTextOf(props: Entry) {
  if (isText(props.text)) return props.text;
  const lines: string[] = [];
  const walk = (node: Json | undefined, line: string[]): string[] => {
    if (!isEntry(node)) return line;
    if (node.type === "text") return [...line, str(node.text)];
    if (node.type === "hardBreak") {
      lines.push(line.join(""));
      return [];
    }
    let current = line;
    for (const child of entries(node.content)) current = walk(child, current);
    if (node.type === "paragraph" || node.type === "heading" || node.type === "listItem") {
      lines.push(current.join(""));
      return [];
    }
    return current;
  };
  walk(isEntry(props.richText) ? props.richText : undefined, []);
  return lines.join("\n");
}

function fromTldraw(file: Entry): Drawing | null {
  const records = entries(file.records);
  const pages = records.filter((record) => record.typeName === "page").sort((a, b) => str(a.index).localeCompare(str(b.index)));
  const figures = records.filter((record) => record.typeName === "shape");
  if (!pages.length || !figures.length || figures.length > MAX_ELEMENTS) return null;
  const byId = new Map(figures.map((figure) => [str(figure.id), figure]));
  const assets = new Map(records.filter((record) => record.typeName === "asset").map((asset) => [str(asset.id), asset]));
  const bindings = records.filter((record) => record.typeName === "binding" && record.type === "arrow");
  const { bounds, extend } = createBounds();

  const pageOrigin = (figure: Entry): Point => {
    const parent = byId.get(str(figure.parentId));
    const origin = parent ? pageOrigin(parent) : { x: 0, y: 0 };
    return { x: origin.x + num(figure.x), y: origin.y + num(figure.y) };
  };
  const sizeOf = (figure: Entry) => {
    const props = isEntry(figure.props) ? figure.props : {};
    if (figure.type === "note") return { w: 200, h: 200 + num(props.growY) };
    return { w: num(props.w, 100), h: num(props.h, 100) + num(props.growY) };
  };

  const terminal = (arrow: Entry, which: "start" | "end", other: Point): Point => {
    const props = isEntry(arrow.props) ? arrow.props : {};
    const value = props[which];
    const own = isEntry(value) ? value : {};
    const local = { x: num(own.x), y: num(own.y) };
    const binding = bindings.find((candidate) => candidate.fromId === arrow.id && isEntry(candidate.props) && candidate.props.terminal === which);
    const target = binding && byId.get(str(binding.toId));
    if (!binding || !target || !isEntry(binding.props)) return local;
    const arrowOrigin = pageOrigin(arrow);
    const origin = pageOrigin(target);
    const { w, h } = sizeOf(target);
    const anchor = isEntry(binding.props.normalizedAnchor) ? binding.props.normalizedAnchor : {};
    if (binding.props.isPrecise === true) return { x: origin.x + num(anchor.x, 0.5) * w - arrowOrigin.x, y: origin.y + num(anchor.y, 0.5) * h - arrowOrigin.y };
    const center = { x: origin.x + w / 2, y: origin.y + h / 2 };
    const from = { x: other.x + arrowOrigin.x, y: other.y + arrowOrigin.y };
    const dx = from.x - center.x;
    const dy = from.y - center.y;
    const scale = Math.min(dx ? w / 2 / Math.abs(dx) : Infinity, dy ? h / 2 / Math.abs(dy) : Infinity, 1);
    return { x: center.x + dx * scale - arrowOrigin.x, y: center.y + dy * scale - arrowOrigin.y };
  };

  const render = (figure: Entry, index: number): ReactNode => {
    const props = isEntry(figure.props) ? figure.props : {};
    const [stroke, light] = color(props.color);
    const strokeWidth = TL_STROKE.get(str(props.size, "m")) ?? 3.5;
    const dash = DASH.get(str(props.dash));
    const fill = str(props.fill, "none");
    const fillColor = fill === "solid" ? light : fill === "semi" || fill === "pattern" ? light : "none";
    const font = TL_FONT.get(str(props.font, "draw")) ?? HAND_FONT;
    const origin = pageOrigin(figure);
    const { w, h } = sizeOf(figure);
    const transform = `translate(${num(figure.x)} ${num(figure.y)})${num(figure.rotation) ? ` rotate(${(num(figure.rotation) * 180) / Math.PI})` : ""}`;
    const children = figures.filter((child) => child.parentId === figure.id).sort((a, b) => str(a.index).localeCompare(str(b.index)));
    const style = { stroke, strokeWidth, strokeDasharray: dash, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
    const label = richTextOf(props);
    const labelColor = color(props.labelColor ?? props.color)[0];
    const centered = (size: number) => label && <TextLines lines={label.split("\n")} x={w / 2} y={h / 2 - (label.split("\n").length * size * 1.25) / 2} size={size} font={font} color={labelColor} anchor="middle" />;
    let body: ReactNode = null;
    if (figure.type === "geo") {
      extend(origin.x, origin.y);
      extend(origin.x + w, origin.y + h);
      const geo = str(props.geo, "rectangle");
      const outline =
        geo === "ellipse" || geo === "oval" ? <ellipse cx={w / 2} cy={h / 2} rx={w / 2} ry={h / 2} /> :
        geo === "diamond" ? <polygon points={`${w / 2},0 ${w},${h / 2} ${w / 2},${h} 0,${h / 2}`} /> :
        geo === "triangle" ? <polygon points={`${w / 2},0 ${w},${h} 0,${h}`} /> :
        geo === "hexagon" ? <polygon points={`${w * 0.25},0 ${w * 0.75},0 ${w},${h / 2} ${w * 0.75},${h} ${w * 0.25},${h} 0,${h / 2}`} /> :
        <rect width={w} height={h} rx={8} />;
      body = <><g fill={fillColor} {...style}>{outline}</g>{centered(TL_LABEL_SIZE.get(str(props.size, "m")) ?? 22)}</>;
    } else if (figure.type === "note") {
      extend(origin.x, origin.y);
      extend(origin.x + w, origin.y + h);
      const noteText = color(props.labelColor ?? "black")[0];
      const size = TL_LABEL_SIZE.get(str(props.size, "m")) ?? 22;
      const lines = label.split("\n");
      body = (
        <>
          <rect width={w} height={h} rx={6} fill={`color-mix(in oklab, ${stroke} 45%, white)`} stroke="none" />
          {label && <TextLines lines={lines} x={w / 2} y={h / 2 - (lines.length * size * 1.25) / 2} size={size} font={font} color={noteText} anchor="middle" />}
        </>
      );
    } else if (figure.type === "text") {
      const size = (TL_FONT_SIZE.get(str(props.size, "m")) ?? 24) * num(props.scale, 1);
      const lines = label.split("\n");
      const width = num(props.w, Math.max(...lines.map((line) => line.length)) * size * 0.55);
      const align = str(props.textAlign, "start");
      const anchor = align === "middle" ? "middle" : align === "end" ? "end" : "start";
      extend(origin.x, origin.y);
      extend(origin.x + width, origin.y + lines.length * size * 1.25);
      body = <TextLines lines={lines} x={anchor === "middle" ? width / 2 : anchor === "end" ? width : 0} y={0} size={size} font={font} color={stroke} anchor={anchor} />;
    } else if (figure.type === "arrow") {
      const rawEnd = isEntry(props.end) ? { x: num(props.end.x), y: num(props.end.y) } : { x: 0, y: 0 };
      const start = terminal(figure, "start", rawEnd);
      const end = terminal(figure, "end", start);
      const bend = num(props.bend);
      const length = Math.hypot(end.x - start.x, end.y - start.y) || 1;
      const control = { x: (start.x + end.x) / 2 + (bend * -(end.y - start.y)) / length, y: (start.y + end.y) / 2 + (bend * (end.x - start.x)) / length };
      [start, end, control].forEach((point) => extend(origin.x + point.x, origin.y + point.y));
      const size = 10 + strokeWidth * 2.5;
      body = (
        <g fill="none" {...style}>
          <path d={`M${start.x} ${start.y} Q${control.x} ${control.y} ${end.x} ${end.y}`} />
          {str(props.arrowheadEnd, "arrow") !== "none" && <path d={arrowhead(end, control, size)} strokeDasharray={undefined} />}
          {str(props.arrowheadStart, "none") !== "none" && <path d={arrowhead(start, control, size)} strokeDasharray={undefined} />}
          {label && <TextLines lines={label.split("\n")} x={control.x} y={control.y - 12} size={TL_LABEL_SIZE.get(str(props.size, "m")) ?? 22} font={font} color={labelColor} anchor="middle" />}
        </g>
      );
    } else if (figure.type === "line" || figure.type === "draw" || figure.type === "highlight") {
      const points: Point[] =
        figure.type === "line"
          ? (Array.isArray(props.points) ? entries(props.points) : isEntry(props.points) ? Object.values(props.points).filter(isEntry) : [])
              .sort((a, b) => str(a.index).localeCompare(str(b.index)))
              .map((point) => ({ x: num(point.x), y: num(point.y) }))
          : entries(props.segments).flatMap((segment) => entries(segment.points).map((point) => ({ x: num(point.x), y: num(point.y) })));
      points.forEach((point) => extend(origin.x + point.x, origin.y + point.y));
      body = points.length > 1 && <path d={pathThrough(points)} fill="none" {...style} strokeWidth={figure.type === "highlight" ? strokeWidth * 6 : strokeWidth} strokeOpacity={figure.type === "highlight" ? 0.35 : 1} />;
    } else if (figure.type === "frame") {
      extend(origin.x, origin.y - 24);
      extend(origin.x + w, origin.y + h);
      body = <><rect width={w} height={h} fill="#ffffff" stroke="#c4c4c4" strokeWidth={1} /><text y={-8} fontSize={14} fontFamily={SANS_FONT} fill="#888">{str(props.name, "Frame")}</text></>;
    } else if (figure.type === "image") {
      const asset = assets.get(str(props.assetId));
      const src = asset && isEntry(asset.props) ? str(asset.props.src) : "";
      extend(origin.x, origin.y);
      extend(origin.x + w, origin.y + h);
      body = SAFE_IMAGE.test(src) ? <image href={src} width={w} height={h} /> : <rect width={w} height={h} fill="#eceef0" />;
    } else if (figure.type !== "group") {
      extend(origin.x, origin.y);
      extend(origin.x + w, origin.y + h);
      body = <rect width={w} height={h} rx={8} fill="#eceef0" stroke="#c4c4c4" strokeWidth={1} />;
    }
    return (
      <g key={index} transform={transform} opacity={num(figure.opacity, 1)}>
        {body}
        {children.map(render)}
      </g>
    );
  };

  const pageId = pages[0].id;
  const top = figures.filter((figure) => figure.parentId === pageId).sort((a, b) => str(a.index).localeCompare(str(b.index)));
  return { tool: "tldraw", background: "#f9fafb", nodes: top.map(render), bounds, count: figures.length };
}

function DrawingView({ drawing, surface, name }: { drawing: Drawing; surface: "page" | "drawer"; name: string }) {
  const { minX, minY, maxX, maxY } = drawing.bounds;
  const viewBox = [minX - PADDING, minY - PADDING, maxX - minX + PADDING * 2, maxY - minY + PADDING * 2].map((value) => value.toFixed(1)).join(" ");
  return (
    <figure className="drawing" data-surface={surface}>
      <div className="drawing-canvas" style={{ background: drawing.background }}>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox={viewBox} role="img" aria-label={`${drawing.tool} drawing: ${name}`}>
          {drawing.nodes}
        </svg>
      </div>
      <figcaption>{drawing.tool} drawing, {drawing.count} {drawing.count === 1 ? "shape" : "shapes"}</figcaption>
    </figure>
  );
}

function parse(text: string): Entry | undefined {
  const value = parseJson(text);
  return isEntry(value) ? value : undefined;
}

const usable = (drawing: Drawing | null) => drawing && Number.isFinite(drawing.bounds.minX) ? drawing : null;

export const excalidraw: TextFormat = {
  id: "excalidraw",
  test: (name) => /\.excalidraw(\.json)?$/i.test(name),
  render(text, { surface, name }) {
    const file = parse(text);
    const drawing = usable(file && file.type === "excalidraw" ? fromExcalidraw(file) : null);
    return drawing && { body: <DrawingView drawing={drawing} surface={surface} name={name} /> };
  },
};

export const tldraw: TextFormat = {
  id: "tldraw",
  test: (name) => /\.tldr$/i.test(name),
  render(text, { surface, name }) {
    const file = parse(text);
    const drawing = usable(file && Array.isArray(file.records) ? fromTldraw(file) : null);
    return drawing && { body: <DrawingView drawing={drawing} surface={surface} name={name} /> };
  },
};
