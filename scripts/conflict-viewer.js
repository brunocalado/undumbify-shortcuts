/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { CONTROLS_CONFIG_ID, MODULE_ID, SETTINGS, TEMPLATES } from "./constants.js";
import { getConflictGroups } from "./detector.js";
import { goToAction, refreshControlsConfig } from "./helpers.js";
import { startInlineEdit } from "./inline-edit.js";
import { applyBindingOps, planKeepOnly } from "./resolver.js";

const { ApplicationV2, DialogV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * A standalone window listing every contested key combination, who is competing for it, and a
 * button that resolves the conflict right there. Reachable from module settings, from the
 * sidebar badge inside Controls Configuration, and from that window's header controls.
 */
export class ConflictViewer extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-conflict-viewer`,
    classes: [MODULE_ID, "conflict-viewer"],
    window: {
      title: "Keybinding Conflicts",
      icon: "fa-solid fa-triangle-exclamation",
      resizable: true
    },
    position: { width: 760, height: 600 },
    actions: {
      openControls: ConflictViewer.#onOpenControls,
      gotoClaim: ConflictViewer.#onGotoClaim,
      keepThis: ConflictViewer.#onKeepThis,
      clearClaim: ConflictViewer.#onClearClaim,
      rebindClaim: ConflictViewer.#onRebindClaim
    }
  };

  /** @override */
  static PARTS = {
    body: {
      template: TEMPLATES.conflictViewer,
      scrollable: [".conflicts"]
    }
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const groups = getConflictGroups();
    return {
      ...await super._prepareContext(options),
      groups,
      count: groups.length,
      canSync: game.user.isGM,
      syncEnabled: game.settings.get(MODULE_ID, SETTINGS.syncEnabled)
    };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _onRender(context, options) {
    await super._onRender(context, options);
    this.element.querySelector("input[name='sync']")?.addEventListener("change", async event => {
      await game.settings.set(MODULE_ID, SETTINGS.syncEnabled, event.currentTarget.checked);
    });
  }

  /* -------------------------------------------- */
  /*  Resolution                                  */
  /* -------------------------------------------- */

  /**
   * Turn ops into writes and redraw. Purely local — when sync is on, this alone is enough to
   * reach every connected client: writing the GM's own `core.keybindings` is exactly what
   * `scripts/sync.js` listens for, and it takes it from there.
   * @param {import("./resolver.js").BindingOp[]} ops
   */
  async #resolve(ops) {
    if ( ops.length ) {
      await applyBindingOps(ops);
      await refreshControlsConfig();
    }
    this.render();
  }

  /* -------------------------------------------- */
  /*  Actions                                     */
  /* -------------------------------------------- */

  /**
   * Bring Controls Configuration forward, opening it if it is not already up.
   * @this {ConflictViewer}
   * @type {ApplicationClickAction}
   */
  static #onOpenControls() {
    const existing = foundry.applications.instances.get(CONTROLS_CONFIG_ID);
    if ( existing ) return void existing.render({ force: true });
    new foundry.applications.sidebar.apps.ControlsConfig().render({ force: true });
  }

  /**
   * Open/focus Controls Configuration, then jump to the claimed action.
   * @this {ConflictViewer}
   * @type {ApplicationClickAction}
   */
  static async #onGotoClaim(event, target) {
    const { actionId } = target.closest(".claim").dataset;
    const existing = foundry.applications.instances.get(CONTROLS_CONFIG_ID);
    const app = existing ?? new foundry.applications.sidebar.apps.ControlsConfig();
    await app.render({ force: true });
    goToAction(actionId);
  }

  /**
   * The headline feature: keep one claim on a combination and clear every other editable one.
   * @this {ConflictViewer}
   * @type {ApplicationClickAction}
   */
  static async #onKeepThis(event, target) {
    const claim = target.closest(".claim");
    const group = target.closest(".conflict-group");
    const keepActionId = claim.dataset.actionId;
    const keepIndex = Number(claim.dataset.index);

    const groupData = getConflictGroups().find(g => g.combo === group.dataset.combo);
    const keepAction = groupData?.actions.find(a => (a.actionId === keepActionId) && (a.index === keepIndex));
    if ( !keepAction ) return;   // already resolved elsewhere since this render

    const { ops, locked } = planKeepOnly(groupData, keepActionId, keepIndex);

    const removedNames = ops
      .map(op => groupData.actions.find(a => a.actionId === op.actionId))
      .filter(Boolean)
      .map(a => `<strong>${foundry.utils.escapeHTML(a.label)}</strong> `
        + `(${foundry.utils.escapeHTML(a.packageTitle)})`);

    const content = [`<p>Keep <strong>${foundry.utils.escapeHTML(keepAction.label)}</strong> `
      + `(${foundry.utils.escapeHTML(keepAction.packageTitle)}) on `
      + `<strong>${foundry.utils.escapeHTML(groupData.comboDisplay)}</strong>?</p>`];
    if ( removedNames.length ) {
      content.push(`<p>This removes the binding from: `
        + `${game.i18n.getListFormatter().format(removedNames)}.</p>`);
    }
    for ( const lockedAction of locked ) {
      content.push(`<p><strong>${foundry.utils.escapeHTML(lockedAction.label)}</strong>'s binding is `
        + `locked by its package and will keep the combination.</p>`);
    }

    const proceed = await DialogV2.confirm({
      window: { title: "Keep This Binding" },
      content: content.join(""),
      yes: { label: "Keep This One", icon: "fa-solid fa-crown" }
    });
    if ( !proceed ) return;

    await this.#resolve(ops);
  }

  /**
   * Remove just one claim from a combination, leaving the rest untouched.
   * @this {ConflictViewer}
   * @type {ApplicationClickAction}
   */
  static async #onClearClaim(event, target) {
    const claim = target.closest(".claim");
    const group = target.closest(".conflict-group");
    const actionId = claim.dataset.actionId;
    const index = Number(claim.dataset.index);
    const combo = group.dataset.combo;

    const groupData = getConflictGroups().find(g => g.combo === combo);
    const action = groupData?.actions.find(a => (a.actionId === actionId) && (a.index === index));
    if ( !action ) return;

    const proceed = await DialogV2.confirm({
      window: { title: "Clear Binding" },
      content: `<p>Remove <strong>${foundry.utils.escapeHTML(action.label)}</strong> `
        + `(${foundry.utils.escapeHTML(action.packageTitle)}) from `
        + `<strong>${foundry.utils.escapeHTML(groupData.comboDisplay)}</strong>?</p>`,
      yes: { label: "Remove", icon: "fa-solid fa-trash" }
    });
    if ( !proceed ) return;

    await this.#resolve([{ actionId, combo, binding: null }]);
  }

  /**
   * Turn a claim row into an inline "press a combination" editor.
   * @this {ConflictViewer}
   * @type {ApplicationClickAction}
   */
  static #onRebindClaim(event, target) {
    const claim = target.closest(".claim");
    const group = target.closest(".conflict-group");
    const controls = claim.querySelector(".claim-controls");
    const actionId = claim.dataset.actionId;
    const index = Number(claim.dataset.index);
    const combo = group.dataset.combo;

    startInlineEdit({
      row: claim,
      controls,
      target: { actionId, index },
      onCommit: binding => this.#resolve([{ actionId, combo, binding }]),
      onCancel: () => this.render()
    });
  }
}
