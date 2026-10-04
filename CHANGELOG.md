# 0.0.1

### Added

* **Name the culprit.** Every conflicting binding in Controls Configuration names the other actions on that key and the module, system or core behind each one, with rebind, remove and go-to controls in place.
* **Conflict Overview.** Every contested key press in one window, with the actions in the order Foundry runs them, a **Foundry** or **Packages** tag, and **Keep This One** to settle it in one step.
* **Conflicts judged the way Foundry dispatches keys.** Reserved modifiers count, so an action on Shift + Q collides with core's Descend on Q. GM-only actions are left out on a player's client, and Foundry's own locked bindings (Escape, Delete, Ctrl + A/Z/X/C/V) are left out entirely.
* **Can Coexist.** The GM can mark a deliberate overlap as harmless for every client. It comes back if another action joins that key.
* **Alerts only for new conflicts.** At world start the GM gets the Conflict Overview and a player gets a notification, only for conflicts not flagged before, and for a player only those the GM's fixes cannot reach.
* **Search by combination**, **per-category conflict counts**, **live Sync** of the GM's customized bindings, and **Control Profiles** stored in the module's own folder.
