import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

process.env.NODE_ENV = "test";

const testsDir = path.resolve(process.cwd(), "tests");

function findTestFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findTestFiles(fullPath));
    } else if (file.endsWith(".test.mjs") || file.endsWith(".test.js")) {
      results.push(fullPath);
    }
  }
  return results;
}

const files = findTestFiles(testsDir);
if (files.length === 0) {
  console.log("No test files found.");
  process.exit(0);
}

console.log(`Discovered ${files.length} test file(s):`);
files.forEach((f) => console.log(`  - ${path.relative(process.cwd(), f)}`));

const result = spawnSync(
  process.execPath,
  ["--no-warnings", "--loader", "./scripts/ts-loader.mjs", "--test", ...files],
  {
    stdio: "inherit",
    shell: false,
  }
);

process.exit(result.status ?? 0);
