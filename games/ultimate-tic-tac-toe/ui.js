(function registerUltimateTicTacToe(global) {
  "use strict";

  var GAME_ID = "ultimate-tic-tac-toe";
  var game = global.UltimateGame;

  function createEmptyStats() {
    return {
      version: 1,
      matches: 0,
      draws: 0,
      totalMoves: 0,
      fastestWinMoves: null,
      lastPlayedAt: null,
      players: {},
      recent: []
    };
  }

  function normalizeStats(rawStats) {
    var stats = Object.assign(createEmptyStats(), rawStats || {});

    stats.matches = Number(stats.matches) || 0;
    stats.draws = Number(stats.draws) || 0;
    stats.totalMoves = Number(stats.totalMoves) || 0;
    stats.fastestWinMoves = stats.fastestWinMoves === null ? null : Number(stats.fastestWinMoves) || null;
    stats.players = stats.players && typeof stats.players === "object" ? stats.players : {};
    stats.recent = Array.isArray(stats.recent) ? stats.recent : [];

    return stats;
  }

  function formatLibraryMetrics(rawStats) {
    var stats = normalizeStats(rawStats);
    return "matches:" + stats.matches + " fastest:" + (stats.fastestWinMoves || "--") + " moves";
  }

  function renderLeaderboard(container, rawStats, helpers) {
    var stats = normalizeStats(rawStats);
    var players = Object.keys(stats.players).map(function (key) {
      return stats.players[key];
    }).sort(function (a, b) {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }
      return b.games - a.games;
    });
    var summary = document.createElement("dl");
    var namedWins = players.reduce(function (sum, player) {
      return sum + (Number(player.wins) || 0);
    }, 0);
    var averageMoves = stats.matches ? Math.round(stats.totalMoves / stats.matches) : "--";

    summary.className = "vapor-readout-grid";
    summary.append(
      helpers.createReadout("matches", String(stats.matches)),
      helpers.createReadout("named wins", String(namedWins)),
      helpers.createReadout("draws", String(stats.draws)),
      helpers.createReadout("fastest win", stats.fastestWinMoves ? stats.fastestWinMoves + " moves" : "--"),
      helpers.createReadout("avg moves", String(averageMoves)),
      helpers.createReadout("last played", helpers.formatDateTime(stats.lastPlayedAt))
    );
    container.appendChild(summary);

    if (!players.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No named player results yet. Add player names before launching a match to save wins on this device.";
      container.appendChild(empty);
    } else {
      container.appendChild(createLeaderboardTable(players, helpers));
    }

    if (stats.recent.length) {
      container.appendChild(createRecentList(stats.recent, helpers));
    }
  }

  function createLeaderboardTable(players, helpers) {
    var table = document.createElement("div");
    var header = document.createElement("div");

    table.className = "leaderboard-table";
    header.className = "leaderboard-row leaderboard-head";
    header.append(
      helpers.createCell("player"),
      helpers.createCell("wins"),
      helpers.createCell("loss"),
      helpers.createCell("draw"),
      helpers.createCell("games"),
      helpers.createCell("rate")
    );
    table.appendChild(header);

    players.forEach(function (player) {
      var row = document.createElement("div");

      row.className = "leaderboard-row";
      row.append(
        helpers.createCell(player.name),
        helpers.createCell(String(player.wins || 0)),
        helpers.createCell(String(player.losses || 0)),
        helpers.createCell(String(player.draws || 0)),
        helpers.createCell(String(player.games || 0)),
        helpers.createCell(helpers.formatPercent(player.wins || 0, player.games || 0))
      );
      table.appendChild(row);
    });

    return table;
  }

  function createRecentList(recentMatches, helpers) {
    var section = document.createElement("section");
    var heading = document.createElement("h2");
    var list = document.createElement("ol");

    heading.textContent = "Recent Matches";
    list.className = "recent-list";

    recentMatches.slice(0, 6).forEach(function (match) {
      var item = document.createElement("li");
      var result = match.result === "draw" ? "DRAW" : match.winnerName + " WON";

      item.textContent = helpers.formatDateTime(match.playedAt) + " | " + result + " | " + match.moves + " moves";
      list.appendChild(item);
    });

    section.append(heading, list);
    return section;
  }

  function createController(options) {
    var root = options.root;
    var services = options.services;
    var state = game.createInitialState();
    var savedNames = services.getPlayerNames(GAME_ID);
    var playerNames = {
      X: typeof savedNames.X === "string" ? savedNames.X : "",
      O: typeof savedNames.O === "string" ? savedNames.O : ""
    };
    var mounted = false;
    var els = {};
    var matchRecorded = false;
    var lastRecordStatus = null;

    function mount() {
      if (!mounted) {
        root.replaceChildren();
        root.appendChild(createMarkup());
        bindElements();
        bindEvents();
        mounted = true;
      }

      render();
    }

    function createMarkup() {
      var wrapper = document.createElement("section");

      wrapper.className = "terminal-game-grid";
      wrapper.setAttribute("aria-label", "Ultimate Tic Tac Toe game");
      wrapper.innerHTML =
        '<aside class="terminal-panel status-panel" aria-labelledby="status-heading">' +
          '<div class="terminal-panel-title" id="status-heading">+-- MATCH STATUS --+</div>' +
          '<div class="terminal-panel-body">' +
            '<p class="terminal-status-line" data-role="status-line" aria-live="polite">X awaiting first move.</p>' +
            '<section class="player-setup" aria-labelledby="players-heading">' +
              '<h2 id="players-heading">players</h2>' +
              '<label class="prompt-field"><span>x_name</span><input type="text" data-role="x-player-name" maxlength="32" autocomplete="off" placeholder="Player X"></label>' +
              '<label class="prompt-field"><span>o_name</span><input type="text" data-role="o-player-name" maxlength="32" autocomplete="off" placeholder="Player O"></label>' +
            '</section>' +
            '<dl class="terminal-readout-grid">' +
              '<div><dt>turn</dt><dd data-role="turn-readout">X</dd></div>' +
              '<div><dt>route</dt><dd data-role="route-readout">FREE</dd></div>' +
              '<div><dt>x_player</dt><dd data-role="x-player-readout">X</dd></div>' +
              '<div><dt>o_player</dt><dd data-role="o-player-readout">O</dd></div>' +
              '<div><dt>x_claim</dt><dd data-role="x-score">0 / 9</dd></div>' +
              '<div><dt>o_claim</dt><dd data-role="o-score">0 / 9</dd></div>' +
            '</dl>' +
            '<div class="bar-group" aria-label="Small board ownership">' +
              '<div><span>X</span><output data-role="x-bar">[.........]</output></div>' +
              '<div><span>O</span><output data-role="o-bar">[.........]</output></div>' +
              '<div><span>D</span><output data-role="d-bar">[.........]</output></div>' +
            '</div>' +
            '<div class="terminal-control-row">' +
              '<button type="button" data-role="new-game">[ NEW GAME ]</button>' +
              '<button type="button" data-role="undo-move">[ UNDO ]</button>' +
            '</div>' +
          '</div>' +
        '</aside>' +
        '<section class="terminal-panel board-panel" aria-labelledby="board-heading">' +
          '<div class="terminal-panel-title" id="board-heading">+-- BOARD MATRIX --+</div>' +
          '<div class="terminal-win-banner" data-role="win-banner" aria-live="polite" hidden></div>' +
          '<div class="terminal-end-actions" data-role="end-actions" hidden>' +
            '<button type="button" data-role="new-game-inline">[ NEW GAME ]</button>' +
            '<button type="button" data-role="change-game">[ CHANGE GAME ]</button>' +
          '</div>' +
          '<div class="board-wrap"><div class="ultimate-board" data-role="ultimate-board" role="group" aria-label="Nine mini tic tac toe boards"></div></div>' +
        '</section>' +
        '<aside class="terminal-panel telemetry-panel" aria-labelledby="telemetry-heading">' +
          '<div class="terminal-panel-title" id="telemetry-heading">+-- TELEMETRY --+</div>' +
          '<div class="terminal-panel-body">' +
            '<section aria-labelledby="ownership-heading">' +
              '<h2 id="ownership-heading">large_board</h2>' +
              '<div class="large-board-map" data-role="large-board-map" aria-label="Large board ownership"></div>' +
            '</section>' +
            '<section aria-labelledby="rules-heading">' +
              '<h2 id="rules-heading">ruleset</h2>' +
              '<ul class="terminal-rules-list">' +
                '<li>X goes first.</li>' +
                '<li>The first move may be anywhere.</li>' +
                '<li>Your square sends the opponent to the matching board.</li>' +
                '<li>Won or drawn boards close immediately.</li>' +
                '<li>A closed target grants a free move.</li>' +
                '<li>Drawn small boards count for neither player.</li>' +
              '</ul>' +
            '</section>' +
            '<section aria-labelledby="log-heading">' +
              '<h2 id="log-heading">move_log</h2>' +
              '<ol class="move-log" data-role="move-log" aria-live="polite"></ol>' +
            '</section>' +
          '</div>' +
        '</aside>';

      return wrapper;
    }

    function bindElements() {
      [
        "status-line",
        "turn-readout",
        "route-readout",
        "x-player-readout",
        "o-player-readout",
        "x-score",
        "o-score",
        "x-bar",
        "o-bar",
        "d-bar",
        "move-log",
        "new-game",
        "undo-move",
        "new-game-inline",
        "change-game",
        "x-player-name",
        "o-player-name",
        "win-banner",
        "end-actions",
        "ultimate-board",
        "large-board-map"
      ].forEach(function (role) {
        els[toCamel(role)] = root.querySelector('[data-role="' + role + '"]');
      });
    }

    function toCamel(value) {
      return value.replace(/-([a-z])/g, function (_, letter) {
        return letter.toUpperCase();
      });
    }

    function bindEvents() {
      els.ultimateBoard.addEventListener("click", function (event) {
        var target = event.target;
        var result;

        if (!(target instanceof HTMLButtonElement) || !target.classList.contains("cell")) {
          return;
        }

        result = game.applyMove(state, Number(target.dataset.board), Number(target.dataset.cell));
        state = result.state;
        maybeRecordMatch();
        render();
      });

      els.newGame.addEventListener("click", resetMatch);
      els.newGameInline.addEventListener("click", resetMatch);
      els.changeGame.addEventListener("click", changeGame);

      els.undoMove.addEventListener("click", function () {
        if (state.winner) {
          return;
        }

        state = game.undoMove(state);
        render();
      });

      els.xPlayerName.addEventListener("input", function () {
        updatePlayerName("X", els.xPlayerName.value);
      });

      els.oPlayerName.addEventListener("input", function () {
        updatePlayerName("O", els.oPlayerName.value);
      });
    }

    function countStatus(status) {
      return state.boardStatus.filter(function (value) {
        return value === status;
      }).length;
    }

    function progressBar(count) {
      return "[" + "|".repeat(count) + ".".repeat(9 - count) + "]";
    }

    function getPlayerName(mark) {
      return (playerNames[mark] || "").trim();
    }

    function getPlayerLabel(mark) {
      var name = getPlayerName(mark);
      return name ? name + " (" + mark + ")" : mark;
    }

    function hasAnyCustomName() {
      return Boolean(getPlayerName("X") || getPlayerName("O"));
    }

    function getRouteText() {
      if (state.winner) {
        return "HALT";
      }

      if (state.nextBoard === null) {
        return "FREE";
      }

      return game.BOARD_LABELS[state.nextBoard];
    }

    function getRecordSuffix() {
      if (lastRecordStatus === "saved") {
        return " Result saved to this device.";
      }

      if (lastRecordStatus === "failed") {
        return " Local storage is unavailable; result was not saved.";
      }

      if (lastRecordStatus === "no_names") {
        return " Add a player name before a match to save stats.";
      }

      return "";
    }

    function getStatusText() {
      var last = state.lastMove;
      var target;

      if (state.lastError) {
        return "[ERR] " + state.lastError;
      }

      if (state.winner === "X" || state.winner === "O") {
        return "[OK] " + getPlayerLabel(state.winner) + " wins the large board." + getRecordSuffix();
      }

      if (state.winner === game.DRAW) {
        return "[OK] Large board draw. No global line completed." + getRecordSuffix();
      }

      if (!last) {
        return "[READY] " + getPlayerLabel("X") + " may open anywhere.";
      }

      target = state.nextBoard === null ? "free move" : game.BOARD_LABELS[state.nextBoard];

      if (last.smallResult === "X" || last.smallResult === "O") {
        return "[OK] " + getPlayerLabel(last.player) + " claimed " + game.BOARD_LABELS[last.boardIndex] + ". " + getPlayerLabel(state.currentPlayer) + " route: " + target + ".";
      }

      if (last.smallResult === game.DRAW) {
        return "[OK] " + game.BOARD_LABELS[last.boardIndex] + " closed as draw. " + getPlayerLabel(state.currentPlayer) + " route: " + target + ".";
      }

      return "[OK] " + getPlayerLabel(last.player) + " sends " + getPlayerLabel(state.currentPlayer) + " to " + target + ".";
    }

    function renderWinBanner() {
      if (state.winner === "X" || state.winner === "O") {
        els.winBanner.hidden = false;
        els.endActions.hidden = false;
        els.winBanner.textContent = getPlayerLabel(state.winner) + " Won!";
        return;
      }

      els.winBanner.hidden = true;
      els.endActions.hidden = true;
      els.winBanner.textContent = "";
    }

    function renderBoard() {
      var legalBoards = game.getLegalBoards(state);
      var free = state.nextBoard === null && !state.winner;
      var fragment = document.createDocumentFragment();

      els.ultimateBoard.replaceChildren();

      state.boards.forEach(function (smallBoard, boardIndex) {
        var mini = document.createElement("section");
        var label = document.createElement("span");
        var owner = state.boardStatus[boardIndex];

        mini.className = "mini-board";
        mini.setAttribute("aria-label", game.BOARD_LABELS[boardIndex] + " mini board");

        if (legalBoards.indexOf(boardIndex) !== -1) {
          mini.classList.add(free ? "is-free" : "is-target");
        }

        if (owner) {
          mini.classList.add("is-closed");
        }

        if (state.winningLine && state.winningLine.indexOf(boardIndex) !== -1) {
          mini.classList.add("is-win-line");
        }

        label.className = "mini-label";
        label.textContent = game.BOARD_LABELS[boardIndex];
        mini.appendChild(label);

        smallBoard.forEach(function (mark, cellIndex) {
          var cell = document.createElement("button");
          var validation = game.validateMove(state, boardIndex, cellIndex);
          var coord = game.BOARD_LABELS[boardIndex] + "-" + (cellIndex + 1);

          cell.type = "button";
          cell.className = "cell";
          cell.dataset.board = String(boardIndex);
          cell.dataset.cell = String(cellIndex);
          cell.textContent = mark || "";
          cell.setAttribute("aria-label", coord + " " + game.CELL_LABELS[cellIndex] + (mark ? " occupied by " + getPlayerLabel(mark) : ""));

          if (mark) {
            cell.classList.add("occupied", mark.toLowerCase());
          }

          if (validation.ok) {
            cell.classList.add("playable");
          } else {
            cell.disabled = true;
          }

          mini.appendChild(cell);
        });

        if (owner) {
          var ownerMark = document.createElement("span");
          ownerMark.className = "owner-mark " + owner.toLowerCase();
          if (state.winningLine && state.winningLine.indexOf(boardIndex) !== -1) {
            ownerMark.classList.add("is-winning-owner");
          }
          ownerMark.textContent = owner;
          mini.appendChild(ownerMark);
        }

        fragment.appendChild(mini);
      });

      els.ultimateBoard.appendChild(fragment);
    }

    function renderLargeBoardMap() {
      var fragment = document.createDocumentFragment();

      els.largeBoardMap.replaceChildren();

      state.boardStatus.forEach(function (owner, index) {
        var cell = document.createElement("div");
        var value = owner || game.BOARD_LABELS[index];

        cell.className = "large-board-cell";
        cell.textContent = value;

        if (owner) {
          cell.classList.add(owner.toLowerCase());
        }

        if (state.winningLine && state.winningLine.indexOf(index) !== -1) {
          cell.classList.add("win");
        }

        fragment.appendChild(cell);
      });

      els.largeBoardMap.appendChild(fragment);
    }

    function renderLog() {
      var fragment = document.createDocumentFragment();
      var entries = state.log.slice().reverse();

      els.moveLog.replaceChildren();

      if (!entries.length) {
        var empty = document.createElement("li");
        empty.className = "empty-log";
        empty.textContent = "awaiting input";
        els.moveLog.appendChild(empty);
        return;
      }

      entries.forEach(function (entry) {
        var item = document.createElement("li");
        item.textContent = entry;
        fragment.appendChild(item);
      });

      els.moveLog.appendChild(fragment);
    }

    function renderStatus() {
      var xCount = countStatus("X");
      var oCount = countStatus("O");
      var dCount = countStatus(game.DRAW);
      var namesLocked = state.moveCount > 0;

      els.statusLine.classList.toggle("error", Boolean(state.lastError));
      els.statusLine.textContent = getStatusText();
      els.turnReadout.textContent = state.winner ? "ENDED" : getPlayerLabel(state.currentPlayer);
      els.routeReadout.textContent = getRouteText();
      els.xPlayerReadout.textContent = getPlayerLabel("X");
      els.oPlayerReadout.textContent = getPlayerLabel("O");
      els.xScore.textContent = xCount + " / 9";
      els.oScore.textContent = oCount + " / 9";
      els.xBar.textContent = progressBar(xCount);
      els.oBar.textContent = progressBar(oCount);
      els.dBar.textContent = progressBar(dCount);
      els.undoMove.disabled = state.history.length === 0 || Boolean(state.winner);
      els.xPlayerName.disabled = namesLocked;
      els.oPlayerName.disabled = namesLocked;

      if (services.setSessionChip) {
        services.setSessionChip(state.winner ? "SESSION: COMPLETE" : "SESSION: ACTIVE");
      }
    }

    function render() {
      syncPlayerInputs();
      renderStatus();
      renderWinBanner();
      renderBoard();
      renderLargeBoardMap();
      renderLog();
    }

    function syncPlayerInputs() {
      if (els.xPlayerName.value !== playerNames.X) {
        els.xPlayerName.value = playerNames.X;
      }

      if (els.oPlayerName.value !== playerNames.O) {
        els.oPlayerName.value = playerNames.O;
      }
    }

    function normalizeNameKey(name) {
      return name.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function movesForPlayer(mark) {
      return mark === "X" ? Math.ceil(state.moveCount / 2) : Math.floor(state.moveCount / 2);
    }

    function updatePlayerStats(stats, mark, now) {
      var name = getPlayerName(mark);
      var key;
      var player;

      if (!name) {
        return;
      }

      key = normalizeNameKey(name);
      player = Object.assign({
        name: name,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalMoves: 0,
        lastPlayedAt: null,
        lastWonAt: null
      }, stats.players[key] || {});

      player.name = name;
      player.games += 1;
      player.totalMoves += movesForPlayer(mark);
      player.lastPlayedAt = now;

      if (state.winner === game.DRAW) {
        player.draws += 1;
      } else if (state.winner === mark) {
        player.wins += 1;
        player.lastWonAt = now;
      } else {
        player.losses += 1;
      }

      stats.players[key] = player;
    }

    function recordMatch() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      var now = new Date().toISOString();
      var winnerName = state.winner === game.DRAW ? "DRAW" : getPlayerName(state.winner) || state.winner;

      stats.matches += 1;
      stats.totalMoves += state.moveCount;
      stats.lastPlayedAt = now;

      if (state.winner === game.DRAW) {
        stats.draws += 1;
      } else if (stats.fastestWinMoves === null || state.moveCount < stats.fastestWinMoves) {
        stats.fastestWinMoves = state.moveCount;
      }

      updatePlayerStats(stats, "X", now);
      updatePlayerStats(stats, "O", now);

      stats.recent.unshift({
        playedAt: now,
        result: state.winner === game.DRAW ? "draw" : "win",
        winnerMark: state.winner,
        winnerName: winnerName,
        xName: getPlayerName("X") || "X",
        oName: getPlayerName("O") || "O",
        moves: state.moveCount,
        xBoards: countStatus("X"),
        oBoards: countStatus("O"),
        drawnBoards: countStatus(game.DRAW)
      });
      stats.recent = stats.recent.slice(0, 12);

      return services.saveStats(GAME_ID, stats);
    }

    function maybeRecordMatch() {
      if (!state.winner || matchRecorded) {
        return;
      }

      if (!hasAnyCustomName()) {
        lastRecordStatus = "no_names";
        matchRecorded = true;
        return;
      }

      lastRecordStatus = recordMatch() ? "saved" : "failed";
      if (lastRecordStatus === "saved" && services.refreshLibraryStats) {
        services.refreshLibraryStats();
      }
      matchRecorded = true;
    }

    function resetMatch() {
      state = game.createInitialState();
      matchRecorded = false;
      lastRecordStatus = null;
      render();
      if (services.scrollToTop) {
        services.scrollToTop();
      }
    }

    function changeGame() {
      if (services.goToLibrary) {
        services.goToLibrary();
      }
    }

    function updatePlayerName(mark, value) {
      playerNames[mark] = value;
      services.savePlayerNames(GAME_ID, playerNames);
      renderStatus();
    }

    return {
      mount: mount,
      getSessionChip: function () {
        return state.winner ? "SESSION: COMPLETE" : "SESSION: ACTIVE";
      }
    };
  }

  global.ChurchGames.registerGame({
    id: GAME_ID,
    sortOrder: 10,
    title: "Ultimate Tic Tac Toe",
    version: "v1.0",
    command: "./ultimate-tic-tac-toe --local-2p",
    status: "installed",
    players: "2 local",
    duration: "10-25 min",
    type: "strategy",
    themeLabel: "Terminal CLI",
    description: "A recursive tic tac toe match where every square controls the next mini-board. Win small boards to claim the large board before your opponent can route you into a trap.",
    rules: [
      "X opens the match and may play anywhere.",
      "The square you pick sends the opponent to the matching mini-board.",
      "If the target mini-board is already closed, the opponent gets a free move.",
      "Small boards close when won or drawn.",
      "Win three claimed small boards in a row to win the match.",
      "Named players are saved to the local leaderboard when a match ends."
    ],
    getLibraryMetrics: formatLibraryMetrics,
    renderLeaderboard: renderLeaderboard,
    createController: createController
  });
})(window);
