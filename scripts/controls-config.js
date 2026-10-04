/*!
 * Undumbify Shortcuts
 * Copyright (c) 2026 https://github.com/brunocalado
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3.
 */

import { MODULE_ID, SETTINGS } from "./constants.js";
import { ConflictViewer } from "./conflict-viewer.js";
import { buildConflictMap, countConflicts, countConflictsByCategory, getActionsForCombo } from "./detector.js";
import { showFeedback, startInlineEdit } from "./inline-edit.js";
import {
  bindingFromEvent, formatCombo, goToAction, normalizeCombo, refreshControlsConfig, replaceBinding
} from "./helpers.js";

/**
 * Everything this module adds to Foundry's own Controls Configuration window.
 *
 * All of it hangs off the structure ControlsConfig actually renders, so the
 * selectors below are the contract with core:
 *   .form-group[data-action-id]                     one keybinding action
 *     li[data-binding-id="<actionId>.binding.<i>"]  one binding of that action
 *       .controls                                   that binding's button row
 *     li.editing                                    core's own binding input row
 *
 * Reading the ids rather than the rendered labels is what keeps this working:
 * the index in a binding id addresses the exact binding to rebind, and no part
 * of it depends on the user's language.
 */
const SELECTORS = {
  main: "[data-application-part='main']",
  sidebar: "[data-application-part='sidebar']",
  actionGroup: ".form-group[data-action-id]",
  bindingRow: "li[data-binding-id]",
  bindingControls: ".controls",
  editingRow: "li.editing",
  nativeSearch: "input[type='search']",
  categoryTab: "nav.tabs button[data-tab]"
};

/**
 * Session state for the single Controls Configuration window.
 * @type {{comboFilter: string|null, editObserver: MutationObserver|null}}
 */
const state = {
  comboFilter: null,
  editObserver: null
};

/* -------------------------------------------- */
/*  Entry point                                 */
/* -------------------------------------------- */

/**
 * Add every enhancement to a freshly rendered Controls Configuration window.
 * @param {ApplicationV2} app       The ControlsConfig instance
 * @param {HTMLElement} element     Its root element
 * @param {string[]} parts          The template parts that were just rendered
 */
export function enhanceControlsConfig(app, element, parts) {
  // Carries the module's CSS scope; every rule this module ships is nested under it.
  element.classList.add(MODULE_ID);

  const rendered = part => !parts.length || parts.includes(part);

  if ( rendered("sidebar") ) {
    injectConflictBadge(element);              // must run first — it anchors on <search>
    injectComboSearch(app, element);            // inserts itself after the badge
    injectCategoryBadges(element, countConflictsByCategory());
  }
  if ( rendered("main") ) {
    injectContextNote(element);
    injectConflictTriggers(app, element);
    watchBindingEdits(element);
    applyComboFilter(element);
  }
}

/**
 * Drop references held for the window being closed.
 */
export function teardownControlsConfig() {
  state.editObserver?.disconnect();
  state.editObserver = null;
  state.comboFilter = null;
}

/* -------------------------------------------- */
/*  Context note                                */
/* -------------------------------------------- */

/**
 * Explain, once, that a shared combo is not automatically a problem.
 * @param {HTMLElement} element
 */
function injectContextNote(element) {
  if ( game.settings.get(MODULE_ID, SETTINGS.contextNoteDismissed) ) return;
  const main = element.querySelector(SELECTORS.main);
  if ( !main || main.querySelector(".us-note") ) return;

  const note = document.createElement("aside");
  note.className = "us-note";
  note.innerHTML = `
    <i class="fa-solid fa-circle-info" inert></i>
    <span>Keybindings only fire in the context they were registered for — on the canvas,
    in a text editor, during combat. Two actions can share a combination and never collide.</span>
    <button type="button" class="us-note-dismiss" aria-label="Dismiss this note">
      <i class="fa-solid fa-xmark" inert></i>
    </button>`;

  note.querySelector(".us-note-dismiss").addEventListener("click", async () => {
    note.remove();
    await game.settings.set(MODULE_ID, SETTINGS.contextNoteDismissed, true);
  });
  main.prepend(note);
}

