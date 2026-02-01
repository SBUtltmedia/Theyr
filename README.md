<p align="center">
  <img src="https://res.cloudinary.com/dsry3cnco/image/upload/v1642440780/theyr_logo_axzsjz.png" alt="Theyr Logo"/>
</p>

# 🚀 Theyr: Lean Multiplayer for Twine

A lightweight, server-authoritative multiplayer engine for Twine (SugarCube). This system allows multiple players to interact with the same story variables in real-time.

## 📖 Writer's Guide: Making Your Story Multiplayer

This engine adds a special command called `<<th-set>>`. Use this instead of the standard `<<set>>` when you want a change to happen for **everyone**.

### The Golden Rule
*   **`$variables` are Shared:** By default, any variable starting with `$` is synchronized across all players. If Player A changes `$gold`, Player B sees the new amount instantly.
*   **`_variables` are Private:** Temporary variables (starting with `_`) stay on your computer and are never sent to the server.
*   **Exceptions:** Some special `$` variables (like `$userId`) are marked as "local-only" in the code and won't sync.

### 1. Changing Numbers (Counters)
When multiple people might click a button at the same time (like a "Community Score"), **do not** use `=`.

*   ❌ **Bad:** `<<th-set $score = $score + 1>>`
    *   *Why?* If Alice and Bob click at the exact same moment, they might both set the score to "11", effectively losing a click.
*   ✅ **Good:** `<<th-set $score += 1>>`
    *   *Why?* This sends a "Add 1" command to the server. The server will queue them up: 10 + 1 = 11, then 11 + 1 = 12. Everyone gets counted.

### 2. The "List Trap" (Working with Arrays)
Be very careful when updating lists (arrays). The system tries to be smart and "merge" updates, which can cause confusing results if you aren't careful.

**The Fix: All or Nothing**
When changing a list, assume the system will try to merge it. To Add an Item, modify the list locally then sync the whole thing:
```twee
<<run $chatMessages.push({text: "Hello", user: $userId})>>
<<th-set $chatMessages to $chatMessages>>
```

### 3. Working with Inputs (The "Drafting Pattern")
Standard Twine macros like `<<textbox>>` or `<<cycle>>` only change variables locally. To sync them, you should store the input in a temporary variable and use a "Confirm" button to publish it to a shared object (like a user profile).

**Note:** You must always ensure the shared objects are initialized before writing to them!

*   ✅ **Best Practice:** 
    ```twee
    /* 1. Ensure the user object exists */
    <<if !def $users>>
        <<th-set $users to {}>>
    <</if>>
    <<if !def $users[$userId]>>
        <<th-set $users[$userId] to { name: "Anonymous" }>>
    <</if>>

    /* 2. Use a temporary variable for typing */
    <<textbox "_draftName" $users[$userId].name>> 

    /* 3. Publish to everyone on click */
    <<button "Confirm Name">>
        <<th-set $users[$userId].name to _draftName>>
    <</button>>
    ```
    *This keeps the typing private and ensures you are writing to a valid path.*

### 4. Making it "Live" with `<<liveblock>>`
To make a specific part of your screen update **instantly** without the player moving, wrap it in a `<<liveblock>>`.

```twee
<<liveblock>>
    Current Score: $score
<</liveblock>>
```

---

## 💻 Developer & API Guide

### JavaScript API
If you are writing custom JavaScript, you can trigger syncs directly:

*   **Update a variable:** `window.sendStateUpdate('$myVar', value);`
*   **Math/Atomic update:** `window.sendAtomicUpdate('$myCounter', 'add', 1);`

*Note: Remember to also update `State.variables` locally if you want the change to be reflected immediately for the active player.*

### Prerequisites
*   Node.js (v16+)
*   NPM

### Quick Start
1.  **Install Dependencies:** `npm install`
2.  **Start the Server:** `npm start` (Starts the server and automatically watches/builds Twine files on save)
3.  **Manual Build:** `npm run build` (If you just want to compile without starting the server)

### 🧪 Testing Suite
Theyr now includes a comprehensive testing suite powered by **Playwright** to ensure multiplayer synchronization and UI reactivity stay rock-solid.

*   **Run All Tests:** `npm test`
*   **Interactive UI Mode:** `npm run test:ui` (Visual debugging)
*   **Debug Mode:** `npm run test:debug`
*   **View Report:** `npm run report`

