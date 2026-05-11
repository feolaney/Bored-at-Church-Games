# Work History

## 2026-05-11 - Connect Four Prelock Indicator

- Added a distinct prelock visual state for columns that have been locked for the opponent but are still playable by the locking player.
- Marked the prelocked top drop button with a pulsing dashed lock indicator and highlighted the queued board column.
- Updated the lock status text and Column Locks rules so they distinguish prelocked-for-opponent from actively locked-for-you behavior.

What to test:
- In Column Locks or with a Lock power, choose a column to lock and confirm the current player sees the queued/prelock marker immediately.
- Confirm the locking player can still drop in that marked column on the same turn.
- Confirm the next player sees the same lane as actually locked and cannot play there.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering prelocked lane legality for the locking player, opponent lock enforcement, and lock clearing afterward.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Swap Animation

- Added Swap Top move metadata for both pieces involved in the top-piece swap.
- Animated swapped discs from their previous cells into their new cells with a small side arc so the board no longer changes instantly.
- Preserved swap animation metadata through state cloning.

What to test:
- In a mode with `Swap Top`, use it on a column with at least two pieces.
- Confirm the top two pieces visibly swap positions before play continues.
- Confirm Swap Top still consumes the hand power and still requires a normal drop afterward.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering Swap Top board mutation, swap metadata, clone preservation, and power consumption.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Shielded Bombs and Pop Targeting

- Changed bomb explosions so shielded pieces survive the 3x3 blast and are not included in bomb-cleared animation metadata.
- Changed Pop so it can remove the bottom piece from any column regardless of owner, while still refusing shielded or wild bottom pieces.
- Updated Bomb Piece and Pop help/rule text to describe shielded blast protection and any-column Pop targeting.

What to test:
- Shield a piece, then drop a bomb so the shielded piece is inside the blast area; confirm it survives while unshielded blast-area pieces are removed.
- Use Pop on an opponent-owned bottom piece and confirm it pops, disappears, and the remaining column falls afterward.
- Try Pop on a shielded bottom piece and confirm it is rejected.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering shielded bomb survival, unshielded bomb removal, opponent-piece Pop removal, and shielded Pop rejection.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Pop Animation

- Added Pop-specific move metadata for the removed bottom piece and the surviving pieces that collapse afterward.
- Added a Bauhaus-style popping circle animation over the removed piece before it disappears.
- Delayed the remaining pieces in the popped column so they fall after the pop animation, using the same bounce-style fall path as bomb cascade pieces.

What to test:
- In a mode with `Pop`, use it on your own bottom piece in a column with pieces above it.
- Confirm the bottom piece shows a popping circle before disappearing, then the pieces above it fall into place afterward.
- Confirm Pop still consumes the hand power and still requires a normal drop afterward.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering Pop removed-piece metadata and post-pop settle metadata.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Bomb Powerup

- Added `Bomb Piece` to the Connect Four Plus power deck so Power Duel, Token Hunt, Hidden Objectives, and other deck-driven power modes can award bombs.
- Updated Draft Duel starting kits so both players have one drafted `Bomb Piece`.
- Made hand-based bombs select like a normal powerup, remain cancelable before use, consume the hand card only after a legal bomb drop, and reuse the existing bomb drop/explosion/cascade behavior.
- Updated Connect Four Plus rules/help copy for bomb powerups.

What to test:
- In Power Duel or Draft Duel, activate a `Bomb Piece` from the tools area, cancel it once, then activate it again and drop it into a column.
- In Token Hunt, collect tokens until `Bomb Piece` is awarded, then confirm it can be used as a bomb drop.
- Confirm the original Bomb Pieces mode still gives bomb counters and the falling SVG/explosion behavior remains unchanged.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering hand bomb select/cancel/drop and Token Hunt token awarding `Bomb Piece`.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Bomb Drop Asset

- Swapped the falling Bomb Pieces drop visual from a CSS-drawn disc to the supplied `Images/Connect 4 Bomb.svg` asset.
- Added the `Images` directory to the build copy script so the bomb asset is included if the static build outputs to `dist`.

