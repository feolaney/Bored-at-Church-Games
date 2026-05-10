(function attachChurchGamesRegistry(global) {
  "use strict";

  var registry = global.ChurchGames || {};

  registry.games = Array.isArray(registry.games) ? registry.games : [];

  registry.registerGame = function registerGame(gameDefinition) {
    if (!gameDefinition || !gameDefinition.id) {
      throw new Error("Game registrations require an id.");
    }

    registry.games = registry.games.filter(function (game) {
      return game.id !== gameDefinition.id;
    });
    registry.games.push(gameDefinition);
  };

  global.ChurchGames = registry;
})(window);
