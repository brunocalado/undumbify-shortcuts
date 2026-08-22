/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { CATEGORY_TAB_GROUP, CONTROLS_CONFIG_ID, MODULE_ID } from "./constants.js";

const { ControlsConfig } = foundry.applications.sidebar.apps;
const { KeyboardManager } = foundry.helpers.interaction;

/**
 * Modifiers in the order Foundry's own binding input pushes them.
 * ControlsConfig.humanizeBinding() unshifts each modifier onto the front of the
 * label, so feeding it this order reproduces the native "Control + Shift + Alt + K"
 * reading exactly. Using it as the canonical order also makes normalizeCombo()
 * deterministic regardless of how a binding happened to be stored.
 * @type {readonly string[]}
 */
const MODIFIER_ORDER = Object.freeze([
  KeyboardManager.MODIFIER_KEYS.ALT,
  KeyboardManager.MODIFIER_KEYS.SHIFT,
  KeyboardManager.MODIFIER_KEYS.CONTROL
]);

/* -------------------------------------------- */
/*  Key combinations                            */
/* -------------------------------------------- */

/**
 * Coerce a modifier to its canonical value ("Control" / "Shift" / "Alt").
 * Mirrors ClientKeybindings' own validation, which accepts either the enum key
 * ("CONTROL") or its value ("Control").
 * @param {string} modifier
 * @returns {string}
 */
function canonicalModifier(modifier) {
  return KeyboardManager.MODIFIER_KEYS[modifier] ?? modifier;
}

/**
 * Reduce a key plus its modifiers to a single string safe to compare and to use
 * as a Map key. Modifier order and spelling are normalised, so two bindings that
 * mean the same thing always produce the same combo.
 * @param {string} key                The KeyboardEvent#code of the bound key
 * @param {string[]} [modifiers=[]]   Modifiers held alongside it
 * @returns {string}                  e.g. "Shift+Control+KeyC"
 */
export function normalizeCombo(key, modifiers = []) {
  const held = new Set(modifiers.map(canonicalModifier));
  return [...MODIFIER_ORDER.filter(m => held.has(m)), key].join("+");
}

/**
 * Split a normalized combo back into the binding shape Foundry works with.
 * @param {string} combo
 * @returns {{key: string, modifiers: string[]}}
 */
export function parseCombo(combo) {
  const parts = combo.split("+");
  return { key: parts.at(-1), modifiers: parts.slice(0, -1) };
}

/**
 * Render a combo the way Foundry labels it in the Controls Configuration list.
 * @param {string} combo
 * @returns {string}  e.g. "Shift + C"
 */
export function formatCombo(combo) {
  return ControlsConfig.humanizeBinding(parseCombo(combo));
}

/**
 * Build a binding from a keydown event, matching how Foundry's own binding input
 * does it: a modifier held down is only recorded as a modifier, never as the key.
 * @param {KeyboardEvent} event
 * @returns {{key: string, logicalKey: string, modifiers: string[]}|null}
 *   null when the event carries nothing but modifier keys.
 */
export function bindingFromEvent(event) {
  const { MODIFIER_KEYS, MODIFIER_CODES } = KeyboardManager;
  const context = KeyboardManager.getKeyboardEventContext(event);

  // A bare modifier press is the user still assembling the combo, not a key to bind.
  if ( Object.values(MODIFIER_CODES).some(codes => codes.includes(context.key)) ) return null;

  const held = {
    [MODIFIER_KEYS.ALT]: context.isAlt,
    [MODIFIER_KEYS.SHIFT]: context.isShift,
    [MODIFIER_KEYS.CONTROL]: context.isControl
  };
  return {
    key: context.key,
    logicalKey: context.logicalKey,
    modifiers: MODIFIER_ORDER.filter(modifier => held[modifier])
  };
}

/* -------------------------------------------- */
/*  Keybinding actions                          */
/* -------------------------------------------- */

/**
 * Describe an action for display: what it is called and who registered it.
 *
 * `categoryId` is the sidebar tab the action lives under, which is not always its
 * namespace — ControlsConfig files the active system under a literal "system" tab
 * and anything it cannot place under "unmapped".
 * @param {string} actionId  A fully-qualified action id ("namespace.action")
 * @returns {{actionId: string, label: string, namespace: string, packageTitle: string,
 *   categoryId: string}}
 */
export function getActionMeta(actionId) {
  const action = game.keybindings.actions.get(actionId);
  const namespace = action?.namespace ?? actionId.split(".")[0];

  let packageTitle = namespace;
  let categoryId = namespace;
  if ( namespace === "core" ) {
    packageTitle = game.i18n.localize("KEYBINDINGS.CoreKeybindings");
  } else if ( namespace === game.system.id ) {
    packageTitle = game.system.title;
    categoryId = "system";
  } else {
    const module = game.modules.get(namespace);
    packageTitle = module?.title ?? game.i18n.localize("PACKAGECONFIG.Unmapped");
    categoryId = module?.id ?? "unmapped";
  }

  return { actionId, label: localizeActionName(action?.name ?? actionId), namespace, packageTitle,
    categoryId };
}

