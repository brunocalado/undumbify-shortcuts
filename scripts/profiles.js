/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, PROFILES_PATH } from "./constants.js";
import { logError } from "./helpers.js";

/**
 * Reading and writing the module's profiles.json.
 *
 * Read is a plain static fetch of the module's own directory, which needs no permission and so
 * works for players. Write goes through FilePicker.uploadPersistent, which needs FILES_UPLOAD —
 * GM-side only by design.
 *
 * `bindings` in a profile is exactly the shape of the `core.keybindings` setting — actionId to
 * an array of editable bindings. That is deliberate: applying a profile is one settings write,
 * capturing one is one settings read, and there is nothing to keep in sync between two shapes.
 */

/** Current profiles.json format. Alpha: a mismatch means discard and rebuild, not migrate. */
const FORMAT = 1;

/* -------------------------------------------- */
/*  Read / write                                */
/* -------------------------------------------- */

/**
 * Fetch the module's stored profiles.
 * @returns {Promise<{format: number, activeProfile: string, profiles: Record<string, object>}|null>}
 *   null when there is nothing to read yet, or when it exists but could not be trusted.
 */
export async function readProfiles() {
  let data;
  try {
    data = await foundry.utils.fetchJsonWithTimeout(PROFILES_PATH, {}, { timeoutMs: 5000 });
  } catch ( error ) {
    // A 404 on a fresh install is the normal case, not an error to report. Anything else —
    // a network failure, a host that blocks the path, invalid JSON — is not: a corrupt file
    // that silently read as empty would quietly wipe a profile on the next save.
    if ( (error instanceof foundry.utils.HttpError) && (error.code === 404) ) return null;
    logError(`could not read ${PROFILES_PATH}`, error);
    if ( game.user.isGM ) {
      ui.notifications.warn("Undumbify Shortcuts: the stored profiles file could not be read. "
        + "See the console for details.");
    }
    return null;
  }

  if ( data?.format !== FORMAT ) {
    logError(`${PROFILES_PATH} is format ${data?.format ?? "unknown"}, expected ${FORMAT} — ignoring it`);
    return null;
  }
  return data;
}

/**
 * Write the module's profiles to persistent storage. GM only.
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function writeProfiles(data) {
  if ( !game.user.hasPermission("FILES_UPLOAD") ) {
    throw new Error("Only a Gamemaster (or a user with the Upload Files permission) can save control profiles.");
  }
  if ( !game.modules.get(MODULE_ID)?.persistentStorage ) {
    throw new Error("Persistent storage is not active for this module — restart the world after "
      + "installing or updating it.");
  }

  const FilePickerClass = foundry.applications.apps.FilePicker.implementation
    ?? foundry.applications.apps.FilePicker;

  // The install-time step that creates storage/ only runs when Foundry's own package manager
  // performs the install; a module copied into place by hand (as in local development) or one
  // that had persistentStorage added to its manifest after it was already installed never gets
  // that step. Without this, the very first save fails server-side with "Target directory ...
  // does not exist" and has to be retried by hand. createDirectory throws if the directory is
  // already there, which is the normal case after the first save — swallow that, not surface it.
  await FilePickerClass.createDirectory("data", `modules/${MODULE_ID}/storage`).catch(() => {});

  const file = new File([JSON.stringify(data, null, 2)], "profiles.json", { type: "application/json" });
  // uploadPersistent's second argument is the destination *directory* inside storage/, not the
  // filename — the filename always comes from the File object. Passing "profiles.json" there
  // (an earlier version of this code did) makes the server look for a storage/profiles.json/
  // subdirectory that was never meant to exist. "" means "storage/ itself".
  // notify: false — this is an internal write; the module raises its own notification instead
  // of Foundry's generic "File uploaded" toast.
  const result = await FilePickerClass.uploadPersistent(MODULE_ID, "", file, {}, { notify: false });
  if ( !result ) throw new Error("The server rejected the upload — see the console for details.");
}

/* -------------------------------------------- */
/*  Capture / apply                             */
/* -------------------------------------------- */

/**
 * Snapshot this client's current editable bindings into profile shape.
 *
 * `PROTECTED_KEYS` are filtered out here, on capture, rather than on apply: applying a profile
 * writes `core.keybindings` wholesale and bypasses `ClientKeybindings#set`'s own rejection of
 * them, so a protected key must never be allowed into a profile in the first place.
 * @returns {Record<string, Array<{key: string, modifiers: string[]}>>}
 */
export function captureBindings() {
  const raw = foundry.utils.deepClone(game.settings.get("core", "keybindings"));
  const { PROTECTED_KEYS } = foundry.helpers.interaction.KeyboardManager;
  for ( const [actionId, bindings] of Object.entries(raw) ) {
    raw[actionId] = (bindings ?? []).filter(binding => !PROTECTED_KEYS.includes(binding?.key));
  }
  return raw;
}

/**
 * Make a profile the local client's active keybinding set.
 *
 * Written as one settings assignment rather than per-action `game.keybindings.set()` calls:
 * that is a single write, and core's own `onChange` re-runs `game.keybindings.initialize()`,
 * which prunes actions that are not registered in this world — a profile carrying bindings for
 * a module this world does not have is harmless and self-pruning, so no per-action validation
 * is needed here. A restricted binding sitting in a player's map is likewise inert:
 * `KeyboardManager#testContext` refuses to fire it for a non-GM.
 * @param {{bindings?: Record<string, Array<object>>}} profile
 * @returns {Promise<void>}
 */
export async function applyProfile(profile) {
  await game.settings.set("core", "keybindings", foundry.utils.deepClone(profile.bindings ?? {}));
}

/**
 * A fresh `default` profile, seeded in memory. Never written on its own — callers write it on
 * the first real save, so a read-only visit never creates a file.
 * @returns {{format: number, activeProfile: "default", profiles: {default: object}}}
 */
export function seedProfiles() {
  return {
    format: FORMAT,
    activeProfile: "default",
    profiles: {
      default: { name: "Default", updatedAt: new Date().toISOString(), revision: 0, bindings: {} }
    }
  };
}
