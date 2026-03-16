import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs";
import { resolve } from "node:path";

const rootDir = process.cwd();
const templateDir = resolve(rootDir, "hostinger-deploy-2026-03-13");
const outputDir = resolve(rootDir, "hostinger-deploy");
const buildDir = resolve(rootDir, ".next");
const publicDir = resolve(rootDir, "public");

if (!existsSync(templateDir)) {
  throw new Error("Template directory hostinger-deploy-2026-03-13 is missing.");
}

if (!existsSync(buildDir)) {
  throw new Error("Next.js build directory .next is missing. Run `npm run build` first.");
}

if (!existsSync(publicDir)) {
  throw new Error("Public directory is missing.");
}

if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true, force: true });
}

cpSync(templateDir, outputDir, { recursive: true });

const outputPublicDir = resolve(outputDir, "public");

if (existsSync(outputPublicDir)) {
  rmSync(outputPublicDir, { recursive: true, force: true });
}

mkdirSync(outputPublicDir, { recursive: true });

cpSync(publicDir, outputPublicDir, { recursive: true });

const outputNextDir = resolve(outputDir, ".next");

if (existsSync(outputNextDir)) {
  rmSync(outputNextDir, { recursive: true, force: true });
}

cpSync(buildDir, outputNextDir, { recursive: true });