What to test:
- In Bomb Pieces, select a bomb and drop it into a column; confirm the falling object uses the supplied bomb artwork.
- Confirm the bomb still lands, triggers the explosion animation, and then resolves affected/cascading pieces as before.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- `node -e "JSON.parse(require('fs').readFileSync('package.json','utf8')); console.log('package json ok')"`
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-11 - Connect Four Bomb Cascade Alignment

- Fixed delayed Bomb Pieces cascade discs so they use measured board-cell positions instead of an approximate percentage offset while waiting for the explosion to finish.
- Kept the delayed settle behavior from the previous pass, but aligned the waiting pieces exactly over their original cells before they fall.

What to test:
- In Bomb Pieces, drop a bomb that clears lower pieces in a column while leaving pieces above them alive.
- Confirm the surviving pieces above the blast do not shift a few pixels before the explosion, then fall normally after the explosion animation completes.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Bomb Cascade Timing

- Added post-blast settle metadata for surviving Bomb Pieces discs that drop only because the explosion cleared pieces below them.
- Delayed those surviving-disc falling animations until after the bomb drop and full explosion animation finish, then reused the normal falling/bounce motion from their old cells into their resolved cells.

What to test:
- In Bomb Pieces, drop a bomb under a stacked column and confirm pieces above the blast stay visually in place until the explosion finishes.
- Confirm surviving pieces then fall into the cleared spaces with the same bounce-style falling animation used for normal drops.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node targeted Bomb Pieces smoke test covering 3x3 blast metadata and delayed settle-move metadata for a surviving piece above the blast.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Bomb Impact Timing

- Kept blast-cleared Bomb Pieces discs visible as temporary overlay pieces while the bomb is still falling.
- Timed those temporary pieces to collapse/fade only when the bomb reaches impact, so the board no longer reveals the post-blast empty cells early.

What to test:
- In Bomb Pieces, drop a bomb into a surrounded 3x3 area and confirm the surrounding pieces remain visible until the bomb touches down.
- Confirm the geometric blast still plays over the affected cells after impact.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node targeted Connect Four Plus smoke test covering remaining mode initialization, removed-mode absence, 3x3 bomb blast metadata, and same-column Column Battle metadata.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Bomb and Battle Animation

- Added a temporary falling bomb visual for Bomb Pieces so the bomb visibly drops and hits before the board resolves to the post-blast state.
- Replaced the text `BOOM` boxes with Bauhaus-style geometric explosion shapes over the affected blast cells.
- Cleared active board/drop-button focus after a column is selected so touchscreen taps in Simultaneous Planning do not leave a highlighted square for the next player.
- Delayed same-column Simultaneous Planning piece drops until after the Column Battle coin overlay has faded; the resolved pieces now fall afterward.

What to test:
- In Bomb Pieces, drop a bomb and confirm the bomb visibly falls, hits, and triggers a geometric blast instead of text boxes.
- On a touchscreen in Simultaneous Planning, choose the first player's column and confirm no tapped square remains highlighted when passing to the second player.
- In Simultaneous Planning, choose the same column for both players and confirm the coin overlay plays first, then fades before both pieces fall.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node targeted Connect Four Plus smoke test covering remaining mode initialization, removed-mode absence, 3x3 bomb blast metadata, and same-column Column Battle metadata.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Bomb Blast and Mode Trim

- Changed Bomb Pieces from cross-shaped clearing to a full 3x3 blast centered on the bomb placement.
- The bomb now removes every occupied square in that 3x3 area, including the bomb itself, then collapses the remaining pieces.
- Updated Bomb Pieces rules/tool text to describe the 3x3 blast behavior.
- Removed Puzzle Campaign, Shadow Connect, and Powerups plus Fog from the Connect Four Plus mode picker.
- Updated Connect Four Plus library/mode copy so it no longer advertises removed fog or puzzle variants.

What to test:
- In Bomb Pieces, place a bomb into a surrounded square and confirm the center plus all eight touching squares are destroyed before pieces fall.
- Open the Connect Four Plus mode picker and confirm Puzzle Campaign, Shadow Connect, and Powerups plus Fog are gone.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node targeted Connect Four Plus smoke test covering remaining mode initialization, removed-mode absence, 3x3 bomb blast removal by piece ID, same-column Column Battle resolution, and winning-line final-piece metadata.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Interaction and Win Polish

