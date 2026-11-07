// Writes every file the setup guide shows (constants.ts FILE_CONTENTS) into
// a target directory, exactly as the app renders it, so the guide's code can
// be run and tested instead of only displayed.
//
// Usage: node --experimental-strip-types extract_guide.mjs <target-dir>
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const { FILE_CONTENTS, FILE_STRUCTURE } = await import(resolve(here, "../../constants.ts"));

const target = process.argv[2];
if (!target) {
  console.error("usage: extract_guide.mjs <target-dir>");
  process.exit(2);
}

const tree = [];
(function walk(node, prefix) {
  const path = prefix + node.name;
  if (node.type === "file") tree.push(path);
  for (const child of node.children ?? []) walk(child, node.type === "folder" ? path : prefix);
})(FILE_STRUCTURE, "");
const root = FILE_STRUCTURE.name;

for (const [name, content] of Object.entries(FILE_CONTENTS)) {
  const out = join(target, name);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, content);
}

process.stdout.write(
  JSON.stringify({
    tree: tree.map((p) => (p.startsWith(root) ? p.slice(root.length) : p)),
    files: Object.keys(FILE_CONTENTS),
  }),
);
