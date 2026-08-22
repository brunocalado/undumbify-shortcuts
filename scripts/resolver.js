/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { normalizeCombo, replaceBinding } from "./helpers.js";

/**
 * The single place a conflict resolution is turned into writes. Both the local path (the
 * Conflict Overview) and the remote path (broadcasting a resolution to every connected client)
 * call the functions here, so a resolution cannot mean two different things depending on where
 * it was triggered from.
 *
 * @typedef {object} BindingOp
 * @property {string} actionId
 * @property {string} combo                                     Identifies which binding of the
 *   action to touch — position-independent, unlike an index, which can point at a different
 *   binding on a receiving client whose array is ordered differently.
 * @property {{key: string, modifiers: string[]}|null} binding  null removes the binding
 */

/**
 * Turn "keep this one" into the set of writes it implies.
 * Every *other* editable claim on the combination is removed; the kept action is untouched.
 * Uneditable claims are returned separately — they are the reason a resolution can be partial.
 * @param {{combo: string, actions: Array<object>}} group
 * @param {string} keepActionId
 * @param {number} keepIndex
 * @returns {{ops: BindingOp[], locked: Array<object>}}
 */
export function planKeepOnly(group, keepActionId, keepIndex) {
  const ops = [];
  const locked = [];

  for ( const action of group.actions ) {
    if ( (action.actionId === keepActionId) && (action.index === keepIndex) ) continue;
    if ( !action.editable ) {
      locked.push(action);
      continue;
    }
    ops.push({ actionId: action.actionId, combo: group.combo, binding: null });
  }

  return { ops, locked };
}

/**
 * Apply a list of ops on this client, one at a time, collecting per-op failures.
 * Never throws: a restricted action on a non-GM client is an expected outcome, not an error.
 *
 * Each op resolves `combo` to a live index at write time rather than trusting an index captured
 * earlier — the binding list may have moved since (an earlier op in this same batch shifted it),
 * or may simply be ordered differently on a receiving client. An op whose combo is no longer
 * present is treated as already satisfied, not a failure.
 * @param {BindingOp[]} ops
 * @returns {Promise<{applied: number, failures: Array<{actionId: string, message: string}>}>}
 */
export async function applyBindingOps(ops) {
  let applied = 0;
  const failures = [];

  for ( const op of ops ) {
    try {
      const bindings = game.keybindings.bindings.get(op.actionId) ?? [];
      const index = bindings.findIndex(binding =>
        binding?.key && (normalizeCombo(binding.key, binding.modifiers ?? []) === op.combo));
      if ( index === -1 ) continue;

      await replaceBinding(op.actionId, index, op.binding);
      applied++;
    } catch ( error ) {
      failures.push({ actionId: op.actionId, message: error.message });
    }
  }

  return { applied, failures };
}
