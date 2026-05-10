# Work History

## 2026-05-10 - Homepage Launcher Status Cleanup

- Simplified the homepage `launcher.status` panel so it is informational only.
- Removed the Settings readout plus the Settings and Refresh buttons from that panel.
- Removed unused DOM lookups, event listeners, and CSS for the removed launcher controls.

What to test:
- Load the homepage and confirm `launcher.status` only shows game/storage/last-played information.
- Confirm Settings is still reachable from the header control.
- Confirm selecting a game from the library still opens the game info page.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Scroll To Top On Navigation

- Added a shared library `scrollToTop()` helper and call it after app view changes.
- Exposed `scrollToTop` to game controllers so in-game controls can return the viewport to the top.
- Updated Ultimate Tic Tac Toe and Connect Four Plus New Game resets to scroll to the top after resetting.

What to test:
- Scroll down on the library, click a game card, and confirm the game info page starts at the top.
- Scroll down on a game info page, click Play, and confirm the game starts at the top.
- Scroll down inside either game, click New Game, and confirm the viewport returns to the top of the game.
- Use Game Info/Library navigation from inside a game after scrolling and confirm the new view starts at the top.

Verification:
- `node --check library/app.js`
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check games/connect-four-plus/ui.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Compact Game Header Controls

- Moved the in-game `Game Info` and `Library` controls into the global header so they sit under Settings at the top right during game sessions.
- Hid the `SESSION: ACTIVE` chip in game mode.
- Converted the game-mode Settings control into a compact gear icon button.
- Reduced the Ultimate Tic Tac Toe game header text and padding to make the title block roughly half-height compared with the previous screenshot.

What to test:
- Launch Ultimate Tic Tac Toe and confirm the title/header block is compact, the session chip is gone, Settings is a small gear at top right, and Game Info/Library appear smaller beneath it.
- Confirm the same Game Info/Library buttons still navigate correctly.
- Confirm the library/menu header still shows the normal Settings button and session/readiness chip.

Verification:
- `node --check library/app.js`
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check games/connect-four-plus/ui.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Agent Commit Summary Workflow

- Updated `AGENTS.md` so implementation passes should commit their changes before the final response unless explicitly told not to.
- Added a final-response requirement to include what was committed: commit hash, commit message, and committed files or key changes.
- Committed the current worktree changes from this pass and the prior Ultimate Tic Tac Toe visual adjustment.

What to test:
- Review `AGENTS.md` and confirm the commit/summary workflow matches the desired console behavior.

Verification:
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check games/ultimate-tic-tac-toe/logic.js`
- `git status --short`

Manual browser verification was not run in this pass.

## 2026-05-10 - Ultimate Tic Tac Toe Closed Board Emphasis

- Updated completed mini-board styling so the large claimed X/O owner mark is bright and primary.
- Dimmed the individual small-board cell marks after a mini-board is closed, since those cells are no longer playable.

What to test:
- Complete a mini-board for X or O and confirm the large owner mark is no longer washed out.
- Confirm the small marks inside that completed board fade back while open boards keep normal mark contrast.

Verification:
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check games/ultimate-tic-tac-toe/logic.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Ultimate Tic Tac Toe Mark Contrast

- Fixed Ultimate Tic Tac Toe board marks being dimmed after placement by scoping disabled-button styling away from board cells.
- Preserved disabled/non-playable cell behavior while restoring full green X and amber O colors for occupied cells.

What to test:
- Place several X and O moves across legal boards and confirm existing marks stay bright instead of turning muted gray/green.
- Confirm occupied and illegal-route cells still cannot be clicked.

Verification:
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check games/ultimate-tic-tac-toe/logic.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Plus Board Drop Controls

- Updated Connect Four Plus so tapping/clicking the board column drops a piece when no powerup is selected.
- Kept powerup targeting behavior intact: Shield still targets an individual cell, while column powers still target columns.
- Added a falling-piece animation for newly dropped discs, scoped to the latest engine drop so ordinary re-renders do not repeatedly replay it.
- Added playable-column hover/focus styling on the board cells.

What to test:
- Start a Connect Four Plus turn, tap any cell in a legal column, and confirm the piece drops into that column.
- Tap the dark board gap inside a column and confirm it also resolves to that column.
- Select a powerup and confirm board taps resolve the powerup instead of dropping a normal piece.
- Confirm the dropped disc visibly falls into place.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Plus Power Duel

- Added `games/connect-four-plus/` as a new modular game with separate `logic.js`, `ui.js`, and `bauhaus.css`.
- Implemented the PDF-recommended default mode: Connect Four Plus - Power Duel.
- Included pass-and-play privacy with a handoff screen before each private turn.
- Added hidden player powerup hands, one powerup per turn, max hand size of 3, and hidden powerup draw every fourth personal turn.
- Implemented the initial Power Duel powerups: Pop, Lock, Swap Top, Shield, and Double Drop.
- Added Bauhaus visual styling scoped to Connect Four Plus, including primary color blocks, thick black borders, hard offset shadows, and geometric shapes.
- Registered Connect Four Plus in the library picker and wired its scripts/styles through `index.html`.
- Scoped Ultimate Tic Tac Toe terminal header styling to its own game id so future game styles do not inherit it accidentally.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- `node --check library/app.js`
- Confirmed all linked local assets in `index.html` exist.
- Confirmed both `ultimate-tic-tac-toe` and `connect-four-plus` register with `window.ChurchGames`.
- Simulated core engine behavior for Red vertical win, Double Drop, Lock, and Pop.

Manual browser verification was not run in this pass because no browser automation or local browser CLI was available in the environment.
