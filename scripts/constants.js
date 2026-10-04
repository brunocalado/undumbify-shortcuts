/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

/**
 * Module-wide constants.
 *
 * This file imports nothing from the rest of the module, so it stays a
 * dependency-free leaf that anything can import without circular-import risk.
 */

/** The module id, matching the `id` field in module.json. */
export const MODULE_ID = "undumbify-shortcuts";

/**
 * The `id` of Foundry's own ControlsConfig application.
 * Used both to recognise its render hook and to look the instance up in
 * `foundry.applications.instances`.
 */
export const CONTROLS_CONFIG_ID = "controls-config";

/** The tab group ControlsConfig uses for its category sidebar. */
export const CATEGORY_TAB_GROUP = "categories";

/** Setting and settings-menu keys. */
export const SETTINGS = {
  instructions: "instructions",
  conflictOverview: "conflictOverview",
  profileManager: "profileManager",
  contextNoteDismissed: "contextNoteDismissed",
  autoApplyProfile: "autoApplyProfile",
  appliedRevision: "appliedRevision",
  /** World-scoped: whether every connected client mirrors the GM's keybindings live. */
  syncEnabled: "syncEnabled",
  /** World-scoped: the GM's current bindings, as last published by scripts/sync.js. */
  gmBindings: "gmBindings",
  /** Client-scoped: whether this client is told about new conflicts at world start. */
  autoAlertConflicts: "autoAlertConflicts",
  /** World-scoped: conflicts the GM marked as able to coexist, as `{combo, actionIds}`. */
  ignoredConflicts: "ignoredConflicts",
  /** Client-scoped: signatures of the conflicts this client was last told about, so the next
   *  world start only speaks up for new ones. */
  seenConflicts: "seenConflicts"
};

/** Handlebars templates shipped by this module. */
export const TEMPLATES = {
  conflictViewer: `modules/${MODULE_ID}/templates/conflict-viewer.hbs`,
  instructions: `modules/${MODULE_ID}/templates/instructions-viewer.hbs`,
  profileManager: `modules/${MODULE_ID}/templates/profile-manager.hbs`
};

/** The markdown document rendered by the instructions viewer. */
export const INSTRUCTIONS_PATH = `modules/${MODULE_ID}/docs/INSTRUCTIONS.md`;

/** Where the module's persistent profile store lives, relative to the module root. */
export const PROFILES_PATH = `modules/${MODULE_ID}/storage/profiles.json`;
