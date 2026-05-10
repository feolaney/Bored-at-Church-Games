# Work History

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
