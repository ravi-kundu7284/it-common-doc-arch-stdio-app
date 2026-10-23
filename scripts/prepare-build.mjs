import fs from "fs";
import path from "path";

function walk(dir, dirs = []) {
  if (!fs.existsSync(dir)) return dirs;
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      dirs.push(full);
      walk(full, dirs);
    }
  }
  return dirs;
}

const appDirs = walk("src/app");
for (const dir of appDirs) {
  const rel = path.relative("src/app", dir);
  const targetServer = path.join(".next", "server", "app", rel);
  const targetStatic = path.join(".next", "static", "chunks", "app", rel);
  fs.mkdirSync(targetServer, { recursive: true });
  fs.mkdirSync(targetStatic, { recursive: true });
}

fs.mkdirSync(path.join(".next", "server", "pages"), { recursive: true });
fs.mkdirSync(path.join(".next", "static", "chunks", "pages"), { recursive: true });
fs.mkdirSync(path.join(".next", "server", "chunks"), { recursive: true });
fs.mkdirSync(path.join(".next", "standalone", ".next", "server"), { recursive: true });

const manifestPath = path.join(".next", "server", "middleware-build-manifest.js");
if (!fs.existsSync(manifestPath)) {
  fs.writeFileSync(manifestPath, "self.__BUILD_MANIFEST = {};\n");
}

console.log("Pre-created build directories for", appDirs.length, "routes");
