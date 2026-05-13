(function registerGomoku(global) {
  "use strict";

  var GAME_ID = "gomoku";
  var engine = global.GomokuGame;

  function createEmptyStats() {
    return {
      version: 1,
      matches: 0,
      draws: 0,
      blackWins: 0,
      whiteWins: 0,
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
    stats.blackWins = Number(stats.blackWins) || 0;
    stats.whiteWins = Number(stats.whiteWins) || 0;
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
    var averageMoves = stats.matches ? Math.round(stats.totalMoves / stats.matches) : "--";
    var summary = document.createElement("dl");

    summary.className = "vapor-readout-grid";
    summary.append(
      helpers.createReadout("matches", String(stats.matches)),
      helpers.createReadout("draws", String(stats.draws)),
      helpers.createReadout("black wins", String(stats.blackWins)),
      helpers.createReadout("white wins", String(stats.whiteWins)),
      helpers.createReadout("fastest win", stats.fastestWinMoves ? stats.fastestWinMoves + " moves" : "--"),
      helpers.createReadout("avg moves", String(averageMoves)),
      helpers.createReadout("last played", helpers.formatDateTime(stats.lastPlayedAt))
    );
    container.appendChild(summary);

    if (!players.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No named player results yet. Add player names before the first move to save Gomoku results on this device.";
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
    var state = engine.createInitialState();
    var savedNames = services.getPlayerNames(GAME_ID);
    var playerNames = {
      BLACK: typeof savedNames.BLACK === "string" ? savedNames.BLACK : "",
      WHITE: typeof savedNames.WHITE === "string" ? savedNames.WHITE : ""
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
        renderCoordinateLabels();
        mounted = true;
      }

      render();
    }

    function createMarkup() {
      var wrapper = document.createElement("section");

      wrapper.className = "gomoku-game";
      wrapper.setAttribute("aria-label", "Gomoku game");
      wrapper.innerHTML =
        '<aside class="gomoku-panel gomoku-status-panel" aria-labelledby="gomoku-status-heading">' +
          '<div class="gomoku-panel-title" id="gomoku-status-heading">Match</div>' +
          '<div class="gomoku-panel-body">' +
            '<p class="gomoku-status-line" data-role="status-line" aria-live="polite"></p>' +
            '<section class="gomoku-player-setup" aria-labelledby="gomoku-players-heading">' +
              '<h2 id="gomoku-players-heading">Players</h2>' +
              '<label><span>black</span><input type="text" data-role="black-name" maxlength="32" autocomplete="off" placeholder="Black player"></label>' +
              '<label><span>white</span><input type="text" data-role="white-name" maxlength="32" autocomplete="off" placeholder="White player"></label>' +
            '</section>' +
            '<dl class="gomoku-readout-grid">' +
              '<div><dt>turn</dt><dd data-role="turn-readout">Black</dd></div>' +
              '<div><dt>mode</dt><dd>Freestyle</dd></div>' +
              '<div><dt>moves</dt><dd data-role="move-count">0 / 225</dd></div>' +
              '<div><dt>last</dt><dd data-role="last-move">--</dd></div>' +
              '<div><dt>black</dt><dd data-role="black-count">0</dd></div>' +
              '<div><dt>white</dt><dd data-role="white-count">0</dd></div>' +
            '</dl>' +
            '<div class="gomoku-action-row">' +
              '<button type="button" data-role="new-game">New Game</button>' +
              '<button type="button" data-role="undo-move">Undo</button>' +
            '</div>' +
          '</div>' +
        '</aside>' +
        '<section class="gomoku-board-panel" aria-labelledby="gomoku-board-heading">' +
          '<div class="gomoku-board-heading">' +
            '<div>' +
              '<p class="gomoku-kicker">15 x 15 / freestyle</p>' +
              '<h2 id="gomoku-board-heading">Gomoku</h2>' +
            '</div>' +
            '<div class="gomoku-turn-callout" data-role="turn-callout" aria-live="polite">Black to move</div>' +
          '</div>' +
          '<div class="gomoku-result-banner" data-role="result-banner" aria-live="polite" hidden></div>' +
          '<div class="gomoku-end-actions" data-role="end-actions" hidden>' +
            '<button type="button" data-role="new-game-inline">New Game</button>' +
            '<button type="button" data-role="change-game">Library</button>' +
          '</div>' +
          '<div class="gomoku-board-shell">' +
            '<div class="gomoku-board-frame">' +
              '<div class="gomoku-col-labels" data-role="col-labels" aria-hidden="true"></div>' +
              '<div class="gomoku-row-labels" data-role="row-labels" aria-hidden="true"></div>' +
              '<div class="gomoku-board" data-role="board" role="grid" aria-label="15 by 15 Gomoku board"></div>' +
              '<svg class="gomoku-winning-overlay" data-role="winning-overlay" viewBox="0 0 14 14" preserveAspectRatio="none" aria-hidden="true" hidden>' +
                '<line class="line-back" data-role="winning-line-back" x1="0" y1="0" x2="0" y2="0"></line>' +
                '<line class="line-front" data-role="winning-line-front" x1="0" y1="0" x2="0" y2="0"></line>' +
              '</svg>' +
            '</div>' +
          '</div>' +
        '</section>' +
        '<aside class="gomoku-panel gomoku-log-panel" aria-labelledby="gomoku-log-heading">' +
          '<div class="gomoku-panel-title" id="gomoku-log-heading">Rules / Log</div>' +
          '<div class="gomoku-panel-body">' +
            '<section class="gomoku-rules" aria-labelledby="gomoku-rules-heading">' +
              '<h2 id="gomoku-rules-heading">Ruleset</h2>' +
              '<ul>' +
                '<li>Black moves first on an empty 15 x 15 grid.</li>' +
                '<li>Players alternate placing one stone on an empty intersection.</li>' +
                '<li>Stones do not move after placement.</li>' +
                '<li>Five or more connected stones wins in any straight direction.</li>' +
                '<li>A full board with no five-in-a-row is a draw.</li>' +
              '</ul>' +
            '</section>' +
            '<section class="gomoku-move-log-section" aria-labelledby="gomoku-move-log-heading">' +
              '<h2 id="gomoku-move-log-heading">Move Log</h2>' +
              '<ol class="gomoku-move-log" data-role="move-log" aria-live="polite"></ol>' +
            '</section>' +
          '</div>' +
        '</aside>';

      return wrapper;
    }

    function bindElements() {
      [
        "status-line",
        "black-name",
        "white-name",
        "turn-readout",
        "move-count",
        "last-move",
        "black-count",
        "white-count",
        "new-game",
        "undo-move",
        "turn-callout",
        "result-banner",
        "end-actions",
        "new-game-inline",
        "change-game",
        "col-labels",
        "row-labels",
        "board",
        "winning-overlay",
        "winning-line-back",
        "winning-line-front",
        "move-log"
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
      els.board.addEventListener("click", function (event) {
        var point = event.target;
        var result;

        if (!(point instanceof HTMLButtonElement) || !point.classList.contains("gomoku-point")) {
          return;
        }

        result = engine.applyMove(state, Number(point.dataset.row), Number(point.dataset.col));
        state = result.state;
        maybeRecordMatch();
        render();
      });

      els.newGame.addEventListener("click", resetMatch);
      els.newGameInline.addEventListener("click", resetMatch);
      els.changeGame.addEventListener("click", changeGame);

      els.undoMove.addEventListener("click", function () {
        state = engine.undoMove(state);
        render();
      });

      els.blackName.addEventListener("input", function () {
        updatePlayerName(engine.BLACK, els.blackName.value);
      });

      els.whiteName.addEventListener("input", function () {
        updatePlayerName(engine.WHITE, els.whiteName.value);
      });
    }

    function getPlayerName(player) {
      return (playerNames[player] || "").trim();
    }

    function getPlayerLabel(player) {
      var name = getPlayerName(player);
      var defaultLabel = engine.playerLabel(player);

      return name ? name + " (" + defaultLabel + ")" : defaultLabel;
    }

    function hasAnyCustomName() {
      return Boolean(getPlayerName(engine.BLACK) || getPlayerName(engine.WHITE));
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

      if (state.lastError) {
        return state.lastError;
      }

      if (state.result && state.result.type === "win") {
        return getPlayerLabel(state.result.winner) + " wins with " + state.winningLine.length + " connected stones." + getRecordSuffix();
      }

      if (state.result && state.result.type === "draw") {
        return "Draw. Every intersection is occupied and no line was completed." + getRecordSuffix();
      }

      if (!last) {
        return getPlayerLabel(engine.BLACK) + " opens the match.";
      }

      return getPlayerLabel(last.player) + " placed at " + last.coordinate + ". " + getPlayerLabel(state.currentPlayer) + " to move.";
    }

    function renderCoordinateLabels() {
      var colFragment = document.createDocumentFragment();
      var rowFragment = document.createDocumentFragment();

      els.colLabels.replaceChildren();
      els.rowLabels.replaceChildren();

      engine.COL_LABELS.forEach(function (label) {
        var span = document.createElement("span");
        span.textContent = label;
        colFragment.appendChild(span);
      });

      Array.from({ length: state.boardSize }, function (_, index) {
        var span = document.createElement("span");
        span.textContent = String(index + 1);
        rowFragment.appendChild(span);
      });

      els.colLabels.appendChild(colFragment);
      els.rowLabels.appendChild(rowFragment);
    }

    function renderBoard() {
      var winningCells = engine.getWinningCellSet(state.winningLine);
      var fragment = document.createDocumentFragment();

      els.board.replaceChildren();

      state.board.forEach(function (row, rowIndex) {
        row.forEach(function (value, colIndex) {
          var point = document.createElement("button");
          var coordinate = engine.coordinateLabel(rowIndex, colIndex);
          var validation = engine.validateMove(state, state.currentPlayer, rowIndex, colIndex);
          var isLast = state.lastMove && state.lastMove.row === rowIndex && state.lastMove.col === colIndex;
          var key = rowIndex + "," + colIndex;

          point.type = "button";
          point.className = "gomoku-point";
          point.dataset.row = String(rowIndex);
          point.dataset.col = String(colIndex);
          point.setAttribute("role", "gridcell");
          point.setAttribute("aria-label", coordinate + (value ? " occupied by " + engine.playerLabel(value) : " empty"));

          if (value) {
            point.classList.add(value === engine.BLACK ? "is-black" : "is-white");
          }

          if (isLast) {
            point.classList.add("is-last");
          }

          if (winningCells[key]) {
            point.classList.add("is-winning");
          }

          if (!validation.ok) {
            point.disabled = true;
          }

          fragment.appendChild(point);
        });
      });

      els.board.appendChild(fragment);
      renderWinningOverlay();
    }

    function renderWinningOverlay() {
      var line = state.winningLine;

      if (!line) {
        els.winningOverlay.hidden = true;
        return;
      }

      [
        els.winningLineBack,
        els.winningLineFront
      ].forEach(function (svgLine) {
        svgLine.setAttribute("x1", String(line.start.col));
        svgLine.setAttribute("y1", String(line.start.row));
        svgLine.setAttribute("x2", String(line.end.col));
        svgLine.setAttribute("y2", String(line.end.row));
      });

      els.winningOverlay.hidden = false;
    }

    function renderResultBanner() {
      if (state.result && state.result.type === "win") {
        els.resultBanner.hidden = false;
        els.endActions.hidden = false;
        els.resultBanner.textContent = getPlayerLabel(state.result.winner) + " Won";
        return;
      }

      if (state.result && state.result.type === "draw") {
        els.resultBanner.hidden = false;
        els.endActions.hidden = false;
        els.resultBanner.textContent = "Draw";
        return;
      }

      els.resultBanner.hidden = true;
      els.endActions.hidden = true;
      els.resultBanner.textContent = "";
    }

    function countStones(player) {
      return state.board.reduce(function (sum, row) {
        return sum + row.filter(function (value) {
          return value === player;
        }).length;
      }, 0);
    }

    function renderLog() {
      var entries = state.moveHistory.slice().reverse();
      var fragment = document.createDocumentFragment();

      els.moveLog.replaceChildren();

      if (!entries.length) {
        var empty = document.createElement("li");
        empty.className = "empty-log";
        empty.textContent = "awaiting first move";
        els.moveLog.appendChild(empty);
        return;
      }

      entries.slice(0, 24).forEach(function (move) {
        var item = document.createElement("li");
        item.textContent = String(move.index).padStart(3, "0") + " " + engine.playerLabel(move.player).toUpperCase() + " " + move.coordinate;
        fragment.appendChild(item);
      });

      els.moveLog.appendChild(fragment);
    }

    function renderStatus() {
      var namesLocked = state.occupiedCount > 0;

      els.statusLine.classList.toggle("error", Boolean(state.lastError));
      els.statusLine.textContent = getStatusText();
      els.turnReadout.textContent = state.result ? "Ended" : getPlayerLabel(state.currentPlayer);
      els.turnCallout.classList.toggle("ended", Boolean(state.result));
      els.turnCallout.textContent = state.result ? "Session complete" : getPlayerLabel(state.currentPlayer) + " to move";
      els.moveCount.textContent = state.occupiedCount + " / " + (state.boardSize * state.boardSize);
      els.lastMove.textContent = state.lastMove ? state.lastMove.coordinate : "--";
      els.blackCount.textContent = String(countStones(engine.BLACK));
      els.whiteCount.textContent = String(countStones(engine.WHITE));
      els.undoMove.disabled = state.history.length === 0 || Boolean(state.result);
      els.blackName.disabled = namesLocked;
      els.whiteName.disabled = namesLocked;

      if (services.setSessionChip) {
        services.setSessionChip(state.result ? "SESSION: COMPLETE" : "SESSION: ACTIVE");
      }
    }

    function render() {
      syncPlayerInputs();
      renderStatus();
      renderResultBanner();
      renderBoard();
      renderLog();
    }

    function syncPlayerInputs() {
      if (els.blackName.value !== playerNames.BLACK) {
        els.blackName.value = playerNames.BLACK;
      }

      if (els.whiteName.value !== playerNames.WHITE) {
        els.whiteName.value = playerNames.WHITE;
      }
    }

    function normalizeNameKey(name) {
      return name.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function movesForPlayer(player) {
      return state.moveHistory.filter(function (move) {
        return move.player === player;
      }).length;
    }

    function updatePlayerStats(stats, player, now) {
      var name = getPlayerName(player);
      var key;
      var record;

      if (!name) {
        return;
      }

      key = normalizeNameKey(name);
      record = Object.assign({
        name: name,
        games: 0,
        wins: 0,
        losses: 0,
        draws: 0,
        totalMoves: 0,
        lastPlayedAt: null,
        lastWonAt: null
      }, stats.players[key] || {});

      record.name = name;
      record.games += 1;
      record.totalMoves += movesForPlayer(player);
      record.lastPlayedAt = now;

      if (state.result.type === "draw") {
        record.draws += 1;
      } else if (state.result.winner === player) {
        record.wins += 1;
        record.lastWonAt = now;
      } else {
        record.losses += 1;
      }

      stats.players[key] = record;
    }

    function recordMatch() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      var now = new Date().toISOString();
      var winnerName = state.result.type === "draw" ? "DRAW" : getPlayerName(state.result.winner) || engine.playerLabel(state.result.winner);

      stats.matches += 1;
      stats.totalMoves += state.occupiedCount;
      stats.lastPlayedAt = now;

      if (state.result.type === "draw") {
        stats.draws += 1;
      } else if (state.result.winner === engine.BLACK) {
        stats.blackWins += 1;
      } else if (state.result.winner === engine.WHITE) {
        stats.whiteWins += 1;
      }

      if (state.result.type === "win" && (stats.fastestWinMoves === null || state.occupiedCount < stats.fastestWinMoves)) {
        stats.fastestWinMoves = state.occupiedCount;
      }

      updatePlayerStats(stats, engine.BLACK, now);
      updatePlayerStats(stats, engine.WHITE, now);

      stats.recent.unshift({
        playedAt: now,
        result: state.result.type,
        winnerMark: state.result.winner || engine.DRAW,
        winnerName: winnerName,
        blackName: getPlayerName(engine.BLACK) || "Black",
        whiteName: getPlayerName(engine.WHITE) || "White",
        moves: state.occupiedCount,
        winningLength: state.winningLine ? state.winningLine.length : 0
      });
      stats.recent = stats.recent.slice(0, 12);

      return services.saveStats(GAME_ID, stats);
    }

    function maybeRecordMatch() {
      if (!state.result || matchRecorded) {
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
      state = engine.createInitialState();
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

    function updatePlayerName(player, value) {
      playerNames[player] = value;
      services.savePlayerNames(GAME_ID, playerNames);
      renderStatus();
    }

    return {
      mount: mount,
      getSessionChip: function () {
        return state.result ? "SESSION: COMPLETE" : "SESSION: ACTIVE";
      }
    };
  }

  global.ChurchGames.registerGame({
    id: GAME_ID,
    sortOrder: 30,
    title: "Gomoku",
    version: "v1.0",
    command: "./gomoku --freestyle --local-2p",
    status: "installed",
    players: "2 local",
    duration: "10-30 min",
    type: "abstract strategy",
    themeLabel: "Minimalist Monochrome",
    description: "A stark 15 x 15 freestyle five-in-a-row match. Black opens, players place stones on intersections, and the first unbroken line of five or more wins.",
    rules: [
      "Black moves first on an empty 15 x 15 intersection grid.",
      "Players alternate placing exactly one stone on an empty intersection.",
      "Stones stay fixed after placement.",
      "The first player to make five or more connected stones horizontally, vertically, or diagonally wins.",
      "If all 225 intersections fill without a winning line, the match is a draw.",
      "The board highlights the last move and the full connected winning line."
    ],
    getLibraryMetrics: formatLibraryMetrics,
    renderLeaderboard: renderLeaderboard,
    createController: createController
  });
})(window);
