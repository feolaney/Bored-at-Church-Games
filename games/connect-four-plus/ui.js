(function registerConnectFourPlus(global) {
  "use strict";

  var GAME_ID = "connect-four-plus";
  var engine = global.ConnectFourPlus;

  function createEmptyStats() {
    return {
      version: 1,
      matches: 0,
      draws: 0,
      redWins: 0,
      yellowWins: 0,
      totalTurns: 0,
      totalDrops: 0,
      powerupsUsed: 0,
      fastestWinTurns: null,
      lastPlayedAt: null,
      players: {},
      recent: []
    };
  }

  function normalizeStats(rawStats) {
    var stats = Object.assign(createEmptyStats(), rawStats || {});

    stats.matches = Number(stats.matches) || 0;
    stats.draws = Number(stats.draws) || 0;
    stats.redWins = Number(stats.redWins) || 0;
    stats.yellowWins = Number(stats.yellowWins) || 0;
    stats.totalTurns = Number(stats.totalTurns) || 0;
    stats.totalDrops = Number(stats.totalDrops) || 0;
    stats.powerupsUsed = Number(stats.powerupsUsed) || 0;
    stats.fastestWinTurns = stats.fastestWinTurns === null ? null : Number(stats.fastestWinTurns) || null;
    stats.players = stats.players && typeof stats.players === "object" ? stats.players : {};
    stats.recent = Array.isArray(stats.recent) ? stats.recent : [];

    return stats;
  }

  function getPowerSummary(rawStats) {
    var stats = normalizeStats(rawStats);
    return "matches:" + stats.matches + " powers:" + stats.powerupsUsed + " fastest:" + (stats.fastestWinTurns || "--") + " turns";
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

    summary.className = "vapor-readout-grid";
    summary.append(
      helpers.createReadout("matches", String(stats.matches)),
      helpers.createReadout("draws", String(stats.draws)),
      helpers.createReadout("red wins", String(stats.redWins)),
      helpers.createReadout("yellow wins", String(stats.yellowWins)),
      helpers.createReadout("powerups", String(stats.powerupsUsed)),
      helpers.createReadout("last played", helpers.formatDateTime(stats.lastPlayedAt))
    );
    container.appendChild(summary);

    if (!players.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No named player results yet. Add player names before starting a match to save results on this device.";
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

    heading.textContent = "Recent Power Duels";
    list.className = "recent-list";

    recentMatches.slice(0, 6).forEach(function (match) {
      var item = document.createElement("li");
      var result = match.result === "draw" ? "DRAW" : match.winnerName + " WON";

      item.textContent = helpers.formatDateTime(match.playedAt) + " | " + result + " | " + match.turns + " turns | " + match.powerupsUsed + " powers";
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
      R: typeof savedNames.R === "string" ? savedNames.R : "",
      Y: typeof savedNames.Y === "string" ? savedNames.Y : ""
    };
    var mounted = false;
    var els = {};
    var matchRecorded = false;
    var lastRecordStatus = null;
    var animatedDropKey = null;

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

      wrapper.className = "connect-four-plus";
      wrapper.innerHTML =
        '<section class="cfp-handoff" data-role="handoff-panel" aria-live="polite">' +
          '<div class="cfp-shape-row" aria-hidden="true"><span class="cfp-circle"></span><span class="cfp-square"></span><span class="cfp-triangle"></span></div>' +
          '<p class="cfp-label">private handoff</p>' +
          '<h2 data-role="handoff-title">Pass the device</h2>' +
          '<p data-role="handoff-copy">The board and hidden powerups are covered until the active player starts their turn.</p>' +
          '<div class="cfp-name-grid" data-role="name-setup">' +
            '<label><span>Red name</span><input type="text" data-role="red-name" maxlength="32" autocomplete="off" placeholder="Red player"></label>' +
            '<label><span>Yellow name</span><input type="text" data-role="yellow-name" maxlength="32" autocomplete="off" placeholder="Yellow player"></label>' +
          '</div>' +
          '<button type="button" class="cfp-button cfp-button-red" data-role="start-turn">Start Turn</button>' +
        '</section>' +
        '<section class="cfp-live-area" data-role="live-area">' +
          '<aside class="cfp-panel cfp-status-panel">' +
            '<div class="cfp-panel-title"><span class="cfp-circle"></span><span>turn system</span></div>' +
            '<div class="cfp-panel-body">' +
              '<p class="cfp-status" data-role="status-line"></p>' +
              '<dl class="cfp-readouts">' +
                '<div><dt>turn</dt><dd data-role="turn-readout">Red</dd></div>' +
                '<div><dt>locked</dt><dd data-role="lock-readout">None</dd></div>' +
                '<div><dt>turns</dt><dd data-role="turn-count">0</dd></div>' +
                '<div><dt>drops</dt><dd data-role="drop-count">0</dd></div>' +
              '</dl>' +
              '<div class="cfp-player-names">' +
                '<label><span>red</span><input type="text" data-role="red-name-live" maxlength="32" autocomplete="off" placeholder="Red player"></label>' +
                '<label><span>yellow</span><input type="text" data-role="yellow-name-live" maxlength="32" autocomplete="off" placeholder="Yellow player"></label>' +
              '</div>' +
              '<div class="cfp-actions">' +
                '<button type="button" class="cfp-button cfp-button-yellow" data-role="new-game">New Game</button>' +
                '<button type="button" class="cfp-button cfp-button-outline" data-role="cancel-power">Cancel Power</button>' +
              '</div>' +
            '</div>' +
          '</aside>' +
          '<section class="cfp-board-panel">' +
            '<div class="cfp-drop-row" data-role="drop-row" aria-label="Drop by column"></div>' +
            '<div class="cfp-board" data-role="board" role="grid" aria-label="Connect Four Plus board"></div>' +
          '</section>' +
          '<aside class="cfp-panel cfp-power-panel">' +
            '<div class="cfp-panel-title"><span class="cfp-square"></span><span>private hand</span></div>' +
            '<div class="cfp-panel-body">' +
              '<p class="cfp-label" data-role="hand-owner">Red hand</p>' +
              '<div class="cfp-hand" data-role="hand"></div>' +
              '<section class="cfp-rules-mini">' +
                '<h3>Power Duel Rules</h3>' +
                '<ul>' +
                  '<li>Use at most one powerup before dropping.</li>' +
                  '<li>Draw one hidden power every fourth personal turn.</li>' +
                  '<li>Used powers are public; unused powers stay private.</li>' +
                '</ul>' +
              '</section>' +
              '<section class="cfp-log-section">' +
                '<h3>Public Log</h3>' +
                '<ol class="cfp-log" data-role="public-log"></ol>' +
              '</section>' +
            '</div>' +
          '</aside>' +
        '</section>';

      return wrapper;
    }

    function bindElements() {
      [
        "handoff-panel",
        "handoff-title",
        "handoff-copy",
        "name-setup",
        "start-turn",
        "live-area",
        "status-line",
        "turn-readout",
        "lock-readout",
        "turn-count",
        "drop-count",
        "red-name",
        "yellow-name",
        "red-name-live",
        "yellow-name-live",
        "new-game",
        "cancel-power",
        "drop-row",
        "board",
        "hand-owner",
        "hand",
        "public-log"
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
      els.startTurn.addEventListener("click", function () {
        state = engine.startTurn(state);
        render();
      });

      els.newGame.addEventListener("click", resetMatch);
      els.cancelPower.addEventListener("click", function () {
        state = engine.cancelPendingPower(state);
        render();
      });

      els.dropRow.addEventListener("click", function (event) {
        var button = event.target;

        if (!(button instanceof HTMLButtonElement) || !button.dataset.column) {
          return;
        }

        playColumn(Number(button.dataset.column));
      });

      els.board.addEventListener("click", function (event) {
        var target = event.target;
        var cell;
        var row;
        var col;

        if (!(target instanceof Element)) {
          return;
        }

        cell = target.closest(".cfp-cell");
        row = cell ? Number(cell.dataset.row) : NaN;
        col = cell ? Number(cell.dataset.column) : getBoardColumnFromPointer(event);

        if (!Number.isInteger(col)) {
          return;
        }

        if (state.pendingPower && state.pendingPower.name === "Shield") {
          if (!Number.isInteger(row)) {
            return;
          }
          state = engine.applyPowerToCell(state, row, col);
        } else if (state.pendingPower) {
          state = engine.applyPowerToColumn(state, col);
        } else {
          playColumn(col);
          return;
        }

        render();
      });

      els.hand.addEventListener("click", function (event) {
        var button;

        if (!(event.target instanceof Element)) {
          return;
        }

        button = event.target.closest("[data-hand-index]");

        if (!button) {
          return;
        }

        state = engine.selectPower(state, Number(button.dataset.handIndex));
        render();
      });

      [
        els.redName,
        els.redNameLive
      ].forEach(function (input) {
        input.addEventListener("input", function () {
          updatePlayerName("R", input.value);
        });
      });

      [
        els.yellowName,
        els.yellowNameLive
      ].forEach(function (input) {
        input.addEventListener("input", function () {
          updatePlayerName("Y", input.value);
        });
      });
    }

    function resetMatch() {
      state = engine.createInitialState();
      matchRecorded = false;
      lastRecordStatus = null;
      animatedDropKey = null;
      render();
    }

    function getBoardColumnFromPointer(event) {
      var rect = els.board.getBoundingClientRect();
      var x = event.clientX - rect.left;

      if (x < 0 || x > rect.width) {
        return NaN;
      }

      return Math.max(0, Math.min(engine.COLS - 1, Math.floor((x / rect.width) * engine.COLS)));
    }

    function playColumn(col) {
      if (state.winner || state.draw) {
        return;
      }

      state = engine.dropPiece(state, col);
      maybeRecordMatch();
      render();
    }

    function getPlayerName(mark) {
      return (playerNames[mark] || "").trim();
    }

    function getPlayerLabel(mark) {
      return getPlayerName(mark) || engine.PLAYER_LABELS[mark];
    }

    function hasAnyCustomName() {
      return Boolean(getPlayerName("R") || getPlayerName("Y"));
    }

    function updatePlayerName(mark, value) {
      playerNames[mark] = value;
      services.savePlayerNames(GAME_ID, playerNames);
      syncNameInputs();
    }

    function syncNameInputs() {
      var redDisabled = state.turnOpen || state.turnCount > 0 || state.dropCount > 0;
      var yellowDisabled = redDisabled;

      [
        els.redName,
        els.redNameLive
      ].forEach(function (input) {
        if (input.value !== playerNames.R) {
          input.value = playerNames.R;
        }
        input.disabled = redDisabled;
      });

      [
        els.yellowName,
        els.yellowNameLive
      ].forEach(function (input) {
        if (input.value !== playerNames.Y) {
          input.value = playerNames.Y;
        }
        input.disabled = yellowDisabled;
      });
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
      var power = state.pendingPower && state.pendingPower.name;

      if (state.lastError) {
        return state.lastError;
      }

      if (state.winner) {
        return getPlayerLabel(state.winner) + " connects four." + getRecordSuffix();
      }

      if (state.draw) {
        return "Board full. The match is a draw." + getRecordSuffix();
      }

      if (state.pendingHandoff) {
        return "Board hidden for pass-and-play privacy.";
      }

      if (power === "Shield") {
        return "Choose one of your pieces to shield.";
      }

      if (power) {
        return "Choose a target column for " + power + ".";
      }

      if (state.dropPlan.remaining > 1) {
        return "Double Drop active. Drop " + state.dropPlan.remaining + " pieces in different columns.";
      }

      return getPlayerLabel(state.currentPlayer) + " may use one powerup, then drop a piece.";
    }

    function render() {
      syncNameInputs();
      renderPrivacyState();
      renderStatus();
      renderDropButtons();
      renderBoard();
      renderHand();
      renderLog();
    }

    function renderPrivacyState() {
      var activeName = getPlayerLabel(state.currentPlayer);

      els.handoffPanel.hidden = !state.pendingHandoff && !state.winner && !state.draw;
      els.liveArea.hidden = state.pendingHandoff && !state.winner && !state.draw;
      els.nameSetup.hidden = state.turnCount > 0 || state.dropCount > 0;

      if (state.winner || state.draw) {
        els.handoffPanel.hidden = true;
        els.liveArea.hidden = false;
      }

      els.handoffTitle.textContent = "Pass to " + activeName;
      els.handoffCopy.textContent = activeName + ", tap Start Turn when the device is in your hands. Hidden powerups stay private between turns.";
    }

    function renderStatus() {
      var lockedText = state.lockedColumn === null ? "None" : "Column " + (state.lockedColumn + 1) + " for " + engine.PLAYER_LABELS[state.lockedFor];

      els.statusLine.classList.toggle("is-error", Boolean(state.lastError));
      els.statusLine.textContent = getStatusText();
      els.turnReadout.textContent = state.winner || state.draw ? "Ended" : getPlayerLabel(state.currentPlayer);
      els.lockReadout.textContent = lockedText;
      els.turnCount.textContent = String(state.turnCount);
      els.dropCount.textContent = String(state.dropCount);
      els.cancelPower.disabled = !state.pendingPower;

      if (services.setSessionChip) {
        services.setSessionChip(state.winner || state.draw ? "SESSION: COMPLETE" : "SESSION: ACTIVE");
      }
    }

    function renderDropButtons() {
      var fragment = document.createDocumentFragment();
      var legalColumns = engine.getLegalDropColumns(state);
      var col;

      els.dropRow.replaceChildren();

      for (col = 0; col < engine.COLS; col += 1) {
        var button = document.createElement("button");
        button.type = "button";
        button.className = "cfp-drop-button";
        button.dataset.column = String(col);
        button.textContent = String(col + 1);
        button.disabled = !state.turnOpen || Boolean(state.pendingPower) || Boolean(state.winner) || state.draw || legalColumns.indexOf(col) === -1;
        fragment.appendChild(button);
      }

      els.dropRow.appendChild(fragment);
    }

    function isWinningCell(row, col) {
      return Boolean(state.winningLine && state.winningLine.some(function (position) {
        return position[0] === row && position[1] === col;
      }));
    }

    function renderBoard() {
      var fragment = document.createDocumentFragment();
      var legalColumns = engine.getLegalDropColumns(state);
      var lastDrop = state.lastMove && state.lastMove.kind === "drop" ? state.lastMove : null;
      var lastDropKey = lastDrop ? state.dropCount + ":" + lastDrop.player + ":" + lastDrop.row + ":" + lastDrop.col : null;
      var row;
      var col;

      els.board.replaceChildren();

      for (row = 0; row < engine.ROWS; row += 1) {
        for (col = 0; col < engine.COLS; col += 1) {
          var cell = document.createElement("button");
          var piece = state.board[row][col];
          var playableColumn = state.turnOpen && !state.pendingHandoff && !state.pendingPower && !state.winner && !state.draw && legalColumns.indexOf(col) !== -1;
          var label = "Row " + (row + 1) + ", column " + (col + 1);

          cell.type = "button";
          cell.className = "cfp-cell";
          cell.dataset.row = String(row);
          cell.dataset.column = String(col);
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", label + (piece ? " occupied by " + engine.PLAYER_LABELS[piece.player] : " empty"));
          cell.setAttribute("aria-disabled", playableColumn || state.pendingPower ? "false" : "true");

          if (playableColumn) {
            cell.classList.add("is-playable-column");
          }

          if (piece) {
            var disc = document.createElement("span");
            disc.className = "cfp-disc " + (piece.player === "R" ? "red" : "yellow");
            if (piece.shielded) {
              disc.classList.add("shielded");
            }
            if (lastDrop && lastDropKey !== animatedDropKey && lastDrop.row === row && lastDrop.col === col) {
              disc.classList.add("is-dropping");
              disc.style.setProperty("--cfp-drop-distance", "-" + ((row + 1) * 126) + "%");
            }
            cell.appendChild(disc);
          }

          if (isWinningCell(row, col)) {
            cell.classList.add("is-winning");
          }

          fragment.appendChild(cell);
        }
      }

      els.board.appendChild(fragment);
      if (lastDropKey && lastDropKey !== animatedDropKey) {
        animatedDropKey = lastDropKey;
      }
    }

    function renderHand() {
      var hand = state.players[state.currentPlayer].hand;
      var fragment = document.createDocumentFragment();

      els.handOwner.textContent = getPlayerLabel(state.currentPlayer) + " hand";
      els.hand.replaceChildren();

      if (!state.turnOpen || state.pendingHandoff || state.winner || state.draw) {
        var hidden = document.createElement("p");
        hidden.className = "cfp-hand-empty";
        hidden.textContent = "Hidden until the private turn starts.";
        els.hand.appendChild(hidden);
        return;
      }

      if (!hand.length) {
        var empty = document.createElement("p");
        empty.className = "cfp-hand-empty";
        empty.textContent = "No powerups in hand.";
        els.hand.appendChild(empty);
        return;
      }

      hand.forEach(function (power, index) {
        var button = document.createElement("button");
        var name = document.createElement("strong");
        var rule = document.createElement("span");

        button.type = "button";
        button.className = "cfp-power-card";
        button.dataset.handIndex = String(index);
        button.disabled = state.powerUsedThisTurn || Boolean(state.pendingPower);

        name.textContent = power;
        rule.textContent = getPowerHelp(power);
        button.append(name, rule);
        fragment.appendChild(button);
      });

      els.hand.appendChild(fragment);
    }

    function getPowerHelp(power) {
      if (power === "Pop") {
        return "Remove your own bottom piece from a column.";
      }
      if (power === "Lock") {
        return "Lock a non-full column for the opponent's next turn.";
      }
      if (power === "Swap Top") {
        return "Swap the top two pieces in one column.";
      }
      if (power === "Shield") {
        return "Protect one of your pieces from removal.";
      }
      if (power === "Double Drop") {
        return "Drop two pieces in different columns.";
      }
      return "One-use powerup.";
    }

    function renderLog() {
      var entries = state.publicLog.slice().reverse();
      var fragment = document.createDocumentFragment();

      els.publicLog.replaceChildren();

      if (!entries.length) {
        var empty = document.createElement("li");
        empty.textContent = "No public actions yet.";
        els.publicLog.appendChild(empty);
        return;
      }

      entries.slice(0, 10).forEach(function (entry) {
        var item = document.createElement("li");
        item.textContent = entry;
        fragment.appendChild(item);
      });

      els.publicLog.appendChild(fragment);
    }

    function normalizeNameKey(name) {
      return name.trim().toLowerCase().replace(/\s+/g, " ");
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
        totalTurns: 0,
        lastPlayedAt: null,
        lastWonAt: null
      }, stats.players[key] || {});

      player.name = name;
      player.games += 1;
      player.totalTurns += state.turnCount;
      player.lastPlayedAt = now;

      if (state.draw) {
        player.draws += 1;
      } else if (state.winner === mark) {
        player.wins += 1;
        player.lastWonAt = now;
      } else {
        player.losses += 1;
      }

      stats.players[key] = player;
    }

    function countPowerupsUsed() {
      return state.publicLog.filter(function (entry) {
        return entry.indexOf(" used ") !== -1;
      }).length;
    }

    function recordMatch() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      var now = new Date().toISOString();
      var powerupsUsed = countPowerupsUsed();
      var winnerName = state.winner ? getPlayerLabel(state.winner) : "DRAW";

      stats.matches += 1;
      stats.totalTurns += state.turnCount;
      stats.totalDrops += state.dropCount;
      stats.powerupsUsed += powerupsUsed;
      stats.lastPlayedAt = now;

      if (state.draw) {
        stats.draws += 1;
      } else if (state.winner === "R") {
        stats.redWins += 1;
      } else if (state.winner === "Y") {
        stats.yellowWins += 1;
      }

      if (state.winner && (stats.fastestWinTurns === null || state.turnCount < stats.fastestWinTurns)) {
        stats.fastestWinTurns = state.turnCount;
      }

      updatePlayerStats(stats, "R", now);
      updatePlayerStats(stats, "Y", now);

      stats.recent.unshift({
        playedAt: now,
        result: state.draw ? "draw" : "win",
        winnerMark: state.winner,
        winnerName: winnerName,
        redName: getPlayerLabel("R"),
        yellowName: getPlayerLabel("Y"),
        turns: state.turnCount,
        drops: state.dropCount,
        powerupsUsed: powerupsUsed
      });
      stats.recent = stats.recent.slice(0, 12);

      return services.saveStats(GAME_ID, stats);
    }

    function maybeRecordMatch() {
      if (!(state.winner || state.draw) || matchRecorded) {
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

    return {
      mount: mount,
      getSessionChip: function () {
        return state.winner || state.draw ? "SESSION: COMPLETE" : "SESSION: ACTIVE";
      }
    };
  }

  global.ChurchGames.registerGame({
    id: GAME_ID,
    sortOrder: 20,
    title: "Connect Four Plus",
    version: "v1.0",
    command: "./connect-four-plus --power-duel",
    status: "installed",
    players: "2 local",
    duration: "8-18 min",
    type: "strategy / power duel",
    themeLabel: "Bauhaus",
    description: "A pass-and-play Connect Four variant with private powerup hands, handoff privacy, tactical disruption, and classic connect-four win conditions.",
    rules: [
      "Use a standard 7-column by 6-row board.",
      "Each player starts with one hidden random powerup and may hold up to three.",
      "On your turn, privately reveal your hand, optionally use one powerup, then drop one piece.",
      "After every fourth personal turn, draw one hidden powerup unless your hand is full.",
      "Used powerups are public in the log; unused powerups remain private.",
      "After each turn, the board is hidden until the next player starts their private turn."
    ],
    getLibraryMetrics: getPowerSummary,
    renderLeaderboard: renderLeaderboard,
    createController: createController
  });
})(window);
