/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { INSTRUCTIONS_PATH, MODULE_ID, TEMPLATES } from "./constants.js";
import { logError } from "./helpers.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Renders the module's shipped instructions document.
 *
 * The markdown file is the single source of truth for the in-app help, so the
 * document on disk and the window can never drift apart. Showdown is the same
 * converter Foundry bundles and uses for markdown journal pages.
 */
export class InstructionsViewer extends HandlebarsApplicationMixin(ApplicationV2) {

  /** @inheritDoc */
  static DEFAULT_OPTIONS = {
    id: `${MODULE_ID}-instructions`,
    classes: [MODULE_ID, "instructions"],
    window: {
      title: "Undumbify Shortcuts — Instructions",
      icon: "fa-solid fa-book-open",
      resizable: true
    },
    position: { width: 680, height: 660 }
  };

  /** @override */
  static PARTS = {
    body: {
      template: TEMPLATES.instructions,
      scrollable: [".instructions-body"]
    }
  };

  /**
   * Showdown options matching Foundry's own markdown handling.
   * @type {Record<string, boolean>}
   */
  static #CONVERTER_OPTIONS = {
    disableForced4SpacesIndentedSublists: true,
    noHeaderId: true,
    strikethrough: true,
    tables: true
  };

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    return {
      ...await super._prepareContext(options),
      content: await this.#renderInstructions()
    };
  }

  /* -------------------------------------------- */

  /**
   * Fetch the instructions document and convert it to HTML.
   * @returns {Promise<string>}
   */
  async #renderInstructions() {
    try {
      const response = await fetch(INSTRUCTIONS_PATH);
      if ( !response.ok ) throw new Error(`${response.status} ${response.statusText}`);
      const converter = new window.showdown.Converter(InstructionsViewer.#CONVERTER_OPTIONS);
      return converter.makeHtml(await response.text());
    } catch ( error ) {
      logError(`could not load ${INSTRUCTIONS_PATH}`, error);
      return "<p>The instructions document could not be loaded. "
        + "See the README in the module folder instead.</p>";
    }
  }
}
