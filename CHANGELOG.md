# 0.0.2

### Added

* **Can Coexist.** Many modules share a key on purpose, each acting in its own situation. The GM can mark such a conflict as harmless for every client; it moves to a collapsed **Ignored** section and stops counting and alerting. It comes back on its own if another action joins that key, and **Restore** undoes it.
* **Run order and tags.** The Conflict Overview numbers the actions in the order Foundry runs them, and tags each group **Foundry** when it involves a core control, or **Packages** when only modules or the system are involved.
* **Automatic releases.** New versions are published to GitHub and foundryvtt.com on their own. Install from the Foundry module browser, or use the manifest URL `https://github.com/brunocalado/undumbify-shortcuts/releases/latest/download/module.json`.

### Changed

* **Alerts only for new conflicts.** At world start the Conflict Overview no longer reopens for conflicts already flagged before. The GM gets the overview; a player only gets a notification, and only for conflicts the GM's fixes cannot reach — with Sync off, or involving a binding the player set themselves.
* **Conflicts judged the way Foundry dispatches keys.** Reserved modifiers count, so an action on Shift + Q now collides with core's Descend on Q. GM-only actions are left out on a player's client, and Foundry's own locked bindings (Escape, Delete, Ctrl + A/Z/X/C/V) are left out entirely. The rebind editor uses the same rules.


# 0.0.1

### Added

* **Name the culprit.** Every conflicting binding in Controls Configuration names the other actions on that key and the module, system or core behind each one, with rebind, remove and go-to controls in place.
* **Conflict Overview.** Every contested combination in one window, with **Keep This One** to settle it in one step.
* **Search by combination**, **per-category conflict counts**, **live Sync** of the GM's customized bindings, and **Control Profiles** stored in the module's own folder.
