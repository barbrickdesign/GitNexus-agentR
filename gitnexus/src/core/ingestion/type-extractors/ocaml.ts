/**
 * OCaml type extraction config.
 *
 * OCaml is statically typed with type inference — explicit type annotations
 * are optional but often present as:
 *   - `let (x : int) = ...`          (typed pattern)
 *   - `let f (x : int) (y : string) = ...` (typed parameters)
 *   - `val foo : int -> int`          (interface/mli value descriptions)
 *
 * We extract type bindings where annotations are explicitly present.
 */

import type { SyntaxNode } from '../utils/ast-helpers.js';
import type { LanguageTypeConfig, TypeBindingExtractor, ParameterExtractor } from './types.js';
import { extractSimpleTypeName, extractVarName } from './shared.js';

// ── Declaration extraction ────────────────────────────────────────────────────

/**
 * Extract type binding from a `let_binding` node.
 *
 * Covers:
 *   `let (x : int) = ...`  → env("x") = "int"
 *   `let x : int = ...`    → env("x") = "int"  (some grammar versions)
 */
const extractOCamlDeclaration: TypeBindingExtractor = (node, env) => {
  if (node.type !== 'let_binding') return;

  const pattern = node.childForFieldName?.('pattern');
  const typeAnnotation = node.childForFieldName?.('type');

  if (!pattern || !typeAnnotation) return;

  const varName =
    pattern.type === 'value_name'
      ? pattern.text
      : pattern.type === 'typed'
        ? pattern.firstNamedChild?.text
        : null;

  if (!varName) return;

  const typeName = extractSimpleTypeName(typeAnnotation) ?? typeAnnotation.text?.trim();
  if (typeName) env.set(varName, typeName);
};

// ── Parameter extraction ──────────────────────────────────────────────────────

/**
 * Extract type binding from a typed OCaml `parameter` node.
 *
 * A typed OCaml parameter looks like:
 *   `(x : int)`  — `parameter` node containing a `typed` pattern
 *   `~label:(x : int)` — labeled argument with type annotation
 */
const extractOCamlParameter: ParameterExtractor = (node, env) => {
  if (node.type !== 'parameter' && node.type !== 'labeled_argument') return;

  // typed pattern: (x : int) → pattern_name + type_expression
  const typed = (() => {
    for (let i = 0; i < node.namedChildCount; i++) {
      const c = node.namedChild(i);
      if (c?.type === 'typed') return c;
    }
    return null;
  })();

  if (typed) {
    const nameNode = typed.firstNamedChild;
    const typeNode = typed.lastNamedChild;
    if (nameNode && typeNode && nameNode !== typeNode) {
      const varName = extractVarName(nameNode);
      const typeName = extractSimpleTypeName(typeNode) ?? typeNode.text?.trim();
      if (varName && typeName) env.set(varName, typeName);
    }
    return;
  }

  // label: (x : type) inside labeled_argument
  const typeAnnotation = node.childForFieldName?.('type');
  const pattern = node.childForFieldName?.('pattern') ?? node.firstNamedChild;
  if (typeAnnotation && pattern) {
    const varName = extractVarName(pattern);
    const typeName = extractSimpleTypeName(typeAnnotation) ?? typeAnnotation.text?.trim();
    if (varName && typeName) env.set(varName, typeName);
  }
};

// ── Config ────────────────────────────────────────────────────────────────────

export const typeConfig: LanguageTypeConfig = {
  declarationNodeTypes: new Set(['let_binding', 'value_description']),
  extractDeclaration: extractOCamlDeclaration,
  extractParameter: extractOCamlParameter,
};
