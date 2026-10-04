# Undumbify Shortcuts

Foundry marks a conflicting keybinding with a ⚠ and a tooltip naming an action — but not the package that registered it. This module fills in the missing half, lets you resolve conflicts without leaving the row, and can carry your controls between clients, worlds, and sessions.

---

## Naming the Culprit

Every binding that shares its combination with another action gets a tinted row and an extra button in its control row. Click the button and a panel opens underneath, listing every competing action together with the **module, system, or core** that registered it.

That package name is the whole point. "Copy" in Foundry's tooltip could be any of thirty modules; here it is spelled out.

---

## Resolving It in Place

Each row in the panel carries its own controls:

- **→** switches to that action's category, scrolls to it, and flashes it.
- **✎** turns the row into an editor. Press a new combination and the module answers immediately — free, or already taken by a named list of actions. Save to apply.
- **🗑** removes the binding, leaving the action unassigned.
- **🔒** appears instead when the package locked that binding. Locked bindings still count as conflicts, they just cannot be changed.

The editor checks a candidate the same way Foundry dispatches it: moving an action to **Shift + Q** is reported as taken when core's Descend sits on **Q**, because Descend also fires with Shift held.

Every resolution goes through immediately in Controls Configuration itself — the native key label updates without reopening the window.

![Controls Configuration with a conflict expanded, naming the competing actions and their packages](modules/undumbify-shortcuts/docs/controls-configuration.webp)

---

## Searching by Combination

Click the **"Press a combination…"** field in the sidebar and press any combination — `Alt+Left`, `Shift+C`, `Q`.

- The field fills itself; you never type text into it.
- Every action bound to that combination is listed, each with its package.
- Matching rows in the main list are highlighted and the rest are dimmed.
- **→** jumps to any result.
- Press `Esc` or click the **×** to clear.

---

## While Editing a Binding

When you use Foundry's own ✎ button, press the candidate combination and the module adds a line under the input naming the actions and packages already using it — the detail the native tooltip leaves out. Saving is still Foundry's to handle.

---

## The Category Counts and Conflict Badge

Every category in the sidebar shows a small warning icon and a count of how many of its actions are involved in a conflict — a quick scan of where to look before opening anything.

Under the search field, a badge shows the running total of **contested combinations** — how many distinct key combinations have more than one action claiming them. Click it to open the **Conflict Overview**. When there are no conflicts, the same button turns green instead of disappearing.

The overview is also reachable from the window's header and from **Game Settings** → **Module Settings** → **Undumbify Shortcuts**.

When the world starts, a conflict that was not there last time is flagged on its own — but only a new one. A conflict already flagged at a previous start, or one the GM marked as **Can Coexist**, stays quiet; it is still counted in the badge until it is resolved or accepted.

- **The GM** gets the Conflict Overview, since resolving is the GM's job and Sync carries the result to everyone.
- **A player** gets a short notification instead, and only for conflicts the GM's fixes cannot reach: when Sync is off, or when the conflict involves a binding the player set themselves.

It can be turned off per client at **Game Settings** → **Configure Settings** → **Alert on New Conflicts** (on by default).

---

## The Conflict Overview: Resolving Conflicts

The Conflict Overview lists every contested key press as its own group, with every action competing for it named alongside the package that registered it.

The actions are numbered in the order Foundry tries them. On a key press Foundry runs the first one, and moves on to the next unless the first one claims the key — so either both fire, only the first one ever fires, or each acts in a different situation. Only the last case is harmless, and only you can tell which one it is.

Each group is tagged **Foundry** when one of the actions is a core control — the case this module exists for, such as Quickdraw and core's Descend both on **Q** — or **Packages** when only modules or the system are involved, which is where most deliberate, situation-dependent overlaps live.

Each claim carries:

- **👑 Keep this one** — clears every other *editable* claim on that combination in one step, after a confirmation naming exactly what will be removed and which locked claims will remain. This is the fastest way to settle a conflict once you know which action should win.
- **✎ Rebind** — the same inline "press a combination" editor as Controls Configuration.
- **🗑 Clear** — removes just that one claim.
- **→** — jumps to the action in Controls Configuration.
- **🔒** — shown instead of Rebind/Clear when the package has locked that binding. "Keep this one" still works even when the surviving claim is itself locked.

Each group also carries **Can Coexist** (GM only). It moves the group into a collapsed **Ignored** section for every client: it stops counting, stops alerting, and stops tinting rows in Controls Configuration. A **Foundry** group asks for confirmation first, spelling out the run order. If another action later joins that key press, the conflict comes back on its own. **Restore** in the Ignored section undoes it.

