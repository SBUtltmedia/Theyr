# Super Lean th-set System Plan

This document outlines the steps to create a minimal, standalone version of the `th-set` server-authoritative state system, stripping away Aztec game-specific logic.

## 1. Mock OAuth Endpoint in `@login/**`
**Goal:** Enable development/testing without requiring a real Discord application or internet connection, while maintaining the data structure expected by the system.

- [ ] **Modify `login/index.js`**: Update the simple login server to simulate the complex data structure returned by the Discord OAuth flow.
    - Instead of just passing `nick`, construct a full `authData` object (simulating Discord user + guild member data).
    - Ensure `userData` passed to Twine includes `{ gameState, authData }`.
- [ ] **Update `login/index.html`**: Ensure the login form sends necessary data (nickname) to generate the mock profile.

## 2. Clean Initial State
**Goal:** Remove Aztec-specific variables from the server's initial state.

- [ ] **Create `leanVars.json`**: A minimal, effectively empty JSON file (e.g., `{}`) to serve as the initial server state.
    - Note: Variables do *not* need to be pre-defined here. The `<<th-set>>` macro allows dynamic variable creation from Twee.
- [ ] **Update `Webstack.js` / Config**: Point the server to use `leanVars.json` to ensure a clean slate without Aztec leftovers.

## 3. Isolate Twine Macros
**Goal:** Extract the `<<th-set>>` macro and related client-side logic into a clean file.

- [x] **Integrate `live-update`**: Fetched and integrated external `live-update.js` for `<<liveblock>>` macro.
- [x] **Extract `th-set`**: Moved `<<th-set>>` logic to `Twine/modules/th-set.js`.
- [x] **Bundle Scripts**: Moved `ClientDemo.js`, `lodash.js`, etc. to `Twine/modules/` and updated `tweeGaze.js` to bundle them automatically via `tweego`.
- [x] **Update `Twine/LeanDemo.twee`**: Simplified `Story JavaScript` to only load `socket.io` and call `initMultiplayerClient`.
- [x] **Remove Aztec Logic**: Code verified as generic engine logic.

## 4. Minimal Twine Story
**Goal:** Create a simple "Hello World" style multiplayer demo.

- [x] **Create `Twine/LeanDemo.twee`**: A minimal story with chat and shared counter.
- [x] **Update Config**: Pointed server to `LeanDemo.html`.
- [x] **Style**: Integrated `Twine/demo_style.css` into the build process.

## 5. Cleanup
**Goal:** Create a simple "Hello World" style multiplayer demo.

- [ ] **Create `Twine/LeanDemo.twee`**: A minimal story with:
    - A start passage.
    - A display of a shared variable.
    - A button to update that variable using `<<th-set>>`.
    - **Chat Example**: A simple input and display area that shows how to use `<<th-set>>` with an array of message objects (e.g., `[{user, text, time}]`) and `<<liveblock>>` to show updates instantly for everyone.
- [ ] **Update Config**: Point the server to load `LeanDemo.twee` instead of the Aztec story files.

## 5. Cleanup
- [ ] **Remove unused files**: Archive or delete `Twine/EngineDemo.twee`, `Twine/demo.twee`, and other game-specific assets from the active build path.