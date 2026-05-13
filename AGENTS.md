# Bored at Church Games -- Agent Workflow Instructions

## Project Overview
This is a static web arcade ("Bored at Church Games") deployed to Vercel with no build step. Games are modular -- each lives in its own folder under `games/` and self-registers via `window.ChurchGames.registerGame(...)`. The library shell (`library/`, `index.html`, `styles.css`) handles navigation, settings, leaderboard, and the game picker.

## Architecture Rules
- Every game is a self-contained module in `games/<game-id>/` with its own `logic.js`, `ui.js`, and CSS. Games must not modify library files to function.
- The app must remain a zero-build-step static site. No bundlers, no transpilers, no server-side rendering. Vanilla JS, HTML, and CSS only.
- All game registration happens through `window.ChurchGames.registerGame({ ... })` in the game's `ui.js`. See `games/README.md` for the required shape.
- Design docs in `design/` describe the visual language (vaporwave + terminal aesthetic). New games should respect the overall theme but may introduce their own CSS within their game folder.
- Do not expose design-system or visual style labels in user-facing game or library UI. Do not render labels like "Bauhaus", "Terminal CLI", "Minimalist Monochrome", design document names, or `themeLabel` values to players; use design direction internally through scoped CSS and keep visible metadata focused on gameplay.
- Game rule references (PDFs, markdown) go in `game_rules/`.

## Before Starting Work
- Review `WORK_HISTORY.md` (if it exists) to understand previous work, verification results, known limitations, and recommended follow-ups.
- Review `games/README.md` for the game module contract.
- Review `design/terminal_design.md` and `design/vaporwave_design.md` for the visual design system.
- If the task involves an existing game, read that game's folder contents before making changes.

## Adding a New Game
When the user asks to add a new game, follow this sequence:

1. Create `games/<game-id>/` with `logic.js`, `ui.js`, and a CSS file.
2. Implement game logic in `logic.js` -- pure state engine, no DOM access.
3. Implement the UI in `ui.js` -- call `window.ChurchGames.registerGame(...)` with metadata (id, title, subtitle, minPlayers, maxPlayers, rules, createController).
4. Add game-specific styles in the CSS file, scoped to avoid leaking into the library or other games.
5. Add `<script>` and `<link>` tags for the new game files in `index.html`.
6. If reference rules exist (PDF, image, etc.), place them in `game_rules/`.
7. Test the full flow: library loads, game appears in picker, game launches, gameplay works, returning to library works.

## Work Tracking
- During a pass, keep track of notable actions, decisions, manual checks, verification commands, commits, and unresolved limitations.
- At the end of each pass, update `WORK_HISTORY.md` with a concise entry (newest at top). Include commit hash/status when available.
- In the final console response, include what was committed: commit hash, commit message, and the committed files or key changes.
- Each `WORK_HISTORY.md` entry should state:
  - Which goal(s) were accomplished.
  - What the user can test afterward (behavior checks, UI checks, specific game interactions).
  - Any known limitations or follow-up items.
- If work is investigative only and does not produce a commit, still add a `WORK_HISTORY.md` entry when the investigation changes project understanding or next-step recommendations.

## Commits and Pushes
- Commit all changes from each implementation pass before the final response unless the user explicitly asks not to commit.
- Commit all major changes with clear messages explaining what changed, why, and how it was verified.
- Keep commits scoped to coherent units. Do not mix unrelated changes (e.g., don't bundle a new game with an unrelated library refactor).
- Before committing, open `index.html` in a browser or otherwise verify the game loads and plays correctly, or document why verification could not be run.
- At the end of each implementation pass, ask the user whether they want to push to origin.
- Only push to origin when the user explicitly says to push.

## Code Style
- No frameworks, no build tools. Plain JS with `"use strict"` in IIFEs.
- CSS scoped per game (use a game-specific class prefix or wrapper selector).
- Keep the library shell generic -- it should not contain game-specific logic.
- Favor readability over cleverness. Someone picking this up cold should understand the game logic quickly.

## Testing and Verification
- After adding or modifying a game, verify: the library picker shows the game, the game launches, core gameplay mechanics work, and the user can return to the library.
- Note any browser-specific quirks or mobile responsiveness issues encountered.
- In the final response after every pass, summarize what was accomplished and what the user can test now.