/* -------------------------------------------- */
/*  Combo search                                */
/* -------------------------------------------- */

/**
 * Add a "press a combination" field to the sidebar which lists — and highlights —
 * every action bound to whatever the user pressed.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function injectComboSearch(app, element) {
  const sidebar = element.querySelector(SELECTORS.sidebar);
  if ( !sidebar ) return;
  sidebar.querySelector(".us-combo-search")?.remove();

  const search = document.createElement("div");
  search.className = "us-combo-search";
  search.innerHTML = `
    <div class="us-combo-field">
      <i class="fa-regular fa-keyboard" inert></i>
      <input type="text" class="us-combo-input" placeholder="Press a combination…"
             readonly autocomplete="off" spellcheck="false" aria-label="Search by key combination">
      <button type="button" class="us-combo-clear" aria-label="Clear the combination search" hidden>
        <i class="fa-solid fa-xmark" inert></i>
      </button>
    </div>
    <p class="us-combo-hint">Click, then press any combination.</p>
    <div class="us-combo-results" hidden></div>`;

  const anchor = sidebar.querySelector(".us-badge")
    ?? sidebar.querySelector(SELECTORS.nativeSearch)?.closest("search");
  if ( anchor ) anchor.after(search);
  else sidebar.prepend(search);

  const input = search.querySelector(".us-combo-input");
  const clear = search.querySelector(".us-combo-clear");

  input.addEventListener("keydown", event => {
    event.preventDefault();
    event.stopPropagation();
    if ( event.key === "Escape" ) return clearComboFilter(element);
    const binding = bindingFromEvent(event);
    if ( !binding ) return;
    state.comboFilter = normalizeCombo(binding.key, binding.modifiers);
    renderComboSearch(app, element);
  });
  clear.addEventListener("click", () => clearComboFilter(element));

  if ( state.comboFilter ) renderComboSearch(app, element);
}

/**
 * Paint the combo search field and its result list from the current filter.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function renderComboSearch(app, element) {
  const search = element.querySelector(".us-combo-search");
  if ( !search ) return;
  const input = search.querySelector(".us-combo-input");
  const clear = search.querySelector(".us-combo-clear");
  const hint = search.querySelector(".us-combo-hint");
  const results = search.querySelector(".us-combo-results");

  input.value = formatCombo(state.comboFilter);
  clear.hidden = false;
  hint.hidden = true;
  results.hidden = false;

  const actions = getActionsForCombo(state.comboFilter);
  if ( !actions.length ) {
    results.innerHTML = `<p class="us-combo-empty">Nothing is bound to this combination.</p>`;
  } else {
    results.innerHTML = `<ul>${actions.map(action => `
      <li>
        <span class="us-result-info">
          <span class="us-result-label">${foundry.utils.escapeHTML(action.label)}</span>
          <span class="us-result-package">${foundry.utils.escapeHTML(action.packageTitle)}</span>
        </span>
        <button type="button" class="us-result-goto" data-us-action-id="${action.actionId}"
                aria-label="Go to ${foundry.utils.escapeHTML(action.label)}">
          <i class="fa-solid fa-arrow-right" inert></i>
        </button>
      </li>`).join("")}</ul>`;

    for ( const button of results.querySelectorAll(".us-result-goto") ) {
      button.addEventListener("click", () => goToAction(button.dataset.usActionId));
    }
  }

  applyComboFilter(element);
}

/**
 * Highlight the action rows matching the active combo filter and mute the rest.
 * @param {HTMLElement} element
 */
function applyComboFilter(element) {
  const main = element.querySelector(SELECTORS.main);
  if ( !main ) return;

  if ( !state.comboFilter ) {
    for ( const group of main.querySelectorAll(SELECTORS.actionGroup) ) {
      group.classList.remove("us-match", "us-muted");
    }
    return;
  }

  const matches = new Set(getActionsForCombo(state.comboFilter).map(action => action.actionId));
  for ( const group of main.querySelectorAll(SELECTORS.actionGroup) ) {
    const isMatch = matches.has(group.dataset.actionId);
    group.classList.toggle("us-match", isMatch);
    group.classList.toggle("us-muted", !isMatch);
  }
}

