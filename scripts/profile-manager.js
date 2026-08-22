/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, TEMPLATES } from "./constants.js";
import { logError, refreshControlsConfig } from "./helpers.js";
import { applyProfile, captureBindings, readProfiles, seedProfiles, writeProfiles } from "./profiles.js";
import { isSyncEnabled } from "./sync.js";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * GM-only CRUD over the module's persistent `profiles.json`.
 *
 * Loads the document once and keeps it in memory across re-renders; every mutation writes it
 * back immediately, so what is on screen and what is on disk never drift for longer than one
 * action.
 *
 * There is deliberately no "push to everyone" action here. Activating a profile applies it to
 * this client's own `core.keybindings`, and that write is exactly what `scripts/sync.js`
 * listens for — if the Sync toggle in the Conflict Overview is on, activating already reaches
 * every connected client on its own; if it is off, it stays local. One switch decides the
 * question for every profile action, instead of each one asking separately.
 */
export class ProfileManager extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-profile-manager`,
    classes: [MODULE_ID, "profile-manager"],
    window: {
      title: "Control Profiles",
      icon: "fa-solid fa-sliders",
      resizable: false
    },
    position: { width: 620, height: 560 },
    actions: {
      create: ProfileManager.#onCreate,
      activate: ProfileManager.#onActivate,
      save: ProfileManager.#onSave,
      load: ProfileManager.#onLoad,
      delete: ProfileManager.#onDelete,
      exportFile: ProfileManager.#onExportFile,
      importFile: ProfileManager.#onImportFile
    }
  };

  /** @override */
  static PARTS = {
    body: {
      template: TEMPLATES.profileManager,
      scrollable: [".profiles"]
    }
  };

  /**
   * The profiles document, loaded once and mutated in place. Never written on open — a
   * read-only visit to this window must not create a file.
   * @type {{format: number, activeProfile: string, profiles: Record<string, object>}|null}
   */
  #data = null;

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    this.#data ??= await readProfiles() ?? seedProfiles();

    const profileList = Object.entries(this.#data.profiles).map(([id, profile]) => ({
      id,
      name: profile.name,
      active: id === this.#data.activeProfile,
      isDefault: id === "default",
      bindingCount: Object.values(profile.bindings ?? {}).reduce((n, list) => n + (list?.length ?? 0), 0),
      updatedAtDisplay: profile.updatedAt ? new Date(profile.updatedAt).toLocaleString() : "—"
    })).sort((a, b) => (a.isDefault ? -1 : b.isDefault ? 1 : a.name.localeCompare(b.name)));

    return {
      ...await super._prepareContext(options),
      profileList,
      syncEnabled: isSyncEnabled(),
      persistentStorage: game.modules.get(MODULE_ID)?.persistentStorage ?? false
    };
  }

  /* -------------------------------------------- */
  /*  Persistence                                 */
  /* -------------------------------------------- */

  /**
   * Write the in-memory document and surface any failure to the GM — a hosted server that
   * forbids writes into package directories needs its actual error text, not a generic one.
   * @returns {Promise<boolean>} Whether the write succeeded.
   */
  async #save() {
    try {
      await writeProfiles(this.#data);
      return true;
    } catch ( error ) {
      logError("could not save profiles.json", error);
      ui.notifications.error(`Undumbify Shortcuts: could not save the profile — ${error.message}`);
      return false;
    }
  }

  /**
   * A slug that does not collide with an existing profile id.
   * @param {string} name
   * @returns {string}
   */
  #uniqueId(name) {
    const base = name.slugify({ strict: true }) || "profile";
    let id = base;
    let n = 2;
    while ( id in this.#data.profiles ) id = `${base}-${n++}`;
    return id;
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Snapshot this client's current controls as a brand-new profile.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static async #onCreate() {
    const result = await DialogV2.input({
      window: { title: "New Profile" },
      content: `<div class="form-group">
        <label>Name</label>
        <input type="text" name="name" required autofocus placeholder="e.g. House Rules">
      </div>`
    });
    const name = result?.name?.trim();
    if ( !name ) return;

    const id = this.#uniqueId(name);
    this.#data.profiles[id] = {
      name, updatedAt: new Date().toISOString(), revision: 0, bindings: captureBindings()
    };
    if ( await this.#save() ) this.render();
  }

  /**
   * Make a profile the world's active one and apply it to this client right now. Whether that
   * also reaches every other connected client depends entirely on the Sync toggle — the confirm
   * says so plainly rather than asking the question itself.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static async #onActivate(event, target) {
    const id = target.closest(".profile").dataset.profileId;
    const profile = this.#data.profiles[id];
    if ( !profile || (id === this.#data.activeProfile) ) return;

    const syncing = isSyncEnabled();
    const proceed = await DialogV2.confirm({
      window: { title: "Activate Profile" },
      content: `<p>Activate <strong>${foundry.utils.escapeHTML(profile.name)}</strong>? `
        + `This applies it to your own controls right now`
        + (syncing
          ? ` — and, since <strong>Sync</strong> is on in the Conflict Overview, to every other `
            + `connected user automatically.</p>`
          : `. <strong>Sync</strong> is off, so other connected users keep their own controls `
            + `until you turn it on.</p>`),
      yes: { label: "Activate", icon: "fa-solid fa-check" }
    });
    if ( !proceed ) return;

    this.#data.activeProfile = id;
    await applyProfile(profile);
    await refreshControlsConfig();
    if ( await this.#save() ) this.render();
    ui.notifications.info(`Undumbify Shortcuts: activated the "${profile.name}" control profile.`);
  }

  /**
   * Overwrite a stored profile with this client's current controls.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static async #onSave(event, target) {
    const id = target.closest(".profile").dataset.profileId;
    const profile = this.#data.profiles[id];
    if ( !profile ) return;

    const proceed = await DialogV2.confirm({
      window: { title: "Save Profile" },
      content: `<p>Replace the bindings stored in <strong>${foundry.utils.escapeHTML(profile.name)}</strong> `
        + `with this client's current controls?</p>`,
      yes: { label: "Save", icon: "fa-solid fa-floppy-disk" }
    });
    if ( !proceed ) return;

    profile.bindings = captureBindings();
    profile.updatedAt = new Date().toISOString();
    profile.revision = (profile.revision ?? 0) + 1;
    if ( await this.#save() ) this.render();
  }

  /**
   * Apply one profile to this client only — a preview, distinct from Activate: it does not
   * change which profile is the world's official one, and does not propagate even if Sync is on
   * (Sync mirrors the GM's *active-profile-driven* state, not an ad hoc local experiment).
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static async #onLoad(event, target) {
    const id = target.closest(".profile").dataset.profileId;
    const profile = this.#data.profiles[id];
    if ( !profile ) return;

    await applyProfile(profile);
    await refreshControlsConfig();
    ui.notifications.info(`Undumbify Shortcuts: loaded the "${profile.name}" control profile onto this client.`);
  }

  /**
   * Delete a stored profile. `default` can never be removed — the manager always seeds one.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static async #onDelete(event, target) {
    const id = target.closest(".profile").dataset.profileId;
    if ( (id === "default") || !(id in this.#data.profiles) ) return;

    const profile = this.#data.profiles[id];
    const proceed = await DialogV2.confirm({
      window: { title: "Delete Profile" },
      content: `<p>Delete <strong>${foundry.utils.escapeHTML(profile.name)}</strong>? This cannot be undone.</p>`,
      yes: { label: "Delete", icon: "fa-solid fa-trash" }
    });
    if ( !proceed ) return;

    delete this.#data.profiles[id];
    if ( this.#data.activeProfile === id ) this.#data.activeProfile = "default";
    if ( await this.#save() ) this.render();
  }

  /**
   * Download the whole profiles document as a JSON file.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static #onExportFile() {
    foundry.utils.saveDataToFile(JSON.stringify(this.#data, null, 2), "application/json",
      "undumbify-profiles.json");
  }

  /**
   * Merge profiles from an imported JSON file into the stored document. Matching ids are
   * overwritten; the current `activeProfile` selection is left alone.
   * @this {ProfileManager}
   * @type {ApplicationClickAction}
   */
  static #onImportFile() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "application/json";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if ( !file ) return;
      try {
        const parsed = JSON.parse(await foundry.utils.readTextFromFile(file));
        if ( !parsed?.profiles || (typeof parsed.profiles !== "object") ) {
          throw new Error("the file does not contain a profiles document");
        }
        Object.assign(this.#data.profiles, parsed.profiles);
      } catch ( error ) {
        logError("could not import profiles", error);
        ui.notifications.error(`Undumbify Shortcuts: could not import that file — ${error.message}`);
        return;
      }
      if ( await this.#save() ) this.render();
    });
    input.click();
  }
}
