/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { formatCombo, getActionMeta, isUneditable, normalizeCombo } from "./helpers.js";

/**
 * Conflict detection. Pure reads of the keybinding registry — no DOM, no side effects.
 *
 * A conflict here means two or more actions bound to the exact same key plus
 * modifiers. That is deliberately narrower than Foundry's own warning, which also
 * weighs reserved modifiers and precedence: this module's job is to name the
 * packages sharing a combo, which requires an exact match to be meaningful.
 */

/**
 * @typedef {object} BoundAction
 * @property {string} actionId    Fully-qualified action id
 * @property {number} index       Index within game.keybindings.bindings for that action
 * @property {boolean} editable   Whether the user may change this binding
 */

/* -------------------------------------------- */

/**
 * Group every active binding by the combo it occupies.
 *
 * `game.keybindings.bindings` is the authoritative live set — ClientKeybindings
 * builds it as each action's uneditable bindings followed by its editable ones,
 * so a single pass covers both.
 * @returns {Map<string, BoundAction[]>}
 */
function collectBindings() {
  const byCombo = new Map();
  for ( const [actionId, bindings] of game.keybindings.bindings ) {
    for ( const [index, binding] of (bindings ?? []).entries() ) {
      if ( !binding?.key ) continue;
      const combo = normalizeCombo(binding.key, binding.modifiers ?? []);
      if ( !byCombo.has(combo) ) byCombo.set(combo, []);
      byCombo.get(combo).push({ actionId, index, editable: !isUneditable(actionId, binding) });
    }
  }
  return byCombo;
}

/**
 * Every action bound to a combo, in display form.
 * @param {string} combo  A combo from normalizeCombo()
 * @returns {Array<ReturnType<typeof getActionMeta> & {index: number, editable: boolean}>}
 */
export function getActionsForCombo(combo) {
  return (collectBindings().get(combo) ?? [])
    .map(entry => ({ ...getActionMeta(entry.actionId), index: entry.index, editable: entry.editable }));
}

/**
 * Map each conflicting action to the combos it clashes on, and who it clashes with.
 *
 * Shape: `Map<actionId, Map<combo, Array<meta & {index, editable}>>>`, where the
 * inner arrays list the *other* actions on that combo.
 * @returns {Map<string, Map<string, Array<object>>>}
 */
export function buildConflictMap() {
  const conflicts = new Map();

  for ( const [combo, entries] of collectBindings() ) {
    const actionIds = new Set(entries.map(e => e.actionId));
    if ( actionIds.size < 2 ) continue;  // The same action bound twice is not a conflict.

    for ( const entry of entries ) {
      const others = entries
        .filter(other => other.actionId !== entry.actionId)
        .map(other => ({ ...getActionMeta(other.actionId), index: other.index, editable: other.editable }));
      if ( !conflicts.has(entry.actionId) ) conflicts.set(entry.actionId, new Map());
      conflicts.get(entry.actionId).set(combo, others);
    }
  }

  return conflicts;
}

/**
 * How many actions in each sidebar category are involved in a conflict.
 *
 * Counted per action, not per pair: the nav badge answers "how many rows in here need
 * attention", and an action clashing with three others is still one row to fix.
 * Keys are ControlsConfig category ids, so they match `button[data-tab]` directly.
 * @returns {Map<string, number>}
 */
export function countConflictsByCategory() {
  const counts = new Map();
  for ( const actionId of buildConflictMap().keys() ) {
    const { categoryId } = getActionMeta(actionId);
    counts.set(categoryId, (counts.get(categoryId) ?? 0) + 1);
  }
  return counts;
}

/**
 * Every contested combination, with all of the actions competing for it.
 *
 * Grouping by combination rather than by pair is what makes a resolution possible: "who keeps
 * Shift + C" is a question about the group, and answering it clears every other claim at once.
 * @returns {Array<{combo: string, comboDisplay: string, actions: Array<object>}>}
 */
export function getConflictGroups() {
  const groups = [];

  for ( const [combo, entries] of collectBindings() ) {
    const actionIds = new Set(entries.map(e => e.actionId));
    if ( actionIds.size < 2 ) continue;

    const actions = entries
      .map(entry => ({ ...getActionMeta(entry.actionId), index: entry.index, editable: entry.editable }))
      .sort((a, b) => a.packageTitle.localeCompare(b.packageTitle) || a.label.localeCompare(b.label));

    groups.push({ combo, comboDisplay: formatCombo(combo), actions });
  }

  return groups.sort((a, b) => a.comboDisplay.localeCompare(b.comboDisplay));
}

/**
 * How many contested combinations exist right now.
 * @returns {number}
 */
export function countConflicts() {
  return getConflictGroups().length;
}
