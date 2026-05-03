/**
 * OCaml Language Provider
 *
 * Assembles all OCaml-specific ingestion capabilities into a single
 * LanguageProvider, following the Strategy pattern used by the pipeline.
 *
 * Key OCaml traits:
 *   - importSemantics: 'wildcard-leaf' — `open Module` brings all public
 *     symbols from the module into scope in a single hop (analogous to Go).
 *   - Both `.ml` (implementation) and `.mli` (interface/signature) files.
 *   - No `new` keyword for construction; function application is juxtaposition.
 *   - Visibility is convention-based (underscore prefix = private).
 *   - OCaml modules are the primary unit of abstraction and namespace.
 *
 * Grammar support: tree-sitter-ocaml v0.24.x.
 */

import { SupportedLanguages } from 'gitnexus-shared';
import { createClassExtractor } from '../class-extractors/generic.js';
import { ocamlClassConfig } from '../class-extractors/configs/ocaml.js';
import { defineLanguage } from '../language-provider.js';
import { typeConfig as ocamlTypeConfig } from '../type-extractors/ocaml.js';
import { ocamlExportChecker } from '../export-detection.js';
import { createImportResolver } from '../import-resolvers/resolver-factory.js';
import { ocamlImportConfig } from '../import-resolvers/configs/ocaml.js';
import { OCAML_QUERIES } from '../tree-sitter-queries.js';
import { createFieldExtractor } from '../field-extractors/generic.js';
import { ocamlFieldConfig } from '../field-extractors/configs/ocaml.js';
import { createMethodExtractor } from '../method-extractors/generic.js';
import { ocamlMethodConfig } from '../method-extractors/configs/ocaml.js';
import { createVariableExtractor } from '../variable-extractors/generic.js';
import { ocamlVariableConfig } from '../variable-extractors/configs/ocaml.js';
import { createCallExtractor } from '../call-extractors/generic.js';
import { ocamlCallConfig } from '../call-extractors/configs/ocaml.js';
import { createHeritageExtractor } from '../heritage-extractors/generic.js';
import { ocamlHeritageConfig } from '../heritage-extractors/configs/ocaml.js';

/**
 * OCaml built-in / standard library names that clutter the call graph.
 *
 * These are common Stdlib / Pervasives identifiers that appear in virtually
 * every OCaml file and produce noisy, meaningless call edges.
 */
const OCAML_BUILTINS: ReadonlySet<string> = new Set([
  'print_string',
  'print_endline',
  'print_int',
  'print_float',
  'print_newline',
  'Printf',
  'sprintf',
  'Printf.printf',
  'Printf.sprintf',
  'failwith',
  'invalid_arg',
  'raise',
  'ignore',
  'succ',
  'pred',
  'abs',
  'min',
  'max',
  'fst',
  'snd',
  'not',
  'List',
  'Array',
  'String',
  'Bytes',
  'Char',
  'Int',
  'Float',
  'Option',
  'Result',
  'Seq',
  'Map',
  'Set',
  'Hashtbl',
  'Buffer',
  'Format',
]);

export const ocamlProvider = defineLanguage({
  id: SupportedLanguages.OCaml,
  extensions: ['.ml', '.mli'],
  entryPointPatterns: [/^main$/, /^run$/, /^start$/, /^init$/, /^execute$/],
  astFrameworkPatterns: [
    {
      framework: 'dream',
      entryPointMultiplier: 2.5,
      reason: 'dream-handler',
      patterns: ['Dream.run', 'Dream.router', 'Dream.handler', 'Dream.respond', 'Dream.html'],
    },
    {
      framework: 'cohttp',
      entryPointMultiplier: 2.0,
      reason: 'cohttp-server',
      patterns: ['Cohttp_lwt_unix', 'Cohttp', 'Server.create', 'Server.make'],
    },
    {
      framework: 'opium',
      entryPointMultiplier: 2.5,
      reason: 'opium-handler',
      patterns: ['Opium', 'App.run_command', 'App.get', 'App.post', 'Rock.Handler'],
    },
  ],
  treeSitterQueries: OCAML_QUERIES,
  typeConfig: ocamlTypeConfig,
  exportChecker: ocamlExportChecker,
  importResolver: createImportResolver(ocamlImportConfig),
  importSemantics: 'wildcard-leaf',
  callExtractor: createCallExtractor(ocamlCallConfig),
  fieldExtractor: createFieldExtractor(ocamlFieldConfig),
  methodExtractor: createMethodExtractor(ocamlMethodConfig),
  variableExtractor: createVariableExtractor(ocamlVariableConfig),
  classExtractor: createClassExtractor(ocamlClassConfig),
  heritageExtractor: createHeritageExtractor(ocamlHeritageConfig),
  builtInNames: OCAML_BUILTINS,
  // OCaml does not have traditional class inheritance; modules use `include`
  // which we map to EXTENDS by default.
  heritageDefaultEdge: 'EXTENDS',
  mroStrategy: 'first-wins',
});