The tests simulate multiple concurrent users to verify real-time state broadcasting and the custom macro logic.

### 🗝️ Mock Login System
Theyr includes a built-in mock login screen at `/` that mimics a real OAuth flow.
*   **Auto-Redirect:** If you aren't "logged in," the server serves the entry portal.
*   **Data Injection:** Once you enter a name, the server injects your data into the `<head>` of the Twine story, making it available as `window.userData`.

### 🏗️ Architecture & File Structure
*   **`Twine/src/`**: Modular Twee source files (`StoryInit`, `Start`, `ChatRoom`).
*   **`Twine/modules/`**: Engine logic and custom macros.
*   **`login/`**: The mock authentication portal.
*   **`tests/`**: Playwright end-to-end tests.
*   **`build-twine.js`**: Cross-platform build script using `tweego-bin`.
*   **`tweeGaze.js`**: File watcher that triggers builds automatically during development.
*   **`gameState.json`**: Persistent server-side state.
*   **`leanVars.json`**: Initial "clean" state used for resets.

### 🛠️ Multiplayer UI Configuration
Theyr explicitly disables several default SugarCube features to maintain synchronization between players:

*   **Saves are Disabled**: Default local saves snapshot `$variables` to the browser. Loading an old save would attempt to overwrite the current live server state with stale data, causing massive de-syncs.
*   **History Controls are Disabled**: The "Back" and "Forward" buttons rewind local state. In a multiplayer world, global actions (like incrementing a counter) are permanent and cannot be "undone" by a single player without affecting everyone else.
*   **Single-State History**: Local history is limited to 1 state to keep the client memory-efficient and prevent "time-traveling" bugs.

---

## ❓ Frequently Asked Questions

**Is there a JavaScript version of `<<th-set>>`?**
Yes. You can use `window.sendStateUpdate('$variableName', value)` for simple updates, or `window.sendAtomicUpdate('$variableName', 'add', 1)` for math operations. Note that you should also update `State.variables` locally if you want the change to appear instantly for the current player.

**How do I support macros like `<<textbox>>` or `<<cycle>>`?**
Since standard SugarCube macros use the regular `<<set>>` logic internally, they won't sync automatically. Use the **Drafting Pattern**: take the input into a temporary variable (e.g. `_draftName`) and use a "Confirm" button with `<<th-set>>` to publish it to everyone.

**Do I need to install `<<liveblock>>` separately?**
No. Theyr includes a built-in implementation of the community-standard `live-update.js` library. It is automatically bundled into your game during the build process.

**Does Theyr support `<<do>>` and `<<redo>>`?**
Yes. Players navigate the story independently, but any shared variable changed via `<<th-set>>` within these macros will propagate to all other players as expected.

**Is NodeJS support only for the server side?**
Yes. NodeJS runs the server, manages the "Source of Truth," and handles persistence. The Twine story itself runs in the player's browser using standard client-side JavaScript.

---

## 🚀 Deployment

### Recommended: Render.com

Theyr is pre-configured for easy deployment on **Render**.

#### 1. Quick Deploy (Blueprint)
Theyr includes a `render.yaml` file. You can create a **"Blueprint"** on Render, and it will automatically configure the build and start commands for you.

*   **Build Command**: `npm install && npm run build`
*   **Start Command**: `npm start`

#### 2. Koyeb (Free Tier / No CC often possible)
1. Sign up at [Koyeb.com](https://www.koyeb.com/).
2. Create a new **App** and connect your GitHub repository.
3. Koyeb will detect the `Dockerfile` and handle the build and deployment automatically.
4. **Important**: Set the environment variable `PORT` to `3000` if Koyeb doesn't detect it automatically.

#### 3. Persistence (Game State)
By default, Render's filesystem is ephemeral. To save your game state permanently across restarts:
1.  Upgrade your service to a **paid plan** (e.g., Starter).
2.  Add a **Persistent Disk** in the Render dashboard.
3.  Mount the disk at `/opt/render/project/src/data`.
4.  Set the environment variable `STATE_FILE_PATH` to `/opt/render/project/src/data/gameState.json`.

*Note: On the free tier, the `gameState.json` will reset whenever the server goes to sleep or you redeploy.*

---
