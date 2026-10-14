// Builds the published site: copies src/ to _site/ and puts the FAKE test
// credentials (stored scrambled in fakes.scrambled.json) back into the pages.
// GitHub scans pushes, not the Pages artifact, so the repo stays free of
// key-shaped strings while the live site carries them for SimplyScan to find.
import { readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";

const { fakes } = JSON.parse(readFileSync("fakes.scrambled.json", "utf8"));
const plain = Object.fromEntries(Object.entries(fakes).map(([k, v]) => [k, Buffer.from(v, "base64").toString("utf8").split("").reverse().join("")]));
const TEXT = /\.(html|js|map|json|env|txt|bak)$|^\.env$/;

function walk(dir) {
  for (const name of readdirSync(dir)) {
    const from = join(dir, name);
    const to = join("_site", from.slice("src/".length));
    if (statSync(from).isDirectory()) { walk(from); continue; }
    mkdirSync(dirname(to), { recursive: true });
    if (TEXT.test(name)) {
      let s = readFileSync(from, "utf8");
      s = s.replace(/\{\{FAKE_([A-Z_]+)\}\}/g, (m, key) => {
        const v = plain[key.toLowerCase()];
        if (v === undefined) throw new Error(`unknown placeholder ${m} in ${from}`);
        return v;
      });
      writeFileSync(to, s);
    } else {
      copyFileSync(from, to);
    }
  }
}
walk("src");
const left = [];
(function check(dir) { for (const n of readdirSync(dir)) { const p = join(dir, n); if (statSync(p).isDirectory()) check(p); else if (TEXT.test(n) && /\{\{FAKE_/.test(readFileSync(p, "utf8"))) left.push(p); } })("_site");
if (left.length) throw new Error("placeholders left in: " + left.join(", "));
console.log("built _site with", Object.keys(plain).length, "fake credentials restored");
