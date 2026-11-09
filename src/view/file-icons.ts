import { faCss3 } from "@fortawesome/free-brands-svg-icons/faCss3";
import { faDocker } from "@fortawesome/free-brands-svg-icons/faDocker";
import { faGit } from "@fortawesome/free-brands-svg-icons/faGit";
import { faGolang } from "@fortawesome/free-brands-svg-icons/faGolang";
import { faHtml5 } from "@fortawesome/free-brands-svg-icons/faHtml5";
import { faJava } from "@fortawesome/free-brands-svg-icons/faJava";
import { faJs } from "@fortawesome/free-brands-svg-icons/faJs";
import { faMarkdown } from "@fortawesome/free-brands-svg-icons/faMarkdown";
import { faNpm } from "@fortawesome/free-brands-svg-icons/faNpm";
import { faPhp } from "@fortawesome/free-brands-svg-icons/faPhp";
import { faPython } from "@fortawesome/free-brands-svg-icons/faPython";
import { faReact } from "@fortawesome/free-brands-svg-icons/faReact";
import { faRust } from "@fortawesome/free-brands-svg-icons/faRust";
import { faSass } from "@fortawesome/free-brands-svg-icons/faSass";
import { faSvelte } from "@fortawesome/free-brands-svg-icons/faSvelte";
import { faSwift } from "@fortawesome/free-brands-svg-icons/faSwift";
import { faTypescript } from "@fortawesome/free-brands-svg-icons/faTypescript";
import { faVuejs } from "@fortawesome/free-brands-svg-icons/faVuejs";
import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { faDatabase } from "@fortawesome/free-solid-svg-icons/faDatabase";
import { faFile } from "@fortawesome/free-solid-svg-icons/faFile";
import { faFileCode } from "@fortawesome/free-solid-svg-icons/faFileCode";
import { faFileCsv } from "@fortawesome/free-solid-svg-icons/faFileCsv";
import { faFileImage } from "@fortawesome/free-solid-svg-icons/faFileImage";
import { faFileLines } from "@fortawesome/free-solid-svg-icons/faFileLines";
import { faFilePdf } from "@fortawesome/free-solid-svg-icons/faFilePdf";
import { faFileZipper } from "@fortawesome/free-solid-svg-icons/faFileZipper";
import { faGear } from "@fortawesome/free-solid-svg-icons/faGear";
import { faTerminal } from "@fortawesome/free-solid-svg-icons/faTerminal";

const BY_FILENAME = new Map<string, IconDefinition>([
  ["package.json", faNpm],
  ["package-lock.json", faNpm],
  ["dockerfile", faDocker],
  [".gitignore", faGit],
  [".gitattributes", faGit],
]);

const BY_EXTENSION = new Map<string, IconDefinition>([
  ["ts", faTypescript], ["mts", faTypescript], ["cts", faTypescript],
  ["tsx", faReact], ["jsx", faReact],
  ["js", faJs], ["mjs", faJs], ["cjs", faJs],
  ["md", faMarkdown], ["mdx", faMarkdown], ["markdown", faMarkdown],
  ["py", faPython], ["rs", faRust], ["go", faGolang], ["java", faJava], ["kt", faJava], ["php", faPhp], ["swift", faSwift],
  ["html", faHtml5], ["htm", faHtml5], ["css", faCss3], ["scss", faSass], ["sass", faSass], ["vue", faVuejs], ["svelte", faSvelte],
  ["sh", faTerminal], ["bash", faTerminal], ["zsh", faTerminal], ["fish", faTerminal],
  ["sql", faDatabase], ["csv", faFileCsv], ["pdf", faFilePdf],
  ["json", faFileCode], ["jsonc", faFileCode], ["xml", faFileCode], ["svg", faFileCode],
  ["yml", faGear], ["yaml", faGear], ["toml", faGear], ["ini", faGear], ["env", faGear], ["conf", faGear],
  ["zip", faFileZipper], ["gz", faFileZipper], ["tgz", faFileZipper], ["tar", faFileZipper], ["7z", faFileZipper],
  ["png", faFileImage], ["jpg", faFileImage], ["jpeg", faFileImage], ["gif", faFileImage], ["webp", faFileImage], ["avif", faFileImage],
  ["txt", faFileLines], ["log", faFileLines],
]);

export function fileIconFor(name: string) {
  const lower = name.toLowerCase();
  const extension = lower.includes(".") ? lower.slice(lower.lastIndexOf(".") + 1) : "";
  return BY_FILENAME.get(lower) ?? BY_EXTENSION.get(extension) ?? faFile;
}