/**
 * Drop the combo filter and restore the full list.
 * @param {HTMLElement} element
 */
function clearComboFilter(element) {
  state.comboFilter = null;
  const search = element.querySelector(".us-combo-search");
  if ( search ) {
    search.querySelector(".us-combo-input").value = "";
    search.querySelector(".us-combo-clear").hidden = true;
    search.querySelector(".us-combo-hint").hidden = false;
    const results = search.querySelector(".us-combo-results");
    results.hidden = true;
    results.replaceChildren();
  }
  applyComboFilter(element);
}

/* -------------------------------------------- */
/*  Conflict triggers and expansion             */
/* -------------------------------------------- */

/**
 * Split a `data-binding-id` into the action and the binding's index.
 * Returns null for the placeholder id core uses on actions with no bindings.
 * @param {string} bindingId
 * @returns {{actionId: string, index: number}|null}
 */
function parseBindingId(bindingId) {
  const match = /^(.+)\.binding\.(\d+)$/.exec(bindingId ?? "");
  return match ? { actionId: match[1], index: Number(match[2]) } : null;
}

/**
 * Put a disclosure button on every binding that shares its combination, so the
 * competing actions can be named without leaving the row.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 */
function injectConflictTriggers(app, element) {
  const main = element.querySelector(SELECTORS.main);
  if ( !main ) return;

  const conflicts = buildConflictMap();
  if ( !conflicts.size ) return;

  // A lighter background on the whole row, not just Foundry's own per-binding ⚠, so a
  // conflicted action stands out while scanning the list rather than only when read closely.
  for ( const actionId of conflicts.keys() ) {
    main.querySelector(`${SELECTORS.actionGroup}[data-action-id="${CSS.escape(actionId)}"]`)
      ?.classList.add("us-has-conflict");
  }

  for ( const row of main.querySelectorAll(SELECTORS.bindingRow) ) {
    const parsed = parseBindingId(row.dataset.bindingId);
    if ( !parsed ) continue;

    const binding = game.keybindings.bindings.get(parsed.actionId)?.[parsed.index];
    if ( !binding?.key ) continue;

    const combo = normalizeCombo(binding.key, binding.modifiers ?? []);
    const others = conflicts.get(parsed.actionId)?.get(combo);
    if ( !others?.length ) continue;

    addConflictTrigger(app, element, row, parsed, combo, others);
  }
}

/**
 * Build one disclosure button and wire it to its expansion panel.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 * @param {HTMLElement} row               The li[data-binding-id] being annotated
 * @param {{actionId: string, index: number}} parsed
 * @param {string} combo
 * @param {object[]} others               The other actions on this combination
 */
function addConflictTrigger(app, element, row, parsed, combo, others) {
  const controls = row.querySelector(SELECTORS.bindingControls);
  if ( !controls || controls.querySelector(".us-trigger") ) return;

  const trigger = document.createElement("button");
  trigger.type = "button";
  trigger.className = "inline-control icon fa-solid fa-chevron-down us-trigger";
  trigger.ariaExpanded = "false";
  trigger.dataset.tooltip = "";
  trigger.ariaLabel = `Show the ${others.length} other action${others.length === 1 ? "" : "s"} `
    + `bound to ${formatCombo(combo)}`;

  trigger.addEventListener("click", event => {
    event.preventDefault();
    event.stopPropagation();
    toggleExpansion(app, element, row, trigger, parsed.actionId, combo, others);
  });

  controls.prepend(trigger);
}

/**
 * Open or close the panel listing the actions competing for a combination.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 * @param {HTMLElement} row
 * @param {HTMLButtonElement} trigger
 * @param {string} actionId
 * @param {string} combo
 * @param {object[]} others
 */
