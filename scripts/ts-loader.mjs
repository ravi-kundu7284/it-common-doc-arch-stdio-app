import fs from "node:fs";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";
import ts from "typescript";

const TS_EXTENSIONS = new Set([".ts", ".tsx"]);

export async function resolve(specifier, context, nextResolve) {
  const { parentURL } = context;

  // Handle relative imports
  if (specifier.startsWith("./") || specifier.startsWith("../") || specifier.startsWith("/")) {
    const parentDir = parentURL ? path.dirname(fileURLToPath(parentURL)) : process.cwd();
    const resolvedPath = path.resolve(parentDir, specifier);

    // Try as-is
    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) {
      return {
        url: pathToFileURL(resolvedPath).href,
        shortCircuit: true,
      };
    }

    // Try extensions
    for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
      const withExt = resolvedPath + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return {
          url: pathToFileURL(withExt).href,
          shortCircuit: true,
        };
      }
    }
  }

  // Handle path aliases like @/
  if (specifier.startsWith("@/")) {
    const srcPath = path.resolve(process.cwd(), "src", specifier.slice(2));
    if (fs.existsSync(srcPath) && fs.statSync(srcPath).isFile()) {
      return {
        url: pathToFileURL(srcPath).href,
        shortCircuit: true,
      };
    }
    for (const ext of [".ts", ".tsx", ".js", ".mjs"]) {
      const withExt = srcPath + ext;
      if (fs.existsSync(withExt) && fs.statSync(withExt).isFile()) {
        return {
          url: pathToFileURL(withExt).href,
          shortCircuit: true,
        };
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (url.startsWith("file:")) {
    const filePath = fileURLToPath(url);
    const ext = path.extname(filePath);

    if (TS_EXTENSIONS.has(ext)) {
      const source = fs.readFileSync(filePath, "utf8");
      const { outputText } = ts.transpileModule(source, {
        compilerOptions: {
          module: ts.ModuleKind.ESNext,
          target: ts.ScriptTarget.ES2022,
          jsx: ts.JsxEmit.ReactJSX,
          esModuleInterop: true,
        },
        fileName: filePath,
      });

      return {
        format: "module",
        shortCircuit: true,
        source: outputText,
      };
    }
  }

  return nextLoad(url, context);
}

