(function bootGameLibrary(global) {
  "use strict";

  var STORAGE_PREFIX = "boredAtChurchGames.";
  var DEFAULT_SETTINGS = {
    scanlines: true,
    rememberNames: true
  };

  var registry = global.ChurchGames || { games: [] };
  var games = registry.games.slice().sort(function (a, b) {
    return (a.sortOrder || 100) - (b.sortOrder || 100);
  });
  var views = {
    menu: document.getElementById("menu-view"),
    detail: document.getElementById("detail-view"),
    settings: document.getElementById("settings-view"),
    game: document.getElementById("game-view")
  };
  var els = {
    body: document.body,
    appTitle: document.getElementById("app-title"),
    appSubtitle: document.getElementById("app-subtitle"),
    shellCommand: document.getElementById("shell-command"),
    sessionChip: document.getElementById("session-chip"),
    crtOverlay: document.getElementById("crt-overlay"),
    headerSettings: document.getElementById("header-settings"),
    gameCount: document.getElementById("game-count"),
    storageStatus: document.getElementById("storage-status"),
    lastPlayed: document.getElementById("last-played"),
    gameList: document.getElementById("game-list"),
    backToMenu: document.getElementById("back-to-menu"),
    playGame: document.getElementById("play-game"),
    detailCommand: document.getElementById("detail-command"),
    detailLogo: document.getElementById("detail-logo"),
    detailTitle: document.getElementById("detail-title"),
    detailDescription: document.getElementById("detail-description"),
    detailMeta: document.getElementById("detail-meta"),
    detailRules: document.getElementById("detail-rules"),
    leaderboardBody: document.getElementById("leaderboard-body"),
    settingsBack: document.getElementById("settings-back"),
    settingScanlines: document.getElementById("setting-scanlines"),
    settingRememberNames: document.getElementById("setting-remember-names"),
    openAppStats: document.getElementById("open-app-stats"),
    appStatsPanel: document.getElementById("app-stats-panel"),
    clearDeviceData: document.getElementById("clear-device-data"),
    gameBack: document.getElementById("game-back"),
    gameLibrary: document.getElementById("game-library"),
    gameRoot: document.getElementById("game-root")
  };
  var storageAvailable = canUseStorage();
  var settings = loadSettings();
  var activeGameId = games[0] ? games[0].id : null;
  var currentView = "menu";
  var previousView = "menu";
  var activeController = null;
  var activeMountedGameId = null;
  var appStatsOpen = false;

  function canUseStorage() {
    var testKey = STORAGE_PREFIX + "storage-test";

    try {
      global.localStorage.setItem(testKey, "1");
      global.localStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  function storageKey(key) {
    return STORAGE_PREFIX + key;
  }

  function readJSON(key, fallback) {
    var raw;

    if (!storageAvailable) {
      return fallback;
    }

    try {
      raw = global.localStorage.getItem(storageKey(key));
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    if (!storageAvailable) {
      return false;
    }

    try {
      global.localStorage.setItem(storageKey(key), JSON.stringify(value));
      return true;
    } catch (error) {
      return false;
    }
  }

  function removeStorage(key) {
    if (!storageAvailable) {
      return;
    }

    try {
      global.localStorage.removeItem(storageKey(key));
    } catch (error) {
      // Local storage is optional for the app shell.
    }
  }

  function loadSettings() {
    return Object.assign({}, DEFAULT_SETTINGS, readJSON("settings", {}));
  }

  function saveSettings() {
    writeJSON("settings", settings);
  }

  function getStats(gameId) {
    return readJSON("stats." + gameId, null);
  }

  function saveStats(gameId, stats) {
    return writeJSON("stats." + gameId, stats);
  }

  function getPlayerNames(gameId) {
    var saved = readJSON("players." + gameId, {});

    return saved && typeof saved === "object" ? saved : {};
  }

  function savePlayerNames(gameId, names) {
    if (settings.rememberNames) {
      return writeJSON("players." + gameId, names);
    }

    return false;
  }

  function getGame(gameId) {
    return games.find(function (game) {
      return game.id === gameId;
    }) || games[0] || null;
  }

  function createReadout(term, value) {
    var wrapper = document.createElement("div");
    var dt = document.createElement("dt");
    var dd = document.createElement("dd");

    dt.textContent = term;
    dd.textContent = value;
    wrapper.append(dt, dd);

    return wrapper;
  }

  function createCell(text) {
    var cell = document.createElement("span");
    cell.textContent = text;
    return cell;
  }

  function createGameLogo(game, variant) {
    var logo = document.createElement("span");
    var id = game && game.id ? game.id : "fallback";

    logo.className = "game-logo game-logo-" + id + " game-logo-" + (variant || "card");
    logo.setAttribute("aria-hidden", "true");

    if (id === "ultimate-tic-tac-toe") {
      renderUltimateLogo(logo);
    } else if (id === "connect-four-plus") {
      renderConnectFourLogo(logo);
    } else {
      logo.classList.add("game-logo-fallback");
      logo.textContent = getGameInitials(game ? game.title : "Game");
    }

    return logo;
  }

  function renderUltimateLogo(logo) {
    var marks = ["X", "", "O", "", "X", "", "O", "", "X"];

    marks.forEach(function (mark) {
      var cell = document.createElement("span");

      cell.className = "logo-cell";
      if (mark) {
        cell.classList.add(mark === "X" ? "is-x" : "is-o");
        cell.textContent = mark;
      }
      logo.appendChild(cell);
    });
  }

  function renderConnectFourLogo(logo) {
    var tokens = ["", "", "R", "", "", "Y", "R", "", "Y", "R", "Y", "", "R", "Y", "R", "P"];

    tokens.forEach(function (token) {
      var cell = document.createElement("span");

      cell.className = "logo-token";
      if (token === "R") {
        cell.classList.add("is-red");
      } else if (token === "Y") {
        cell.classList.add("is-yellow");
      } else if (token === "P") {
        cell.classList.add("is-power");
      }
      logo.appendChild(cell);
    });
  }

  function getGameInitials(title) {
    return title.split(/\s+/).filter(Boolean).slice(0, 2).map(function (word) {
      return word.charAt(0);
    }).join("").toUpperCase() || "?";
  }

  function formatDateTime(value) {
    if (!value) {
      return "NONE";
    }

    return new Date(value).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit"
    });
  }

  function formatPercent(wins, gamesPlayed) {
    if (!gamesPlayed) {
      return "0%";
    }

    return Math.round((wins / gamesPlayed) * 100) + "%";
  }

  function setCommand(text) {
    var cursor = document.createElement("span");

    els.shellCommand.textContent = text;
    cursor.className = "cursor";
    cursor.textContent = "_";
    els.shellCommand.appendChild(cursor);
  }

  function setMode(viewName) {
    els.body.classList.toggle("game-mode", viewName === "game");
    els.body.classList.toggle("library-mode", viewName !== "game");
    els.body.dataset.activeView = viewName;
    els.body.dataset.activeGame = viewName === "game" ? activeGameId || "" : "";
  }

  function scrollToTop() {
    if (typeof global.scrollTo !== "function") {
      return;
    }

    global.requestAnimationFrame(function () {
      global.scrollTo({
        top: 0,
        left: 0,
        behavior: "auto"
      });
    });
  }

  function updateHeader() {
    var activeGame = getGame(activeGameId);

    if (currentView === "game" && activeGame) {
      els.appTitle.textContent = activeGame.title;
      els.appSubtitle.textContent = activeGame.themeLabel || "Game session";
      setCommand("> " + activeGame.command);
      els.sessionChip.textContent = "SESSION: ACTIVE";
      return;
    }

    if (currentView === "detail" && activeGame) {
      els.appTitle.textContent = activeGame.title;
      els.appSubtitle.textContent = activeGame.description;
      setCommand("> " + activeGame.command + " --about");
      els.sessionChip.textContent = "INFO: READY";
      return;
    }

    if (currentView === "settings") {
      els.appTitle.textContent = "Settings";
      els.appSubtitle.textContent = "Local device options for the library and games.";
      setCommand("> library.boot --settings");
      els.sessionChip.textContent = "CONFIG: OPEN";
      return;
    }

    els.appTitle.textContent = "Bored at Church Games";
    els.appSubtitle.textContent = "A local web arcade for quick strategy games.";
    setCommand("> library.boot --select");
    els.sessionChip.textContent = "LIBRARY: READY";
  }

  function showView(name) {
    Object.keys(views).forEach(function (viewName) {
      views[viewName].hidden = viewName !== name;
    });

    currentView = name;
    setMode(name);
    updateHeader();

    if (name === "menu") {
      renderMenu();
    } else if (name === "detail") {
      renderDetail();
    } else if (name === "settings") {
      renderSettings();
    } else if (name === "game") {
      mountActiveGame();
    }

    scrollToTop();
  }

  function openSettingsView() {
    previousView = currentView === "settings" ? "menu" : currentView;
    showView("settings");
  }

  function applySettings() {
    els.crtOverlay.hidden = !settings.scanlines;
    els.settingScanlines.checked = settings.scanlines;
    els.settingRememberNames.checked = settings.rememberNames;
  }

  function getMostRecentPlay() {
    return games.reduce(function (latest, game) {
      var stats = getStats(game.id);
      var lastPlayedAt = stats && stats.lastPlayedAt;

      if (!lastPlayedAt) {
        return latest;
      }

      return !latest || new Date(lastPlayedAt) > new Date(latest) ? lastPlayedAt : latest;
    }, null);
  }

  function renderMenu() {
    var fragment = document.createDocumentFragment();

    els.gameList.replaceChildren();

    if (!games.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No games are registered yet.";
      els.gameList.appendChild(empty);
      return;
    }

    games.forEach(function (game) {
      var stats = getStats(game.id);
      var card = document.createElement("button");
      var body = document.createElement("span");
      var title = document.createElement("span");
      var description = document.createElement("span");
      var meta = document.createElement("span");
      var metrics = document.createElement("span");

      card.type = "button";
      card.className = "game-card";
      card.dataset.gameId = game.id;
      card.setAttribute("role", "listitem");

      body.className = "game-card-body";

      title.className = "game-card-title";
      title.textContent = game.title;

      description.className = "game-card-description";
      description.textContent = game.description;

      meta.className = "game-card-meta";
      meta.textContent = "[" + game.status + "] " + game.players + " | " + game.duration + " | " + game.type;

      metrics.className = "game-card-metrics";
      metrics.textContent = game.getLibraryMetrics ? game.getLibraryMetrics(stats) : "matches:" + ((stats && stats.matches) || 0);

      body.append(title, description, meta, metrics);
      card.append(createGameLogo(game, "card"), body);
      fragment.appendChild(card);
    });

    els.gameList.appendChild(fragment);
  }

  function renderDetail() {
    var activeGame = getGame(activeGameId);
    var rulesFragment = document.createDocumentFragment();
    var meta;

    if (!activeGame) {
      return;
    }

    meta = [
      ["status", activeGame.status.toUpperCase()],
      ["players", activeGame.players],
      ["duration", activeGame.duration],
      ["type", activeGame.type],
      ["theme", activeGame.themeLabel || "custom"]
    ];

    els.detailCommand.textContent = "> " + activeGame.command + " --about";
    els.detailLogo.replaceChildren(createGameLogo(activeGame, "detail"));
    els.detailTitle.textContent = activeGame.title;
    els.detailDescription.textContent = activeGame.description;
    els.detailMeta.replaceChildren();
    els.detailRules.replaceChildren();

    meta.forEach(function (item) {
      els.detailMeta.appendChild(createReadout(item[0], item[1]));
    });

    activeGame.rules.forEach(function (rule) {
      var li = document.createElement("li");
      li.textContent = rule;
      rulesFragment.appendChild(li);
    });

    els.detailRules.appendChild(rulesFragment);
    renderLeaderboard(activeGame);
  }

  function renderLeaderboard(activeGame) {
    var stats = getStats(activeGame.id);
    var helpers = {
      createReadout: createReadout,
      createCell: createCell,
      formatDateTime: formatDateTime,
      formatPercent: formatPercent
    };

    els.leaderboardBody.replaceChildren();

    if (activeGame.renderLeaderboard) {
      activeGame.renderLeaderboard(els.leaderboardBody, stats, helpers);
      return;
    }

    els.leaderboardBody.appendChild(createReadout("matches", String((stats && stats.matches) || 0)));
  }

  function renderSettings() {
    applySettings();
    renderAppStats();
    syncAppStatsPanel();
  }

  function renderAppStats() {
    els.gameCount.textContent = String(games.length);
    els.storageStatus.textContent = storageAvailable ? "LOCAL" : "OFF";
    els.lastPlayed.textContent = formatDateTime(getMostRecentPlay());
  }

  function syncAppStatsPanel() {
    var action = els.openAppStats.querySelector(".settings-row-action");

    els.appStatsPanel.hidden = !appStatsOpen;
    els.openAppStats.setAttribute("aria-expanded", appStatsOpen ? "true" : "false");
    if (action) {
      action.textContent = appStatsOpen ? "Hide" : "View";
    }
  }

  function mountActiveGame() {
    var activeGame = getGame(activeGameId);
    var services;

    if (!activeGame || !activeGame.createController) {
      els.gameRoot.textContent = "Selected game cannot be launched.";
      return;
    }

    if (activeMountedGameId !== activeGame.id) {
      els.gameRoot.replaceChildren();
      activeController = null;
      activeMountedGameId = activeGame.id;
    }

    if (!activeController) {
      services = {
        getSetting: function (name) {
          return settings[name];
        },
        getStats: getStats,
        saveStats: saveStats,
        getPlayerNames: getPlayerNames,
        savePlayerNames: savePlayerNames,
        storageAvailable: function () {
          return storageAvailable;
        },
        setSessionChip: function (text) {
          els.sessionChip.textContent = text;
        },
        refreshLibraryStats: function () {
          renderMenu();
        },
        scrollToTop: scrollToTop
      };
      activeController = activeGame.createController({
        root: els.gameRoot,
        services: services
      });
    }

    activeController.mount();
    if (activeController.getSessionChip) {
      els.sessionChip.textContent = activeController.getSessionChip();
    }
  }

  els.headerSettings.addEventListener("click", openSettingsView);

  els.openAppStats.addEventListener("click", function () {
    appStatsOpen = !appStatsOpen;
    renderAppStats();
    syncAppStatsPanel();
  });

  els.gameList.addEventListener("click", function (event) {
    var card;

    if (!(event.target instanceof Element)) {
      return;
    }

    card = event.target.closest(".game-card");

    if (!card) {
      return;
    }

    activeGameId = card.dataset.gameId;
    showView("detail");
  });

  els.backToMenu.addEventListener("click", function () {
    showView("menu");
  });

  els.playGame.addEventListener("click", function () {
    showView("game");
  });

  els.gameBack.addEventListener("click", function () {
    showView("detail");
  });

  els.gameLibrary.addEventListener("click", function () {
    showView("menu");
  });

  els.settingsBack.addEventListener("click", function () {
    showView(previousView || "menu");
  });

  els.settingScanlines.addEventListener("change", function () {
    settings.scanlines = els.settingScanlines.checked;
    applySettings();
    saveSettings();
    renderMenu();
  });

  els.settingRememberNames.addEventListener("change", function () {
    settings.rememberNames = els.settingRememberNames.checked;

    if (!settings.rememberNames) {
      games.forEach(function (game) {
        removeStorage("players." + game.id);
      });
    }

    saveSettings();
    renderMenu();
  });

  els.clearDeviceData.addEventListener("click", function () {
    if (!global.confirm("Clear local leaderboards, player names, and settings for this browser?")) {
      return;
    }

    removeStorage("settings");
    games.forEach(function (game) {
      removeStorage("players." + game.id);
      removeStorage("stats." + game.id);
    });
    settings = Object.assign({}, DEFAULT_SETTINGS);
    activeController = null;
    activeMountedGameId = null;
    els.gameRoot.replaceChildren();
    applySettings();
    renderSettings();
    renderMenu();
  });

  applySettings();
  showView("menu");
})(window);
