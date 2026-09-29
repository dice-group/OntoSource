import { readFileSync } from "node:fs";
import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import Module from "node:module";
import ts from "typescript";

export function loadTypeScript(url) {
  const filename = fileURLToPath(url);
  const compile = (module, path) => {
    const { outputText } = ts.transpileModule(readFileSync(path, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2020 },
    });
    module._compile(outputText, path);
  };
  const compiled = new Module(filename);
  compiled.filename = filename;
  compiled.paths = Module._nodeModulePaths(dirname(filename));
  const previous = Module._extensions[".ts"];
  Module._extensions[".ts"] = compile;
  try {
    compile(compiled, filename);
    return compiled.exports;
  } finally {
    if (previous) Module._extensions[".ts"] = previous;
    else delete Module._extensions[".ts"];
  }
}