function toggleExpansion(app, element, row, trigger, actionId, combo, others) {
  const open = row.nextElementSibling?.classList.contains("us-expansion");
  // Only one panel at a time — a second open panel just moves the reading position.
  for ( const panel of element.querySelectorAll(".us-expansion") ) panel.remove();
  for ( const other of element.querySelectorAll(".us-trigger[aria-expanded='true']") ) {
    other.ariaExpanded = "false";
  }
  if ( open ) return;

  trigger.ariaExpanded = "true";
  row.after(buildExpansion(app, element, actionId, combo, others));
}

/**
 * Render the expansion panel for one combination.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 * @param {string} actionId    The action the panel was opened from
 * @param {string} combo
 * @param {object[]} others
 * @returns {HTMLElement}
 */
function buildExpansion(app, element, actionId, combo, others) {
  const panel = document.createElement("li");
  panel.className = "us-expansion";
  panel.innerHTML = `
    <p class="us-expansion-heading">
      <span class="us-combo">${foundry.utils.escapeHTML(formatCombo(combo))}</span>
      is also claimed by:
    </p>
    <ul class="us-conflict-list">
      ${others.map(other => `
        <li class="us-conflict" data-us-action-id="${other.actionId}" data-us-index="${other.index}">
          <span class="us-conflict-info">
            <span class="us-conflict-label">${foundry.utils.escapeHTML(other.label)}</span>
            <span class="us-conflict-package">${foundry.utils.escapeHTML(other.packageTitle)}</span>
          </span>
          <span class="us-conflict-controls"></span>
        </li>`).join("")}
    </ul>`;

  // Matched on index as well as id: one action can hold two bindings on the same
  // combination, and each of them is separately editable.
  for ( const item of panel.querySelectorAll(".us-conflict") ) {
    const other = others.find(o => (o.actionId === item.dataset.usActionId)
      && (String(o.index) === item.dataset.usIndex));
    renderConflictControls(app, element, item, other);
  }

  return panel;
}

/**
 * Fill a conflict row's control area with its resting buttons.
 * @param {ApplicationV2} app
 * @param {HTMLElement} element
 * @param {HTMLElement} item     The li.us-conflict
 * @param {object} other         Metadata for the competing action
 */
function renderConflictControls(app, element, item, other) {
  const controls = item.querySelector(".us-conflict-controls");
  if ( !other ) return;

  if ( !other.editable ) {
    controls.innerHTML = `
      <span class="us-locked" data-tooltip aria-label="This binding is locked by its package">
        <i class="fa-solid fa-lock" inert></i>
      </span>`;
    return;
  }

  controls.innerHTML = `
    <button type="button" class="inline-control icon fa-solid fa-arrow-right us-goto"
            data-tooltip aria-label="Go to this action"></button>
    <button type="button" class="inline-control icon fa-solid fa-pen-to-square us-edit"
            data-tooltip aria-label="Rebind it here"></button>`;

  controls.querySelector(".us-goto").addEventListener("click", () => goToAction(other.actionId));
  controls.querySelector(".us-edit").addEventListener("click", () => {
    startInlineEdit({
      row: item,
      controls,
      target: { actionId: other.actionId, index: other.index },
      onCommit: async binding => {
        await replaceBinding(other.actionId, other.index, binding);
        await refreshControlsConfig();
      },
      onCancel: () => renderConflictControls(app, element, item, other)
    });
  });
}

/* -------------------------------------------- */
/*  Native edit input                           */
/* -------------------------------------------- */

/**
 * Name the packages behind a conflict while the user is typing into Foundry's own
 * binding input. Core already flags that a conflict exists; what it cannot show
 * inline is which package owns the other action.
 * @param {HTMLElement} element
 */
function watchBindingEdits(element) {
  state.editObserver?.disconnect();
  const main = element.querySelector(SELECTORS.main);
  if ( !main ) return;

  state.editObserver = new MutationObserver(mutations => {
    for ( const mutation of mutations ) {
      for ( const node of mutation.addedNodes ) {
        if ( node instanceof HTMLElement && node.matches(SELECTORS.editingRow) ) {
          attachEditFeedback(main, node);
        }
      }
    }
  });
  state.editObserver.observe(main, { childList: true, subtree: true });
}

