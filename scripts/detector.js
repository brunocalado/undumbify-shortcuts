/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTINGS } from "./constants.js";
import { formatCombo, getActionMeta, isUneditable, normalizeCombo, parseCombo } from "./helpers.js";

const { KeyboardManager } = foundry.helpers.interaction;

/**
 * Conflict detection. Pure reads of the keybinding registry and of the ignore list — no DOM, no
 * writes.
 *
 * A conflict here is a key press that more than one action would respond to, judged by the same
 * rules KeyboardManager uses when it dispatches a key (`#testContext` in core):
 *   - a binding's own modifiers must all be held;
 *   - any *other* held modifier must be one of the action's `reservedModifiers` — which is how
 *     core's "Descend" on Q also fires on Shift + Q, and why an exact-combo comparison misses it;
 *   - `restricted` actions never run for a non-GM, so they cannot collide on a player's client.
 *
 * Foundry runs every matching action in precedence/registration order until one returns true.
 * Whether a handler returns true is only known by running it, so a group found here is either
 * "both fire", "the first one swallows the key", or "the first one only acts in some context" —
 * the last is the legitimate coexistence the GM's ignore list exists for.
 */

/**
 * @typedef {object} BoundEntry
 * @property {string} actionId
 * @property {number} index           Index within game.keybindings.bindings for that action
 * @property {boolean} editable       Whether the user may change this binding
 * @property {string} bindingCombo    The binding's own combo, from normalizeCombo()
 * @property {Set<string>} required   Modifiers the binding requires
 * @property {Set<string>} allowed    Modifiers that may be held: required plus reserved
 * @property {number} precedence
 * @property {number} order           Registration order, core's tie-breaker within a precedence
 */

/** Every modifier, as the canonical values bindings store. */
const MODIFIERS = Object.values(KeyboardManager.MODIFIER_KEYS);

/**
 * Every subset of the modifiers, fewest first — the order matters to getConflictGroups(), which
 * names a group after the plainest press that produces it.
 * @type {string[][]}
 */
const MODIFIER_SETS = Array.fromRange(2 ** MODIFIERS.length)
  .map(mask => MODIFIERS.filter((_m, i) => mask & (1 << i)))
  .sort((a, b) => a.length - b.length);

/* -------------------------------------------- */

/**
 * Index every binding that can fire on this client by the physical key it sits on.
 *
 * `game.keybindings.bindings` is the authoritative live set — ClientKeybindings builds it as each
 * action's uneditable bindings followed by its editable ones, so a single pass covers both.
 * @param {object} [options]
 * @param {boolean} [options.forConflicts=true]  Leave out core's own locked bindings (Escape,
 *   Delete, Ctrl + C/V/X/Z/A). Packages extend those keys on purpose, the core side can never be
 *   rebound, and ControlsConfig itself never flags them — counted as conflicts they were the
 *   noisiest false positives there were. The combination search still lists them.
 * @returns {Map<string, BoundEntry[]>}
 */
function collectBindings({ forConflicts = true } = {}) {
  const byKey = new Map();
  for ( const [actionId, bindings] of game.keybindings.bindings ) {
    const action = game.keybindings.actions.get(actionId);
    if ( !action ) continue;
    if ( action.restricted && !game.user.isGM ) continue;

    for ( const [index, binding] of (bindings ?? []).entries() ) {
      if ( !binding?.key ) continue;
      const editable = !isUneditable(actionId, binding);
      if ( forConflicts && !editable && (action.namespace === "core") ) continue;

      const bindingCombo = normalizeCombo(binding.key, binding.modifiers ?? []);
      const required = new Set(parseCombo(bindingCombo).modifiers);
      const allowed = new Set([...required, ...(action.reservedModifiers ?? []).map(canonicalModifier)]);
      if ( !byKey.has(binding.key) ) byKey.set(binding.key, []);
      byKey.get(binding.key).push({ actionId, index, editable, bindingCombo, required, allowed,
        precedence: action.precedence, order: action.order });
    }
  }
  return byKey;
}

