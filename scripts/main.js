/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { CONTROLS_CONFIG_ID, MODULE_ID, SETTINGS, TEMPLATES } from "./constants.js";
import { ConflictViewer } from "./conflict-viewer.js";
import { enhanceControlsConfig, teardownControlsConfig } from "./controls-config.js";
import { countConflicts, getActiveConflictGroups } from "./detector.js";
import { logError } from "./helpers.js";
import { InstructionsViewer } from "./instructions-viewer.js";
import { applyProfile, readProfiles } from "./profiles.js";
import { ProfileManager } from "./profile-manager.js";
import { checkSyncOnReady, isSyncEnabled, registerSyncHooks } from "./sync.js";

Hooks.once("init", () => {
  game.settings.registerMenu(MODULE_ID, SETTINGS.instructions, {
    name: "Instructions",
    label: "How to Use",
    hint: "Conflict detection, combination search, and inline rebinding, explained.",
    icon: "fa-solid fa-book-open",
    type: InstructionsViewer,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.conflictOverview, {
    name: "Conflict Overview",
    label: "Open Conflict Overview",
    hint: "Every keybinding conflict, grouped by combination, with a button to resolve it.",
    icon: "fa-solid fa-triangle-exclamation",
    type: ConflictViewer,
    restricted: false
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.profileManager, {
    name: "Control Profiles",
    label: "Manage Profiles",
    hint: "Save, activate, and load complete keybinding profiles stored in this module's own folder.",
    icon: "fa-solid fa-sliders",
    type: ProfileManager,
    restricted: true
  });

  game.settings.register(MODULE_ID, SETTINGS.contextNoteDismissed, {
    scope: "client",
    config: false,
    type: Boolean,
    default: false
  });

  // World-scoped, not client: every connected user needs to see the same on/off state, and the
  // GM's live bindings need one shared place to publish to. Document-level permissions already
  // restrict writes to a GM (see scripts/sync.js); this is a belt the module leans on rather
  // than a UI decision to re-derive.
  game.settings.register(MODULE_ID, SETTINGS.syncEnabled, {
    scope: "world",
    config: false,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.gmBindings, {
    scope: "world",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, SETTINGS.autoApplyProfile, {
    name: "Auto-Apply Control Profile",
    hint: "When enabled, the active control profile from this module's storage is applied "
      + "automatically each time you connect — this overwrites any keybinding changes you made "
      + "locally. Turn it off to keep full control of your own bindings.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.appliedRevision, {
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.autoAlertConflicts, {
    name: "Alert on New Conflicts",
    hint: "When enabled, a keybinding conflict that was not there last time is flagged as soon as "
      + "the world starts — the GM gets the Conflict Overview, a player gets a notification for "
      + "conflicts the GM's fixes cannot reach. Conflicts already flagged once, or marked by the GM "
      + "as able to coexist, stay quiet.",
    scope: "client",
    config: true,
    type: Boolean,
    default: true
  });

  // World-scoped so one decision by the GM quiets the same conflict on every client. Stored as an
  // array rather than an object keyed by signature, since action ids carry dots.
  game.settings.register(MODULE_ID, SETTINGS.ignoredConflicts, {
    scope: "world",
    config: false,
    type: Array,
    default: [],
    onChange: () => {
      foundry.applications.instances.get(`${MODULE_ID}-conflict-viewer`)?.render();
      foundry.applications.instances.get(CONTROLS_CONFIG_ID)?.render();
    }
  });

  game.settings.register(MODULE_ID, SETTINGS.seenConflicts, {
    scope: "client",
    config: false,
    type: Array,
    default: []
  });

  registerSyncHooks();

  // Preload only; HandlebarsApplicationMixin would fetch these on first render anyway.
  void foundry.applications.handlebars.loadTemplates(Object.values(TEMPLATES));
});

/* -------------------------------------------- */
/*  Ready — profile auto-apply, then sync       */
/* -------------------------------------------- */

Hooks.once("ready", async () => {
  await applyActiveProfileIfNeeded();
  // Runs after the profile step, not before: on the GM's own client this is what the sync
  // mirror gets published from, so it needs to see the *final* post-profile state.
  await checkSyncOnReady();

  // Evaluated last so it reflects whatever the two steps above just changed, not the state from
  // before this session started.
  await alertNewConflicts();
});

/**
 * Apply this client's active stored profile, if the setting for it is on and it has not already
 * been applied at its current revision.
 * @returns {Promise<void>}
 */
async function applyActiveProfileIfNeeded() {
  if ( !game.settings.get(MODULE_ID, SETTINGS.autoApplyProfile) ) return;

  const data = await readProfiles();
  const profile = data?.profiles?.[data.activeProfile];
  if ( !profile ) return;

  // Applied once per revision per client, not on every reload — this is what keeps auto-apply
  // from stomping a player who deliberately rebound something between one reload and the next.
  const stamp = `${data.activeProfile}:${profile.revision ?? 0}`;
  if ( game.settings.get(MODULE_ID, SETTINGS.appliedRevision) === stamp ) return;

  try {
    await applyProfile(profile);
    await game.settings.set(MODULE_ID, SETTINGS.appliedRevision, stamp);
    ui.notifications.info(`Undumbify Shortcuts: applied the "${profile.name}" control profile.`);
  } catch ( error ) {
    logError("could not auto-apply the active control profile", error);
  }
}

/**
 * Flag conflicts this client has not been told about before.
 *
 * Only new ones: a conflict seen at the last world start, or one the GM marked as able to coexist,
 * does not reopen anything — re-announcing the same accepted overlap every session is what made
 * the alert noise. The GM gets the full Conflict Overview, since resolving is theirs to do and
 * Sync carries it to everyone. A player only hears about what the GM's fixes cannot reach.
 * @returns {Promise<void>}
 */
async function alertNewConflicts() {
  if ( !game.settings.get(MODULE_ID, SETTINGS.autoAlertConflicts) ) return;

  const signatures = getActiveConflictGroups().filter(concernsThisClient).map(group => group.signature);
  const seen = new Set(game.settings.get(MODULE_ID, SETTINGS.seenConflicts));
  const fresh = signatures.filter(signature => !seen.has(signature));
  // Replaced, not appended: a conflict resolved since is dropped, so if it ever returns it is new.
  if ( (seen.size !== signatures.length) || fresh.length ) {
    await game.settings.set(MODULE_ID, SETTINGS.seenConflicts, signatures);
  }
  if ( !fresh.length ) return;

  if ( game.user.isGM ) new ConflictViewer().render({ force: true });
  else ui.notifications.warn(`Undumbify Shortcuts: ${fresh.length} new keybinding conflict`
    + `${fresh.length === 1 ? "" : "s"} in your controls. Open Controls Configuration to review.`);
}

/**
 * Whether resolving this conflict is up to this client.
 *
 * Always for the GM. For a player, only when Sync is off — the GM's fixes stay on the GM's client —
 * or when one of the actions involved carries a binding the player set themselves rather than one
 * mirrored from the GM.
 * @param {{actions: Array<{actionId: string}>}} group
 * @returns {boolean}
 */
function concernsThisClient(group) {
  if ( game.user.isGM || !isSyncEnabled() ) return true;
  const own = game.settings.get("core", "keybindings");
  const mirror = game.settings.get(MODULE_ID, SETTINGS.gmBindings);
  return group.actions.some(({ actionId }) =>
    (actionId in own) && !foundry.utils.equals(own[actionId], mirror[actionId]));
}

/* -------------------------------------------- */
/*  Controls Configuration                      */
/* -------------------------------------------- */

Hooks.on("renderControlsConfig", (app, element, _context, options) => {
  try {
    enhanceControlsConfig(app, element, options?.parts ?? []);
  } catch ( error ) {
    logError("could not enhance the Controls Configuration window", error);
  }
  foundry.applications.instances.get(`${MODULE_ID}-conflict-viewer`)?.render();
});

Hooks.on("closeControlsConfig", () => teardownControlsConfig());

Hooks.on("getHeaderControlsControlsConfig", (_app, controls) => {
  const count = countConflicts();
  controls.unshift({
    icon: count ? "fa-solid fa-triangle-exclamation" : "fa-solid fa-circle-check",
    label: count ? `Conflicts (${count})` : "No Conflicts",
    onClick: () => new ConflictViewer().render({ force: true })
  });
});
