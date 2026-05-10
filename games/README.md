# Game Module Layout

Each game should live in its own folder:

```text
games/
  game-id/
    logic.js      # Game rules/state engine, if needed
    ui.js         # Registers the game with window.ChurchGames.registerGame(...)
    style.css     # Game-specific visual design
```

The library shell loads registered games and renders the picker, about page, settings, and leaderboard. A game module owns its own play screen and can choose its own visual style without changing the library files.

To add a game:

1. Create a new `games/<game-id>/` folder.
2. Add the game scripts and CSS.
3. Include those files in `index.html`.
4. In the game UI file, call `window.ChurchGames.registerGame({ ... })` with metadata, rules, optional leaderboard renderer, and `createController`.

This keeps the app deployable as a static Vercel app without a build step.
