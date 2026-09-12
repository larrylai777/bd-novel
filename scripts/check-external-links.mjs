import fs from "node:fs";
import path from "node:path";

const htmlFiles = fs
  .readdirSync(".")
  .filter((name) => name.endsWith(".html"));

const anchorPattern = /<a\b[^>]*>/gi;
const failures = [];

for (const file of htmlFiles) {
  const html = fs.readFileSync(path.join(".", file), "utf8");
  for (const tag of html.match(anchorPattern) ?? []) {
    const opensNewTab = /\btarget\s*=\s*["']_blank["']/i.test(tag);
    const isExternal = /\bhref\s*=\s*["']https?:\/\//i.test(tag);
    const hasNoopener = /\brel\s*=\s*["'][^"']*\bnoopener\b/i.test(tag);

    if (opensNewTab && isExternal && !hasNoopener) {
      failures.push(`${file}: ${tag}`);
    }
  }
}

if (failures.length > 0) {
  console.error("External _blank links missing rel=\"noopener\":");
  console.error(failures.join("\n"));
  process.exit(1);
}

console.log("OK: all external _blank links include rel=\"noopener\".");
