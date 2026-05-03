/**
 * OCaml import resolution config.
 *
 * OCaml `open Foo` and `open Foo.Bar.Baz` bring the module's exports into scope.
 * Module names are CamelCase; the corresponding file is snake_case or lowercase:
 *   - `open MyModule` → looks for `my_module.ml`, `mymodule.ml`, or `my_module/…`
 *
 * We use `importSemantics: 'wildcard-leaf'` (same as Go) — `open` brings
 * everything public from the module into scope in a single hop.
 *
 * The standard resolver handles relative imports; the OCaml strategy
 * additionally tries a lowercased / snake_cased version of the module name.
 */

import { SupportedLanguages } from 'gitnexus-shared';
import type { ImportResolutionConfig, ImportResolverStrategy } from '../types.js';
import { createStandardStrategy } from '../standard.js';

/**
 * Convert an OCaml module path (e.g. `Foo.Bar.Baz`) to possible file paths
 * the standard resolver can find:
 *   - `foo/bar/baz.ml`
 *   - `foo_bar_baz.ml`  (joined with underscores)
 *   - `baz.ml`          (leaf module only)
 */
function ocamlModuleToFilePaths(modulePath: string): string[] {
  const parts = modulePath.split('.').map((p) => p.toLowerCase());
  const candidates: string[] = [];

  // foo/bar/baz.ml — nested directory structure
  candidates.push(parts.join('/'));

  // foo_bar_baz.ml — flat file name joined by underscores
  if (parts.length > 1) {
    candidates.push(parts.join('_'));
  }

  // baz.ml — just the leaf
  if (parts.length > 1) {
    candidates.push(parts[parts.length - 1]!);
  }

  return candidates;
}

/**
 * OCaml-specific import resolution strategy.
 *
 * Handles module paths like `Foo`, `Foo.Bar`, `Foo.Bar.Baz`. Tries
 * lowercased / snake_case variants of the module path.
 */
export const ocamlModuleStrategy: ImportResolverStrategy = (rawImportPath, _filePath, ctx) => {
  // Only handle non-relative paths (relative OCaml imports are rare; fall to standard)
  if (rawImportPath.startsWith('.')) return null;

  const candidates = ocamlModuleToFilePaths(rawImportPath);
  for (const candidate of candidates) {
    // Try with .ml and .mli extensions
    for (const ext of ['.ml', '.mli']) {
      const withExt = candidate + ext;
      for (const file of ctx.allFileList) {
        const normalized = file.toLowerCase().replace(/\\/g, '/');
        if (normalized.endsWith('/' + withExt) || normalized === withExt) {
          return { kind: 'files', files: [file] };
        }
      }
    }
  }
  return null;
};

export const ocamlImportConfig: ImportResolutionConfig = {
  language: SupportedLanguages.OCaml,
  strategies: [ocamlModuleStrategy, createStandardStrategy(SupportedLanguages.OCaml)],
};
