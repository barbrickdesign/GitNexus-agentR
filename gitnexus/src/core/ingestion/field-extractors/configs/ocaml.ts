// gitnexus/src/core/ingestion/field-extractors/configs/ocaml.ts

import { SupportedLanguages } from 'gitnexus-shared';
import type { FieldExtractionConfig } from '../generic.js';
import { extractSimpleTypeName } from '../../type-extractors/shared.js';

/**
 * OCaml field extraction config.
 *
 * OCaml record fields appear inside `record_declaration` under a
 * `type_definition`. Each field is a `field_declaration` with a
 * `field_name` and optional `type_expression`.
 *
 * Visibility: OCaml has no field-level visibility modifiers; all fields
 * are accessible within the same module. We use 'public' by default.
 * Mutable fields carry the `mutable` keyword.
 */
export const ocamlFieldConfig: FieldExtractionConfig = {
  language: SupportedLanguages.OCaml,
  typeDeclarationNodes: ['type_definition'],
  fieldNodeTypes: ['field_declaration'],
  bodyNodeTypes: ['record_declaration'],
  defaultVisibility: 'public',

  extractName(node) {
    // field_declaration > field_name (named child 0)
    const nameNode = node.childForFieldName?.('name');
    if (nameNode) return nameNode.text;
    // fallback: first named child whose type is 'field_name'
    for (let i = 0; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child?.type === 'field_name') return child.text;
    }
    return undefined;
  },

  extractType(node) {
    // field_declaration: second named child is the type expression
    const typeNode = node.childForFieldName?.('type');
    if (typeNode) return extractSimpleTypeName(typeNode) ?? typeNode.text?.trim();
    // fallback: walk named children for a type expression node
    for (let i = 1; i < node.namedChildCount; i++) {
      const child = node.namedChild(i);
      if (child && child.type !== 'field_name' && child.type !== 'mutable') {
        return extractSimpleTypeName(child) ?? child.text?.trim();
      }
    }
    return undefined;
  },

  extractVisibility(_node) {
    // OCaml record fields have no access modifiers — always public within module
    return 'public';
  },

  isStatic(_node) {
    return false; // OCaml has no static fields
  },

  isReadonly(node) {
    // Fields without `mutable` keyword are immutable by default in OCaml
    for (let i = 0; i < node.childCount; i++) {
      const child = node.child(i);
      if (child?.text === 'mutable') return false;
    }
    return true;
  },
};
