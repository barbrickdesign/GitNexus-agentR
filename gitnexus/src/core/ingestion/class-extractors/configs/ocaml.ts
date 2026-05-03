// gitnexus/src/core/ingestion/class-extractors/configs/ocaml.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { ClassExtractionConfig } from '../../class-types.js';

/**
 * OCaml class/type extractor config.
 *
 * OCaml class-like constructs:
 *   - `class_definition`: OO class (`class c = object ... end`)
 *   - `module_definition`: first-class modules (used as type containers)
 *   - `type_definition`: type aliases and record/variant type declarations
 *
 * `extractName` is omitted (uses default AST child walk) because the
 * OCAML_QUERIES already captures the name via `@name` on the enclosing node.
 */
export const ocamlClassConfig: ClassExtractionConfig = {
  language: SupportedLanguages.OCaml,
  typeDeclarationNodes: ['class_definition', 'module_definition', 'type_definition'],
  ancestorScopeNodeTypes: ['class_definition', 'module_definition'],
};
