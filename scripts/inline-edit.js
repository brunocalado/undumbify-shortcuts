/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { getActionsForCombo } from "./detector.js";
import { bindingFromEvent, formatCombo, logError, normalizeCombo } from "./helpers.js";

/**
 * A "press a combination" inline editor for one binding, shared by the three surfaces that each
 * independently grew a copy of it: the Controls Configuration conflict expansion panel, the
 * Conflict Overview's claim rows, and (via showFeedback alone) Foundry's own binding input.
 *
 * Pure UI — this module never writes a binding itself. The caller decides what a save or delete
 * means (a local `replaceBinding()`, or fanning the change out to every connected client) and
 * what to do once it lands (`refreshControlsConfig()`, re-render, both).
 */

/**
 * Turn a row into an editor for one binding.
 * @param {object} options
 * @param {HTMLElement} options.row              The row that gets `.us-editing` and hosts the
 *   feedback line as a sibling of the controls, so it can wrap onto its own line.
 * @param {HTMLElement} options.controls         The element whose content becomes the editor.
 * @param {{actionId: string, index: number}} options.target  What is being rebound.
 * @param {(binding: {key: string, modifiers: string[]}|null) => Promise<void>} options.onCommit
 *   Called with the new binding, or `null` to remove it. Rejecting shows the error inline and
 *   re-enables the editor; resolving leaves teardown to the caller (it already re-rendered).
 * @param {() => void} options.onCancel          Called when the edit is abandoned.
 */
export function startInlineEdit({ row, controls, target, onCommit, onCancel }) {
  row.classList.add("us-editing");
  controls.innerHTML = `
    <span class="us-editor">
      <input type="text" class="us-key-input" placeholder="Press a combination…"
             readonly autocomplete="off" spellcheck="false"
             aria-label="New combination for this action">
      <button type="button" class="inline-control icon fa-solid fa-floppy-disk us-save"
              data-tooltip aria-label="Save" disabled></button>
      <button type="button" class="inline-control icon fa-solid fa-trash us-delete"
              data-tooltip aria-label="Remove this binding"></button>
      <button type="button" class="inline-control icon fa-solid fa-ban us-cancel"
              data-tooltip aria-label="Cancel"></button>
    </span>`;

  const feedback = document.createElement("p");
  feedback.className = "us-feedback";
  feedback.hidden = true;
  row.append(feedback);

  const input = controls.querySelector(".us-key-input");
  const save = controls.querySelector(".us-save");
  let pending = null;

  input.addEventListener("keydown", event => {
    event.preventDefault();
    event.stopPropagation();
    if ( event.key === "Escape" ) return void cancel();

    const binding = bindingFromEvent(event);
    if ( !binding ) return;

    pending = binding;
    const combo = normalizeCombo(binding.key, binding.modifiers);
    input.value = formatCombo(combo);
    save.disabled = false;
    showFeedback(feedback, combo, target.actionId);
  });

  save.addEventListener("click", () => commit(pending));
  controls.querySelector(".us-delete").addEventListener("click", () => commit(null));
  controls.querySelector(".us-cancel").addEventListener("click", cancel);

  requestAnimationFrame(() => input.focus());

  /**
   * Persist the change through the caller and let it handle teardown/refresh.
   * @param {object|null} binding
   */
  async function commit(binding) {
    for ( const button of controls.querySelectorAll("button") ) button.disabled = true;
    try {
      await onCommit(binding);
    } catch ( error ) {
      logError(`could not rebind ${target.actionId}`, error);
      feedback.className = "us-feedback us-feedback-error";
      feedback.textContent = error.message;
      feedback.hidden = false;
      for ( const button of controls.querySelectorAll("button") ) button.disabled = false;
    }
  }

  /** Abandon the edit and hand control back to the caller. */
  function cancel() {
    feedback.remove();
    row.classList.remove("us-editing");
    onCancel();
  }
}

/**
 * Say whether a candidate combination is free, and if not, who holds it.
 * @param {HTMLElement} feedback
 * @param {string} combo
 * @param {string} actionId   The action being rebound, which cannot conflict with itself
 */
export function showFeedback(feedback, combo, actionId) {
  const taken = getActionsForCombo(combo).filter(action => action.actionId !== actionId);
  if ( taken.length ) {
    const names = taken.map(action => `${action.label} (${action.packageTitle})`);
    feedback.className = "us-feedback us-feedback-conflict";
    feedback.textContent = `Already used by ${game.i18n.getListFormatter().format(names)}.`;
  } else {
    feedback.className = "us-feedback us-feedback-clear";
    feedback.textContent = "This combination is free.";
  }
  feedback.hidden = false;
}