Resolving the last conflict flips the window to "No keybinding conflict needs attention," and the sidebar badge follows suit.

![The Conflict Overview listing several contested combinations, each with its competing actions](modules/undumbify-shortcuts/docs/keybinding-conflicts-view.webp)

---

## Sync: Keeping Everyone's Controls With the GM's

A **Sync** toggle sits in the Conflict Overview's toolbar — a GM sees it as a switch; everyone else sees a read-only "Sync is on/off" status. It ships **on** by default.

While it is on:

- Every action you customize as the GM is mirrored onto every other connected client automatically — resolving a conflict here, rebinding through Foundry's own ✎ editor, anything that changes your `core.keybindings`. There is nothing to click to send it; the mirroring itself is the point.
- Only actions **you have actually customized** are mirrored. An action you have never touched is not part of the sync at all, so a player's own binding for it — including one for a module you don't have installed — is left exactly as they set it. This is what lets "the player has a shortcut the GM doesn't have, and vice versa" hold true at the same time as "everyone follows the GM."
- Joining the world checks and syncs automatically too, so a player does not need to wait for the GM to change something after they connect — the GM's most recently published state is picked up right away.
- Only **currently connected** users are reached at any given moment; a keybinding is stored per browser, so there is no world-wide store to write into directly. The mirror itself is stored with the world, though, so it is waiting for a player even if the GM is offline when that player joins.
- Players get a notification when their controls actually change; nothing happens silently.

Turning Sync off stops future propagation but does not undo anything already mirrored — each client keeps whatever it last had.

---

## Control Profiles

**Game Settings** → **Module Settings** → **Undumbify Shortcuts** → **Manage Profiles** (GM only) stores complete keybinding sets as named profiles in this module's own folder — `undumbify-shortcuts/storage/profiles.json` — rather than in any one world or browser. Because that file lives with the module itself, the same profile follows the module wherever it is enabled.

The profile currently in effect is marked **Active**, with its row highlighted, so it is never ambiguous which one that is. From the manager:

- **New from My Current Controls** (header) snapshots this client's bindings into a brand-new profile.
- **✓ Activate** — asks for confirmation, then makes that profile the world's active one and applies it to this client immediately. There is no separate "push to everyone" action any more: activating a profile is a `core.keybindings` write on the GM's own client, exactly what **Sync** (above) already watches for — if Sync is on, activating already reaches every connected client on its own; if it is off, it stays local only. The confirm dialog says which case applies before you commit. A small **Sync On/Off** indicator in the header is a reminder of which one is currently true.
- **💾 Save** overwrites the stored profile with this client's current controls, after confirming.
- **📥 Load** applies the profile to this client only, without changing which profile is the world's active one and without propagating through Sync — useful for trying a profile locally before committing to it.
- **🗑 Delete** — the `Default` profile can never be deleted.
- **Export**/**Import** move a whole profiles document as a `.json` file, independent of persistent storage — useful for moving a set of controls between installations by hand.

Each client controls whether this applies to them: **Game Settings** → **Configure Settings** → **Auto-Apply Control Profile** (on by default). A profile is applied once per revision per client — editing your own bindings between reloads is never silently overwritten unless the GM saves a new revision.

![The Control Profiles manager, listing several saved profiles with the active one highlighted](modules/undumbify-shortcuts/docs/manage-profiles.webp)

Persistent storage must be active for saving to work (`persistentStorage` in the manifest — this ships enabled, but a world restart is required after installing or updating the module before the first save).

---

## What Counts as a Conflict

A key press that two or more actions registered through `game.keybindings.register()` would respond to, judged by the same rules Foundry uses to dispatch it:

- An action also fires with any of its **reserved modifiers** held. Core's Descend is bound to **Q** but reserves **Shift**, so an action on **Shift + Q** still collides with it.
- **GM-only** actions never run on a player's client, so they never produce a conflict there.
- Foundry's own **locked** bindings — Escape, Delete, and Ctrl + A/Z/X/C/V — are left out. Packages extend those keys on purpose, and the core side can never be rebound. Foundry still shows its own ⚠ on the other package's row.

> A shared key press is not automatically a bug. Many actions only act in a certain situation — on the canvas, with a token selected, while their own window is open — and let the key pass otherwise. That is what **Can Coexist** is for.

> Foundry's own warning also covers browser shortcuts such as `Ctrl+C`. That is a separate system; this module reports Foundry-to-Foundry collisions only.

---

## Access

Naming conflicts, searching by combination, and resolving conflicts locally work for every player and GM alike — no permission is required. Turning Sync on or off and managing profiles are GM-only, since activating or resolving something can change what someone else's client does.
