/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTINGS } from "./constants.js";
import { logError, refreshControlsConfig } from "./helpers.js";
import { captureBindings } from "./profiles.js";

/**
 * Continuous keybinding sync: while enabled, every connected client mirrors whichever bindings
 * the GM has explicitly customized, live, with no button to click.
 *
 * The mechanism is a single world-scoped setting (`SETTINGS.gmBindings`), not a query fan-out:
 * a world setting change already reaches every connected client through Foundry's own Setting
 * document sync (`updateSetting`), for free, with no timeout or offline handling to write. The
 * GM's own client publishes to it whenever its *own* `core.keybindings` changes — through this
 * module's controls, through Foundry's native binding editor, or through anything else — because
 * `clientSettingChanged` fires for every write to a client-scoped setting regardless of what
 * triggered it, so there is nowhere a GM edit can happen that this misses.
 *
 * The merge is per action, not a wholesale replace: only actionIds present in the GM's mirror
 * are written into a receiving client's own bindings. An action the GM has never customized is
 * not a key in that map at all, so a player's own binding for it is left completely alone —
 * that is what lets "the player has a shortcut the GM doesn't have, and vice versa" hold at the
 * same time as "everyone mirrors the GM".
 */

const MIRROR_KEY = `${MODULE_ID}.${SETTINGS.gmBindings}`;
const TOGGLE_KEY = `${MODULE_ID}.${SETTINGS.syncEnabled}`;

/**
 * Register the hooks that drive sync for the rest of the session. Called once, during `init`.
 */
export function registerSyncHooks() {
  Hooks.on("clientSettingChanged", (key) => {
    if ( key === "core.keybindings" ) void publishMirror();
  });

  Hooks.on("updateSetting", (setting) => {
    if ( setting.key === MIRROR_KEY ) {
      void applyMirror();
    } else if ( setting.key === TOGGLE_KEY ) {
      foundry.applications.instances.get(`${MODULE_ID}-conflict-viewer`)?.render();
      // Turning sync on should start propagating immediately, not wait for the GM's next edit.
      if ( isSyncEnabled() ) void (game.user.isGM ? publishMirror() : applyMirror());
    }
  });
}

/**
 * Run once at `ready`: the GM refreshes the mirror from its current state and everyone else
 * merges against whatever is already stored. Covers two cases the live hooks alone would miss —
 * joining a session where nothing changes hands again afterward, and joining after the GM was
 * last online (the mirror persists in the world, so it does not need the GM connected right now).
 */
export async function checkSyncOnReady() {
  if ( !game.ready ) return;
  if ( game.user.isGM ) await publishMirror();
  else await applyMirror();
}

/**
 * Whether sync is currently turned on for this world.
 * @returns {boolean}
 */
export function isSyncEnabled() {
  return game.settings.get(MODULE_ID, SETTINGS.syncEnabled);
}

/* -------------------------------------------- */
/*  GM side — publish                           */
/* -------------------------------------------- */

/**
 * Write this client's current bindings into the world mirror, if sync is on and this client is
 * the one whose state is meant to be published.
 */
async function publishMirror() {
  // A world-scoped write throws before the game is ready; clientSettingChanged should not
  // realistically fire that early, but the hook is cheap insurance against an uncaught error.
  if ( !game.ready || !game.user.isGM || !isSyncEnabled() ) return;

  const snapshot = captureBindings();
  const current = game.settings.get(MODULE_ID, SETTINGS.gmBindings);
  if ( foundry.utils.equals(current, snapshot) ) return;

  try {
    await game.settings.set(MODULE_ID, SETTINGS.gmBindings, snapshot);
  } catch ( error ) {
    logError("could not publish the sync mirror", error);
  }
}

/* -------------------------------------------- */
/*  Everyone else — apply                       */
/* -------------------------------------------- */

/**
 * Merge the world mirror into this client's own bindings, if sync is on and something in the
 * mirror actually differs from what this client already has applied.
 */
async function applyMirror() {
  if ( !game.ready || game.user.isGM || !isSyncEnabled() ) return;

  const gmBindings = game.settings.get(MODULE_ID, SETTINGS.gmBindings);
  if ( foundry.utils.isEmpty(gmBindings) ) return;

  const local = foundry.utils.deepClone(game.settings.get("core", "keybindings"));
  let changed = false;
  for ( const [actionId, bindings] of Object.entries(gmBindings) ) {
    if ( foundry.utils.equals(local[actionId] ?? [], bindings) ) continue;
    local[actionId] = foundry.utils.deepClone(bindings);
    changed = true;
  }
  if ( !changed ) return;

  try {
    await game.settings.set("core", "keybindings", local);
    await refreshControlsConfig();
    foundry.applications.instances.get(`${MODULE_ID}-conflict-viewer`)?.render();
    ui.notifications.info("Undumbify Shortcuts: your controls were synced with the GM's.");
  } catch ( error ) {
    logError("could not apply the sync mirror", error);
  }
}
