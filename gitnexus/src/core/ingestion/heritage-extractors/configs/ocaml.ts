// gitnexus/src/core/ingestion/heritage-extractors/configs/ocaml.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { HeritageExtractionConfig } from '../../heritage-types.js';

/**
 * OCaml heritage extraction config.
 *
 * OCaml classes inherit via `inherit` expressions inside object bodies.
 * Tree-sitter-ocaml surfaces these as `inherit_field` nodes. Module
 * includes (`include Module`) bring another module's definitions into
 * scope — we treat those as trait/mixin relationships.
 *
 * For now, the default heritage extractor behavior (EXTENDS edge) is
 * sufficient; no custom `shouldSkipExtends` hook is required.
 */
export const ocamlHeritageConfig: HeritageExtractionConfig = {
  language: SupportedLanguages.OCaml,
};