/**
 * Localize an action's registered name. Modules may register either an i18n key
 * or an already-human string, so only dotted keys are passed through i18n.
 * @param {string} name
 * @returns {string}
 */
function localizeActionName(name) {
  return name.includes(".") ? game.i18n.localize(name) : name;
}

/**
 * Whether a binding is locked by the package that registered it.
 * Compared by identity, which is how Foundry itself distinguishes them.
 * @param {string} actionId
 * @param {KeybindingActionBinding} binding
 * @returns {boolean}
 */
export function isUneditable(actionId, binding) {
  return game.keybindings.actions.get(actionId)?.uneditable?.includes(binding) ?? false;
}

/**
 * Replace one binding of an action by its index and persist the result.
 *
 * Rebuilds the editable binding list the same way ControlsConfig does when it
 * saves pending edits: keep every editable binding at its original index, drop
 * the uneditable ones, apply the change, then compact away empty slots.
 * @param {string} actionId
 * @param {number} index                        Index within game.keybindings.bindings
 * @param {KeybindingActionBinding|null} binding The replacement, or null to delete
 * @returns {Promise<void>}
 */
export async function replaceBinding(actionId, index, binding) {
  const [namespace, ...rest] = actionId.split(".");
  const current = game.keybindings.bindings.get(actionId) ?? [];

  const toSet = [];
  for ( const [i, existing] of current.entries() ) {
    if ( isUneditable(actionId, existing) ) continue;
    toSet[i] = { key: existing.key, modifiers: existing.modifiers };
  }
  // Only key and modifiers are persisted; logicalKey is a display aid Foundry
  // recomputes from the event, and core drops it when saving too.
  toSet[index] = binding ? { key: binding.key, modifiers: binding.modifiers } : undefined;

  await game.keybindings.set(namespace, rest.join("."), toSet.filter(b => b?.key));
}

/* -------------------------------------------- */
/*  Controls Configuration                      */
/* -------------------------------------------- */

/**
 * Force Controls Configuration to redraw with truthful data.
 *
 * ControlsConfig caches its category data privately (`#cachedData`) and only invalidates it on
 * its own save path, so a plain `app.render()` after a write this module makes redraws stale
 * rows — the registry has moved but the native `kbd` label and ⚠ icon have not. Rebuilding the
 * instance is the only public way to force `_prepareCategoryData()` to run again.
 * @returns {Promise<void>}
 */
export async function refreshControlsConfig() {
  const app = foundry.applications.instances.get(CONTROLS_CONFIG_ID);
  if ( !app ) return;
  const tab = app.tabGroups?.[CATEGORY_TAB_GROUP];
  await app.close();
  await new foundry.applications.sidebar.apps.ControlsConfig()
    .render({ force: true, tab: { [CATEGORY_TAB_GROUP]: tab } });
}

/**
 * Switch Controls Configuration to an action's category, then scroll to it and flash it.
 * Assumes the window is already open — callers that cannot assume that (the conflict viewer,
 * which may be the only window up) open/focus it first.
 * @param {string} actionId
 */
export function goToAction(actionId) {
  const app = foundry.applications.instances.get(CONTROLS_CONFIG_ID);
  if ( !app ) return;
  const element = app.element;
  const { categoryId } = getActionMeta(actionId);

  // A live text filter can be hiding the row we are about to scroll to.
  const search = element.querySelector("input[type='search']");
  if ( search?.value ) {
    search.value = "";
    search.dispatchEvent(new Event("input", { bubbles: true }));
  }

  try {
    app.changeTab(categoryId, CATEGORY_TAB_GROUP);
  } catch ( error ) {
    logError(`could not open the "${categoryId}" category`, error);
    return;
  }

  requestAnimationFrame(() => {
    const group = element.querySelector(`.form-group[data-action-id="${CSS.escape(actionId)}"]`);
    if ( !group ) return;
    group.scrollIntoView({ behavior: "smooth", block: "center" });
    group.classList.remove("us-flash");
    // Restart the animation even when the same row is targeted twice in a row.
    void group.offsetWidth;
    group.classList.add("us-flash");
    group.addEventListener("animationend", () => group.classList.remove("us-flash"), { once: true });
  });
}

/* -------------------------------------------- */
/*  Misc                                        */
/* -------------------------------------------- */

/**
 * Report a module error to the console with a consistent prefix.
 * @param {string} message
 * @param {unknown} [error]
 */
export function logError(message, error) {
  console.error(`${MODULE_ID} | ${message}`, error ?? "");
}