- Made Connect Four Plus top powerup summary chips clickable for the active player; selected chips pulse and clicking the selected chip cancels the pending tool.
- Fixed Bomb Pieces resolution so adjacent cleared pieces are explicitly tracked, removed, and the bomb's final collapsed position is recorded for animation.
- Added Connect Four Plus win banners above the board, end-of-game New Game/Change Game actions, and pulsing winning discs that continue pulsing after the final dropping piece lands.
- Added Ultimate Tic Tac Toe win banners, end-of-game New Game/Change Game actions, and pulsing large-board owner marks on the winning line.
- Updated Simultaneous Planning so both resolved pieces animate, and same-column selections trigger a Column Battle coin flip that randomly decides which color drops first.
- Added a visible lock marker to locked top drop boxes while the active player is blocked from that column.
- Changed the Connect Four Plus mode selector to scroll with the page instead of using an internal card scroller, and replaced the clipped Bauhaus shape row with red/yellow falling discs.

What to test:
- In a powerup mode, click a small top powerup chip to activate it, confirm it pulses, click it again to cancel, then use it normally on the board.
- In Bomb Pieces, drop a bomb beside pieces and above a support piece; adjacent pieces should disappear and the bomb should settle into its final space.
- In Simultaneous Planning, choose the same column for both players and confirm the Column Battle overlay appears, the winner drops first, and both discs fall.
- Win a Connect Four Plus game and confirm the banner appears, both end actions are below it, and all winning discs pulse after the final piece lands.
- Win Ultimate Tic Tac Toe and confirm the large-board winning marks pulse with a winner banner above the board.
- In Column Locks, lock a column and confirm the active opponent sees a lock marker in that top drop box.
- On the Connect Four Plus mode select screen, scroll down and confirm the Choose Mode panel scrolls away with the mode cards.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- `node --check games/ultimate-tic-tac-toe/ui.js`
- `node --check library/app.js`
- Node targeted Connect Four Plus smoke test covering all mode initialization, bomb clears, bomb collapse, same-column Column Battle resolution, simultaneous drop animation metadata, and winning-line final-piece metadata.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Animation Layering

- Fixed falling and gravity-shifting Connect Four Plus discs painting behind neighboring white board cells.
- Marked animated disc cells as a higher board layer while the animation runs.
- Explicitly allowed animated discs to overflow their cell so side-gravity and gravity-rotation movement stays visible.

What to test:
- In Gravity Connect, rotate gravity and confirm shifting pieces appear above the white grid cells while they move.
- Drop pieces after gravity rotates left/right/up and confirm the incoming piece stays visible above the board cells.
- Confirm normal Connect Four Plus drops still render above the grid.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node smoke test across all 14 Connect Four Plus modes.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Drop Animation Polish

- Reworked the single-piece Connect Four Plus drop animation from a fixed fast `280ms` movement to a distance-based duration.
- Added acceleration, impact overshoot, recoil, and final settle keyframes so drops feel less choppy and more weighty.
- Kept gravity-mode entry direction support so pieces still enter from the current gravity's opposite edge.

What to test:
- Drop a piece into an empty column and confirm it falls more smoothly with a visible bounce.
- Drop pieces after Gravity Connect rotates and confirm the slower bounce still comes from the correct edge.
- Confirm short drops near the entry edge still feel responsive.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node smoke test across all 14 Connect Four Plus modes.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Gravity Connect Collapse Animation

- Added piece IDs and gravity-shift metadata so Gravity Connect can animate every moved piece after gravity rotates.
- Added a slow accelerating collapse animation for all pieces that slide into new positions when gravity changes.
- Kept new-piece entry animation aligned with the current gravity direction: left gravity enters from the right, up gravity enters from the bottom, right gravity enters from the left, and down gravity enters from the top.

What to test:
- In Gravity Connect, play until the sixth turn triggers a gravity rotation.
- Confirm all shifted pieces animate slowly at first, accelerate, and settle into the new gravity position.
- After rotation, place a new piece and confirm it enters from the current gravity's opposite edge.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node gravity-shift test confirming moved pieces are recorded after rotation.
- Node entry-side metadata test for all four gravity directions.
- Node smoke test across all 14 Connect Four Plus modes.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Token Hunt Hidden Tokens

