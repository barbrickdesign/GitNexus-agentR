// gitnexus/src/core/ingestion/method-extractors/configs/ocaml.ts
// Verified against tree-sitter-ocaml 0.24.x

import { SupportedLanguages } from 'gitnexus-shared';
import type { MethodExtractionConfig, ParameterInfo, MethodVisibility } from '../../method-types.js';
import type { SyntaxNode } from '../../utils/ast-helpers.js';

// ---------------------------------------------------------------------------
// OCaml helpers
// ---------------------------------------------------------------------------

/**
 * Extract a method/function name from OCaml AST nodes.
 *
 * Handles:
 *   - `method_definition`: name is a `method_name` child
 *   - `let_binding`: pattern is a `value_name` or `value_path`
 *   - `value_description` (.mli): first child is a `value_name`
 */
function extractOCamlName(node: SyntaxNode): string | undefined {
  // method_definition: name field
  const nameField = node.childForFieldName?.('name');
  if (nameField) return nameField.text;

  // let_binding: pattern is value_name
  if (node.type === 'let_binding') {
    const pattern = node.childForFieldName?.('pattern');
    if (pattern?.type === 'value_name') return pattern.text;
  }

  // value_description (.mli val foo : ...)
  if (node.type === 'value_description') {
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child?.type === 'value_name') return child.text;
    }
  }

  // fallback: first named child that looks like a name
  const first = node.firstNamedChild;
  if (first?.type === 'method_name' || first?.type === 'value_name') return first.text;
  return undefined;
}

/**
 * Extract parameters from OCaml let-bindings.
 *
 * OCaml parameters appear as `parameter` nodes after the pattern in a
 * `let_binding`. Each `parameter` wraps either a bare `value_name`
 * (anonymous typed) or a `labeled_argument` / `optional_argument`.
 */
function extractOCamlParameters(node: SyntaxNode): ParameterInfo[] {
  const params: ParameterInfo[] = [];
  if (node.type !== 'let_binding' && node.type !== 'method_definition') return params;

  for (let i = 0; i < node.namedChildCount; i++) {
    const child = node.namedChild(i);
    if (!child) continue;

    if (child.type === 'parameter') {
      // Simple parameter: (value_name) or (typed_pattern value_name : type)
      const nameNode = child.childForFieldName?.('pattern') ?? child.firstNamedChild;
      const typePat = child.childForFieldName?.('type');
      params.push({
        name: nameNode?.text ?? `_${i}`,
        type: typePat ? typePat.text?.trim() ?? null : null,
        rawType: typePat?.text?.trim() ?? null,
        isOptional: false,
        isVariadic: false,
      });
    } else if (child.type === 'labeled_argument' || child.type === 'optional_argument') {
      const labelNode = child.childForFieldName?.('label') ?? child.firstNamedChild;
      const typePat = child.childForFieldName?.('type');
      params.push({
        name: labelNode?.text ?? `_${i}`,
        type: typePat ? typePat.text?.trim() ?? null : null,
        rawType: typePat?.text?.trim() ?? null,
        isOptional: child.type === 'optional_argument',
        isVariadic: false,
      });
    }
  }
  return params;
}

/**
 * OCaml visibility: convention-based.
 * Names starting with `_` are conventionally private; others are public.
 * `.mli` interface files explicitly declare what is public; we treat all
 * definitions as public here (the export checker handles .ml vs .mli).
 */
function extractOCamlVisibility(node: SyntaxNode): MethodVisibility {
  const name = extractOCamlName(node);
  return name?.startsWith('_') ? 'private' : 'public';
}

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

export const ocamlMethodConfig: MethodExtractionConfig = {
  language: SupportedLanguages.OCaml,

  typeDeclarationNodes: [
    'let_binding',
    'method_definition',
    'value_description',
    'external',
  ],
  methodNodeTypes: ['let_binding', 'method_definition', 'value_description', 'external'],
  bodyNodeTypes: [],

  extractName: extractOCamlName,
  extractReturnType(_node) {
    // OCaml type annotations on return are part of the full type signature;
    // extracting them precisely requires type inference which is out of scope.
    return undefined;
  },
  extractParameters: extractOCamlParameters,
  extractVisibility: extractOCamlVisibility,

  isStatic(_node) {
    // OCaml has no static methods in the Java/C# sense
    return false;
  },

  isAbstract(_node) {
    // Abstract methods in OCaml appear in module type / class type bodies;
    // we don't differentiate here.
    return false;
  },

  isFinal(_node) {
    return false;
  },
};