/**
 * Attach live conflict feedback to one of core's binding input rows.
 * @param {HTMLElement} main
 * @param {HTMLElement} row   The li.editing core just inserted
 */
function attachEditFeedback(main, row) {
  const input = row.querySelector("input");
  const parsed = parseBindingId(row.dataset.bindingId);
  if ( !input || !parsed ) return;

  // Only one binding is edited at a time; drop whatever a previous edit left behind.
  for ( const stale of main.querySelectorAll(".us-inline-feedback") ) stale.remove();

  const feedback = document.createElement("li");
  feedback.className = "us-inline-feedback";
  const message = document.createElement("p");
  message.className = "us-feedback";
  message.hidden = true;
  feedback.append(message);
  row.after(feedback);

  input.addEventListener("keydown", event => {
    const binding = bindingFromEvent(event);
    if ( !binding ) return;
    showFeedback(message, normalizeCombo(binding.key, binding.modifiers), parsed.actionId);
  });
}

/* -------------------------------------------- */
/*  Sidebar badge and category counts           */
/* -------------------------------------------- */

/**
 * Show the running conflict total under the search field, as a way into the full overview window.
 * @param {HTMLElement} element
 */
function injectConflictBadge(element) {
  const sidebar = element.querySelector(SELECTORS.sidebar);
  if ( !sidebar ) return;
  sidebar.querySelector(".us-badge")?.remove();

  const count = countConflicts();
  const badge = document.createElement("div");
  badge.className = "us-badge";

  // Always the same button chrome, whether or not there is anything to resolve — only the
  // colour and icon change. A flat, unbordered "No conflicts" line read as a different kind of
  // element next to the bordered "N conflicts" button, which is the inconsistency this fixes.
  badge.innerHTML = count
    ? `<button type="button" class="us-badge-button">
        <i class="fa-solid fa-triangle-exclamation" inert></i>
        <span>${count} conflict${count === 1 ? "" : "s"}</span>
      </button>`
    : `<button type="button" class="us-badge-button us-badge-clear">
        <i class="fa-solid fa-circle-check" inert></i>
        <span>No conflicts</span>
      </button>`;
  badge.querySelector("button").addEventListener("click", () =>
    new ConflictViewer().render({ force: true }));

  const anchor = sidebar.querySelector(SELECTORS.nativeSearch)?.closest("search");
  if ( anchor ) anchor.after(badge);
  else sidebar.prepend(badge);
}

/**
 * Mark each category in the sidebar nav with how many of its actions are in a conflict.
 *
 * Deliberately a separate element from core's `span[data-count]`: CategoryBrowser#_onSearchFilter
 * rewrites that span's text on every search keystroke, so anything written into it is lost as
 * soon as the user types.
 * @param {HTMLElement} element
 * @param {Map<string, number>} counts   Result of countConflictsByCategory()
 */
function injectCategoryBadges(element, counts) {
  const sidebar = element.querySelector(SELECTORS.sidebar);
  if ( !sidebar ) return;

  for ( const button of sidebar.querySelectorAll(SELECTORS.categoryTab) ) {
    button.querySelector(".us-cat-conflicts")?.remove();

    const count = counts.get(button.dataset.tab);
    if ( !count ) continue;

    const badge = document.createElement("span");
    badge.className = "us-cat-conflicts";
    // An icon reads faster than a bare "(7)" sitting next to core's own "[54]" — the two numbers
    // in parentheses/brackets were easy to mistake for one another at a glance.
    badge.innerHTML = `<i class="fa-solid fa-triangle-exclamation" inert></i><span>${count}</span>`;
    badge.dataset.tooltip = "";
    badge.ariaLabel = `${count} action${count === 1 ? "" : "s"} in this category `
      + `${count === 1 ? "is" : "are"} in a keybinding conflict`;

    const nativeCount = button.querySelector(":scope > span[data-count]");
    if ( nativeCount ) nativeCount.before(badge);
    else button.append(badge);
  }
}