- Reworked Token Hunt token placement from three public tokens to fifteen randomly placed tokens.
- Enforced no more than three tokens per row during random placement.
- Made all tokens hidden except one visible token placed at least three rows above the bottom.
- Added non-blocking hidden-token discovery animation that runs for about three seconds while the next turn can proceed.
- Stopped Token Hunt from respawning public replacement tokens after collection.

What to test:
- Start Token Hunt and confirm only one token is visible on the board.
- Play into a hidden token location during testing and confirm a `TOKEN FOUND` animation appears without blocking the next turn.
- Confirm collected tokens grant powerups and disappear from the hidden token pool.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node token placement constraints: 15 tokens, one visible, no more than three per row, visible token at least three rows up.
- Node hidden-token collection test confirming reveal metadata is set and turn advances.
- Node smoke test across all 14 Connect Four Plus modes.

Manual browser verification was not run in this pass.

## 2026-05-10 - Gravity Connect Directional Drops

- Updated Gravity Connect so gravity direction changes the playable entry lanes: columns for up/down gravity and rows for left/right gravity.
- New pieces now enter from the opposite side of the active gravity direction, such as right-side entry when gravity pulls left and bottom entry when gravity pulls up.
- Added continuous particle-flow animation over the Gravity Connect board to show the current pull direction.
- Updated drop animation so new pieces visually come from the correct entry edge after gravity rotates.

What to test:
- Start Gravity Connect and confirm particles flow downward at the start.
- Play six turns, confirm gravity rotates left, particles flow left, and row buttons appear.
- After gravity rotates left, play a row and confirm the new piece enters from the right and settles toward the left.
- Continue rotations and confirm up gravity uses bottom entry and right gravity uses left entry.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node isolated direction tests for down, left, up, and right gravity entries.
- Node rotation test confirming lane controls switch after gravity rotates.
- Node smoke test across all 14 Connect Four Plus modes.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Board Powerup Strip

- Added a compact powerup/tool summary strip above the Connect Four Plus board.
- The strip shows both players by name with their current powerups and remaining special tools.
- Kept the existing detailed active-player tools panel in place.
- Updated the board panel background so it switches between red and yellow based on the active player.

What to test:
- Start Power Duel and confirm the board panel shows both players' powerups above the column buttons and board.
- Use or cancel a powerup and confirm the compact strip updates with the changed hand.
- Make a move and confirm the board panel background changes to the next player's color.

Verification:
- `node --check games/connect-four-plus/ui.js`
- `node --check games/connect-four-plus/logic.js`
- Node smoke test across all 14 Connect Four Plus modes.
- `git diff --check`

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Tool Priority And Cancel Flow

- Reordered the Connect Four Plus play layout so the board and mode tools/powerups appear before the turn system.
- Moved the `Cancel Tool` control into the tools panel, closer to selected powerups.
- Tightened tool selection so selected powerups and special tools must be used or canceled before a normal move or another tool can be selected.
- Fixed Lock so it blocks only the opponent's next turn and no longer blocks the player who placed it.

What to test:
- Start Power Duel and confirm the powerups/tools panel appears above the turn system.
- Select a Power Duel powerup and confirm normal drops are blocked until the power is used or `Cancel Tool` is pressed.
- Select Bomb or Wild mode tools and confirm clicking the selected tool again does not return to a normal move.
- Use Lock, then confirm the locking player can still play that column while the opponent cannot on their next turn.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node guard test for selected powerups, canceling, and selected special tools.
- Node guard test confirming Lock affects the opponent only and expires after that opponent turn.
- Node smoke test across all 14 Connect Four Plus modes.

Manual browser verification was not run in this pass.

## 2026-05-10 - Connect Four Plus Variant Picker