/**
 * Coerce a modifier to its canonical value ("Control" / "Shift" / "Alt").
 * @param {string} modifier
 * @returns {string}
 */
function canonicalModifier(modifier) {
  return KeyboardManager.MODIFIER_KEYS[modifier] ?? modifier;
}

/**
 * Whether a binding fires when exactly these modifiers are held with its key.
 * @param {{required: Set<string>, allowed: Set<string>}} entry
 * @param {string[]} held
 * @returns {boolean}
 */
function firesOn(entry, held) {
  return [...entry.required].every(m => held.includes(m)) && held.every(m => entry.allowed.has(m));
}

/**
 * Whether some press of their shared key fires both bindings.
 * @param {{required: Set<string>, allowed: Set<string>}} a
 * @param {{required: Set<string>, allowed: Set<string>}} b
 * @returns {boolean}
 */
function overlaps(a, b) {
  return [...a.required].every(m => b.allowed.has(m)) && [...b.required].every(m => a.allowed.has(m));
}

/**
 * The order KeyboardManager tries actions in: precedence first, then registration order.
 * @param {{precedence: number, order: number}} a
 * @param {{precedence: number, order: number}} b
 * @returns {number}
 */
function compareDispatch(a, b) {
  return (a.precedence - b.precedence) || (a.order - b.order);
}

/**
 * Display data for one entry.
 * @param {BoundEntry} entry
 * @returns {object}
 */
function describe(entry) {
  return { ...getActionMeta(entry.actionId), index: entry.index, editable: entry.editable,
    bindingCombo: entry.bindingCombo };
}

/* -------------------------------------------- */
/*  Ignore list                                 */
/* -------------------------------------------- */

/**
 * The stable identity of a conflict: the press plus every action on it. A new action joining the
 * combination changes it, which is what makes an ignored conflict come back when it should.
 * @param {string} combo
 * @param {string[]} actionIds
 * @returns {string}
 */
export function conflictSignature(combo, actionIds) {
  return `${combo}|${[...new Set(actionIds)].sort().join(",")}`;
}

/**
 * Whether the GM has marked these actions as able to coexist on this press.
 * Containment, not equality: a player whose client hides a GM-only action sees a smaller group
 * than the GM approved, and an action leaving an approved group does not make it less safe.
 * @param {string} combo
 * @param {string[]} actionIds
 * @returns {boolean}
 */
function isIgnored(combo, actionIds) {
  return game.settings.get(MODULE_ID, SETTINGS.ignoredConflicts).some(entry =>
    (entry.combo === combo) && actionIds.every(id => entry.actionIds.includes(id)));
}

/* -------------------------------------------- */
/*  Queries                                     */
/* -------------------------------------------- */

/**
 * Every key press more than one action responds to, with all of those actions in the order
 * Foundry tries them.
 *
 * Each of the eight modifier combinations is tried per key, so overlaps through reserved
 * modifiers are found even when neither binding is literally that combination. Presses that
 * produce the same set of bindings collapse into the plainest one: "Q" and "Shift + Q" firing the
 * same two bindings is one problem, not two.
 * @returns {Array<{combo: string, comboDisplay: string, signature: string, tier: "core"|"packages",
 *   ignored: boolean, actions: Array<object>}>}
 */
