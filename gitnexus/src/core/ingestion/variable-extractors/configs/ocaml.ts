// gitnexus/src/core/ingestion/variable-extractors/configs/ocaml.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { VariableExtractionConfig, VariableVisibility } from '../../variable-types.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

/**
 * OCaml variable/constant extraction config.
 *
 * OCaml top-level `let` bindings that are not functions are treated as
 * constants (all `let` bindings in OCaml are immutable by default).
 *
 *   - `value_definition` wraps `let_binding`(s) at the top level
 *   - `let_binding` with a simple `value_name` pattern and no parameters
 *     is a constant binding, e.g. `let max_size = 100`
 *
 * Visibility: convention — underscore prefix = private.
 */

function extractOCamlVarName(node: SyntaxNode): string | undefined {
  // value_definition → let_binding → pattern: value_name
  if (node.type === 'value_definition') {
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child?.type === 'let_binding') {
        const pattern = child.childForFieldName?.('pattern');
        if (pattern?.type === 'value_name') return pattern.text;
      }
    }
  }
  if (node.type === 'let_binding') {
    const pattern = node.childForFieldName?.('pattern');
    if (pattern?.type === 'value_name') return pattern.text;
  }
  return undefined;
}

function extractOCamlVarType(node: SyntaxNode): string | undefined {
  // let_binding may have a type constraint: let x : int = ...
  const binding =
    node.type === 'value_definition'
      ? (() => {
          for (let i = 0; i < node.namedChildCount; i++) {
            const c = node.namedChild(i);
            if (c?.type === 'let_binding') return c;
          }
          return null;
        })()
      : node.type === 'let_binding'
        ? node
        : null;

  if (!binding) return undefined;
  const typeAnnotation = binding.childForFieldName?.('type');
  return typeAnnotation?.text?.trim();
}

export const ocamlVariableConfig: VariableExtractionConfig = {
  language: SupportedLanguages.OCaml,
  constNodeTypes: ['value_definition'],
  staticNodeTypes: [],
  variableNodeTypes: [],

  extractName: extractOCamlVarName,
  extractType: extractOCamlVarType,

  extractVisibility(node): VariableVisibility {
    const name = extractOCamlVarName(node);
    if (name?.startsWith('_')) return 'private';
    return 'public';
  },

  isConst(_node) {
    // All OCaml top-level let bindings are immutable constants
    return true;
  },

  isStatic(_node) {
    return false;
  },

  isMutable(_node) {
    // OCaml let bindings are immutable; mutable state uses `ref` values
    return false;
  },
};