- Reworked Connect Four Plus from a single Power Duel session into an in-game variant picker with 14 selectable modes from the rules PDF.
- Added playable mode state for Power Duel, Draft Duel, Shadow Connect, Powerups plus Fog, Gravity Connect, Bomb Pieces, Wild Pieces, Column Locks, Shrinking Board, Connect 5, Token Hunt, Hidden Objectives, Puzzle Campaign, and Simultaneous Planning.
- Limited private handoff screens to fog-based modes only; non-fog variants now launch directly into the public board view.
- Updated the Bauhaus game UI for variable board sizes, mode-specific tools, removed columns, mystery fog pieces, wild/bomb pieces, public tokens, mode rules, and mode-aware local stats.

What to test:
- Launch Connect Four Plus and confirm it opens to the mode picker.
- Start Power Duel or another non-fog variant and confirm no private handoff screen appears.
- Start Shadow Connect or Powerups plus Fog and confirm the fog handoff screen appears between turns.
- Try 9-column modes like Shrinking Board or Connect 5 and confirm the board remains playable.

Verification:
- `node --check games/connect-four-plus/logic.js`
- `node --check games/connect-four-plus/ui.js`
- Node smoke test across all 14 modes, including simultaneous planning and column 1 selection.
- Node registration check confirmed Connect Four Plus registers with 14 modes.

Manual browser verification was not run in this pass.

## 2026-05-10 - Prevent Homepage Title Clipping

- Fixed the library/game-info header layout so the top-right controls no longer reduce the title column width.
- Forced the homepage title to wrap by word width, preventing the `CHURCH` line from being clipped at intermediate screen widths.
- Preserved the compact top-right Settings control behavior.

What to test:
- Resize the homepage through tablet/intermediate widths and confirm `CHURCH` is fully visible.
- Confirm Settings and the status chip still sit at the top right.
- Confirm game info headers still show their title and controls correctly.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Game Card Logo Spacing

- Fixed main-page game card logos overlapping the title at narrow widths.
- Kept card logos in a dedicated left column on mobile and reduced their mobile size.
- Increased the card logo/text gap for clearer separation.

What to test:
- Load the main page on a narrow/mobile viewport and confirm logos no longer cross into game titles.
- Confirm desktop card logo alignment still looks balanced.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Game Logos In Library And Info

- Added reusable game logo rendering in the library app.
- Added custom CSS-built logos for Ultimate Tic Tac Toe and Connect Four Plus.
- Updated main-page game cards to show the game logo next to title/details.
- Updated game info pages to show a larger game logo beside the title/description.
- Added a fallback initials logo for future registered games without custom logo art.

What to test:
- Load the main page and confirm each game card has a game-specific logo.
- Open Ultimate Tic Tac Toe info and confirm it shows the terminal grid-style logo.
- Open Connect Four Plus info and confirm it shows the token/power-style logo.
- Confirm game card clicks and Play/Back controls still work.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Compact Library Settings Control

- Added an active-view body hook so library-mode styling can distinguish the main menu, game info, and settings views.
- Made the header Settings control a small gear icon at the top right on the main page and game info pages.
- Left the Settings page header behavior unchanged.

What to test:
- On the main page, confirm Settings is a small gear in the top-right header area.
- Open any game info page and confirm Settings remains a small gear in the top-right header area.
- Open Settings and confirm the page still works normally.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Game Info Action Order

- Reordered the game info page actions so `Play` appears above `Back`.
- Added scoped game-info action styling so `Back` is smaller than the primary `Play` button without affecting Settings.

What to test:
- Click a game card and confirm the game info page shows `Play` above `Back`.
- Confirm `Back` is visibly smaller than `Play`.
- Confirm the Settings Back button still uses its normal size.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

## 2026-05-10 - Move App Stats Into Settings

- Removed the full `launcher.status` stats panel from the homepage so the main library view starts with the game library.
- Added a clickable `App stats` item in Settings that expands to show the moved launcher/status readouts.
- Updated the app stats rendering so game count, storage status, and last played are populated from the Settings panel instead of the homepage.
- Adjusted the homepage grid to a single-column library layout and added styling for the new Settings stats row/panel.

What to test:
- Load the homepage and confirm the `launcher.status` section is gone from the main page.
- Open Settings, click `App stats`, and confirm the stats section opens with games, storage, and last played.
- Click `App stats` again and confirm the stats section collapses.
- Confirm game cards still open their game info pages.

Verification:
- `node --check library/app.js`

Manual browser verification was not run in this pass.

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