export function getConflictGroups() {
  const groups = [];

  for ( const [key, entries] of collectBindings() ) {
    if ( new Set(entries.map(e => e.actionId)).size < 2 ) continue;
    const seen = new Set();

    for ( const held of MODIFIER_SETS ) {
      const firing = entries.filter(entry => firesOn(entry, held));
      const actionIds = [...new Set(firing.map(e => e.actionId))];
      if ( actionIds.length < 2 ) continue;

      const identity = firing.map(e => `${e.actionId}#${e.index}`).sort().join(",");
      if ( seen.has(identity) ) continue;
      seen.add(identity);

      const combo = normalizeCombo(key, held);
      const actions = firing.sort(compareDispatch).map((entry, i) => {
        const action = { ...describe(entry), position: i + 1 };
        // Reached through a reserved modifier: say which binding it really is and what extra key
        // still triggers it, or "Descend" sitting under "Shift + Q" reads as a detection bug.
        if ( entry.bindingCombo !== combo ) {
          action.bindingDisplay = formatCombo(entry.bindingCombo);
          action.extraModifiers = held.filter(m => !entry.required.has(m)).join(" + ");
        }
        return action;
      });

      groups.push({
        combo,
        comboDisplay: formatCombo(combo),
        signature: conflictSignature(combo, actionIds),
        // Collisions with Foundry's own controls are what this module exists for; the rest are
        // where most deliberate, context-dependent overlaps between packages live.
        tier: actions.some(a => a.namespace === "core") ? "core" : "packages",
        ignored: isIgnored(combo, actionIds),
        actions
      });
    }
  }

  return groups.sort((a, b) => a.comboDisplay.localeCompare(b.comboDisplay));
}

/**
 * The conflicts nobody has accepted yet.
 * @returns {ReturnType<typeof getConflictGroups>}
 */
export function getActiveConflictGroups() {
  return getConflictGroups().filter(group => !group.ignored);
}

/**
 * Every action that responds to this exact press — what the combination search lists.
 * @param {string} combo  A combo from normalizeCombo()
 * @returns {Array<object>}
 */
export function getActionsForCombo(combo) {
  const { key, modifiers } = parseCombo(combo);
  return (collectBindings({ forConflicts: false }).get(key) ?? [])
    .filter(entry => firesOn(entry, modifiers))
    .sort(compareDispatch)
    .map(describe);
}

/**
 * The other actions a binding would collide with if an action were bound to this combo — checked
 * with the action's own reserved modifiers, so "Shift + Q" is not reported free while core's
 * Descend still fires on it.
 * @param {string} actionId
 * @param {string} combo
 * @returns {Array<object>}
 */
export function getConflictsForBinding(actionId, combo) {
  const { key, modifiers } = parseCombo(combo);
  const action = game.keybindings.actions.get(actionId);
  const candidate = {
    required: new Set(modifiers),
    allowed: new Set([...modifiers, ...(action?.reservedModifiers ?? []).map(canonicalModifier)])
  };
  return (collectBindings().get(key) ?? [])
    .filter(entry => (entry.actionId !== actionId) && overlaps(candidate, entry))
    .map(describe);
}

/**
 * Map each conflicting action to the bindings it clashes on, and who it clashes with.
 *
 * Shape: `Map<actionId, Map<bindingCombo, Array<meta & {index, editable}>>>`. Keyed by the
 * binding's *own* combo, which is what a Controls Configuration row shows — not by the press, which
 * can differ when the clash comes through a reserved modifier.
 * @returns {Map<string, Map<string, Array<object>>>}
 */
export function buildConflictMap() {
  const conflicts = new Map();

  for ( const group of getActiveConflictGroups() ) {
    for ( const entry of group.actions ) {
      if ( !conflicts.has(entry.actionId) ) conflicts.set(entry.actionId, new Map());
      const byCombo = conflicts.get(entry.actionId);
      const others = byCombo.get(entry.bindingCombo) ?? [];
      for ( const other of group.actions ) {
        if ( other.actionId === entry.actionId ) continue;
        if ( others.some(o => (o.actionId === other.actionId) && (o.index === other.index)) ) continue;
        others.push(other);
      }
      byCombo.set(entry.bindingCombo, others);
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
 * How many conflicts nobody has accepted yet.
 * @returns {number}
 */
export function countConflicts() {
  return getActiveConflictGroups().length;
}
