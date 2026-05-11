(function registerConnectFourPlus(global) {
  "use strict";

  var GAME_ID = "connect-four-plus";
  var engine = global.ConnectFourPlus;
  var BOMB_BLAST_SETTLE_DELAY_MS = 900;
  var POP_SETTLE_DELAY_MS = 620;

  function createEmptyStats() {
    return {
      version: 2,
      matches: 0,
      draws: 0,
      redWins: 0,
      yellowWins: 0,
      totalTurns: 0,
      totalDrops: 0,
      powerupsUsed: 0,
      fastestWinTurns: null,
      lastPlayedAt: null,
      modes: {},
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
    stats.modes = stats.modes && typeof stats.modes === "object" ? stats.modes : {};
    stats.players = stats.players && typeof stats.players === "object" ? stats.players : {};
    stats.recent = Array.isArray(stats.recent) ? stats.recent : [];

    return stats;
  }

  function getPowerSummary(rawStats) {
    var stats = normalizeStats(rawStats);
    return "modes:" + engine.MODES.length + " matches:" + stats.matches + " powers:" + stats.powerupsUsed;
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
    var topModes = Object.keys(stats.modes).map(function (modeId) {
      return stats.modes[modeId];
    }).sort(function (a, b) {
      return b.matches - a.matches;
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

    if (topModes.length) {
      container.appendChild(createModeList(topModes, helpers));
    }

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

  function createModeList(modes, helpers) {
    var section = document.createElement("section");
    var heading = document.createElement("h2");
    var list = document.createElement("ol");

    heading.textContent = "Mode Results";
    list.className = "recent-list";

    modes.slice(0, 5).forEach(function (mode) {
      var item = document.createElement("li");
      item.textContent = mode.title + " | " + mode.matches + " matches | " + mode.wins + " wins | " + mode.draws + " draws";
      list.appendChild(item);
    });

    section.append(heading, list);
    return section;
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

      item.textContent = helpers.formatDateTime(match.playedAt) + " | " + match.modeTitle + " | " + result + " | " + match.turns + " turns";
      list.appendChild(item);
    });

    section.append(heading, list);
    return section;
  }

  function createController(options) {
    var root = options.root;
    var services = options.services;
    var state = null;
    var selectedModeId = null;
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
    var animatedPopKey = null;
    var animatedSwapKey = null;
    var animatedGravityShiftId = null;
    var animatedColumnBattleKey = null;
    var columnBattleDropReadyKey = null;
    var tokenRevealAnimations = [];

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
        '<section class="cfp-mode-select" data-role="mode-select">' +
          '<div class="cfp-mode-hero">' +
            '<div class="cfp-falling-discs" aria-hidden="true">' +
              '<span class="cfp-fall-disc red"></span>' +
              '<span class="cfp-fall-disc yellow"></span>' +
              '<span class="cfp-fall-disc red"></span>' +
              '<span class="cfp-fall-disc yellow"></span>' +
              '<span class="cfp-fall-disc red"></span>' +
            '</div>' +
            '<p class="cfp-label">variant router</p>' +
            '<h2>Choose Mode</h2>' +
            '<p>Select which public Connect Four Plus ruleset to launch.</p>' +
          '</div>' +
          '<div class="cfp-mode-list" data-role="mode-list"></div>' +
        '</section>' +
        '<section class="cfp-handoff" data-role="handoff-panel" aria-live="polite" hidden>' +
          '<div class="cfp-shape-row" aria-hidden="true"><span class="cfp-circle"></span><span class="cfp-square"></span><span class="cfp-triangle"></span></div>' +
          '<p class="cfp-label">fog handoff</p>' +
          '<h2 data-role="handoff-title">Pass the device</h2>' +
          '<p data-role="handoff-copy">Fog information is covered until the active player starts their turn.</p>' +
          '<div class="cfp-name-grid" data-role="name-setup">' +
            '<label><span>Red name</span><input type="text" data-role="red-name" maxlength="32" autocomplete="off" placeholder="Red player"></label>' +
            '<label><span>Yellow name</span><input type="text" data-role="yellow-name" maxlength="32" autocomplete="off" placeholder="Yellow player"></label>' +
          '</div>' +
          '<button type="button" class="cfp-button cfp-button-red" data-role="start-turn">Start Turn</button>' +
        '</section>' +
        '<section class="cfp-live-area" data-role="live-area" hidden>' +
          '<aside class="cfp-panel cfp-status-panel">' +
            '<div class="cfp-panel-title"><span class="cfp-circle"></span><span>turn system</span></div>' +
            '<div class="cfp-panel-body">' +
              '<p class="cfp-status" data-role="status-line"></p>' +
              '<dl class="cfp-readouts">' +
                '<div><dt>mode</dt><dd data-role="mode-readout">Select</dd></div>' +
                '<div><dt>turn</dt><dd data-role="turn-readout">Red</dd></div>' +
                '<div><dt>state</dt><dd data-role="lock-readout">Open</dd></div>' +
                '<div><dt>turns</dt><dd data-role="turn-count">0</dd></div>' +
                '<div><dt>drops</dt><dd data-role="drop-count">0</dd></div>' +
              '</dl>' +
              '<div class="cfp-player-names">' +
                '<label><span>red</span><input type="text" data-role="red-name-live" maxlength="32" autocomplete="off" placeholder="Red player"></label>' +
                '<label><span>yellow</span><input type="text" data-role="yellow-name-live" maxlength="32" autocomplete="off" placeholder="Yellow player"></label>' +
              '</div>' +
              '<div class="cfp-actions">' +
                '<button type="button" class="cfp-button cfp-button-yellow" data-role="new-game">New Game</button>' +
                '<button type="button" class="cfp-button cfp-button-outline" data-role="change-mode">Change Mode</button>' +
              '</div>' +
            '</div>' +
          '</aside>' +
          '<section class="cfp-board-panel" data-role="board-panel">' +
            '<section class="cfp-hand-summary" data-role="hand-summary" aria-label="Player powerups"></section>' +
            '<div class="cfp-drop-row" data-role="drop-row" aria-label="Drop by column"></div>' +
            '<div class="cfp-win-banner" data-role="win-banner" aria-live="polite" hidden></div>' +
            '<div class="cfp-end-actions" data-role="end-actions" hidden>' +
              '<button type="button" class="cfp-button cfp-button-yellow" data-role="new-game-inline">New Game</button>' +
              '<button type="button" class="cfp-button cfp-button-outline" data-role="change-mode-inline">Change Game</button>' +
            '</div>' +
            '<div class="cfp-board" data-role="board" role="grid" aria-label="Connect Four Plus board"></div>' +
            '<div class="cfp-column-battle" data-role="column-battle" aria-live="polite" hidden>' +
              '<div class="cfp-column-battle-card">' +
                '<p>Column Battle</p>' +
                '<span class="cfp-battle-coin" aria-hidden="true"></span>' +
                '<strong data-role="column-battle-result"></strong>' +
              '</div>' +
            '</div>' +
          '</section>' +
          '<aside class="cfp-panel cfp-power-panel">' +
            '<div class="cfp-panel-title"><span class="cfp-square"></span><span data-role="tools-title">mode tools</span></div>' +
            '<div class="cfp-panel-body">' +
              '<p class="cfp-label" data-role="hand-owner">Red tools</p>' +
              '<div class="cfp-hand" data-role="hand"></div>' +
              '<div class="cfp-tool-actions">' +
                '<button type="button" class="cfp-button cfp-button-outline" data-role="cancel-power">Cancel Tool</button>' +
              '</div>' +
              '<section class="cfp-rules-mini">' +
                '<h3 data-role="rules-title">Mode Rules</h3>' +
                '<ul data-role="rules-list"></ul>' +
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
        "mode-select",
        "mode-list",
        "handoff-panel",
        "handoff-title",
        "handoff-copy",
        "name-setup",
        "start-turn",
        "live-area",
        "status-line",
        "mode-readout",
        "turn-readout",
        "lock-readout",
        "turn-count",
        "drop-count",
        "red-name",
        "yellow-name",
        "red-name-live",
        "yellow-name-live",
        "new-game",
        "change-mode",
        "cancel-power",
        "board-panel",
        "hand-summary",
        "drop-row",
        "win-banner",
        "end-actions",
        "new-game-inline",
        "change-mode-inline",
        "board",
        "column-battle",
        "column-battle-result",
        "tools-title",
        "hand-owner",
        "hand",
        "rules-title",
        "rules-list",
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
      els.modeList.addEventListener("click", function (event) {
        var card;

        if (!(event.target instanceof Element)) {
          return;
        }

        card = event.target.closest("[data-mode-id]");
        if (!card) {
          return;
        }

        startMode(card.dataset.modeId);
      });

      els.startTurn.addEventListener("click", function () {
        if (!state) {
          return;
        }

        state = engine.startTurn(state);
        render();
      });

      els.newGame.addEventListener("click", resetMatch);
      els.newGameInline.addEventListener("click", resetMatch);
      els.changeMode.addEventListener("click", changeMode);
      els.changeModeInline.addEventListener("click", changeMode);
      els.cancelPower.addEventListener("click", function () {
        if (!state) {
          return;
        }

        state = engine.cancelPendingPower(state);
        render();
      });

      els.dropRow.addEventListener("click", function (event) {
        var button = event.target;
        var lane;

        if (!state || !(button instanceof HTMLButtonElement) || button.dataset.column === undefined) {
          return;
        }

        lane = Number(button.dataset.column);

        if (state.pendingPower && state.pendingPower.name !== "Shield" && state.pendingPower.name !== "Bomb Piece") {
          state = engine.applyPowerToColumn(state, lane);
          clearActiveControlFocus();
          render();
          return;
        }

        playColumn(lane);
      });

      els.board.addEventListener("click", function (event) {
        var target = event.target;
        var cell;
        var row;
        var col;
        var lane;

        if (!state || !(target instanceof Element)) {
          return;
        }

        cell = target.closest(".cfp-cell");
        row = cell ? Number(cell.dataset.row) : NaN;
        col = cell ? Number(cell.dataset.column) : NaN;
        lane = cell ? getCellDropLane(row, col) : getBoardColumnFromPointer(event);

        if (!Number.isInteger(lane)) {
          return;
        }

        if (state.pendingPower && state.pendingPower.name === "Shield") {
          if (!Number.isInteger(row)) {
            return;
          }
          state = engine.applyPowerToCell(state, row, col);
        } else if (state.pendingPower && state.pendingPower.name !== "Bomb Piece") {
          state = engine.applyPowerToColumn(state, lane);
        } else {
          playColumn(lane);
          return;
        }

        clearActiveControlFocus();
        render();
      });

      els.hand.addEventListener("click", function (event) {
        var button;

        if (!state || !(event.target instanceof Element)) {
          return;
        }

        button = event.target.closest("[data-hand-index], [data-special]");

        if (!button) {
          return;
        }

        if (button.dataset.special) {
          state = engine.selectSpecial(state, button.dataset.special);
        } else {
          state = engine.selectPower(state, Number(button.dataset.handIndex));
        }
        render();
      });

      els.handSummary.addEventListener("click", function (event) {
        var button;

        if (!state || !(event.target instanceof Element)) {
          return;
        }

        button = event.target.closest("[data-summary-tool]");
        if (!button || button.dataset.player !== state.currentPlayer) {
          return;
        }

        if (button.classList.contains("is-selected")) {
          state = engine.cancelPendingPower(state);
        } else if (button.dataset.special) {
          state = engine.selectSpecial(state, button.dataset.special);
        } else if (button.dataset.handIndex !== undefined) {
          state = engine.selectPower(state, Number(button.dataset.handIndex));
        }
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

    function changeMode() {
      state = null;
      selectedModeId = null;
      matchRecorded = false;
      lastRecordStatus = null;
      animatedDropKey = null;
      animatedPopKey = null;
      animatedSwapKey = null;
      animatedGravityShiftId = null;
      animatedColumnBattleKey = null;
      columnBattleDropReadyKey = null;
      tokenRevealAnimations = [];
      render();
      scrollGameToTop();
    }

    function startMode(modeId) {
      selectedModeId = modeId;
      state = engine.createInitialState({ modeId: selectedModeId });
      matchRecorded = false;
      lastRecordStatus = null;
      animatedDropKey = null;
      animatedPopKey = null;
      animatedSwapKey = null;
      animatedGravityShiftId = null;
      animatedColumnBattleKey = null;
      columnBattleDropReadyKey = null;
      tokenRevealAnimations = [];
      render();
      scrollGameToTop();
    }

    function resetMatch() {
      if (!selectedModeId && state) {
        selectedModeId = state.modeId;
      }

      if (!selectedModeId) {
        render();
        return;
      }

      state = engine.createInitialState({ modeId: selectedModeId });
      matchRecorded = false;
      lastRecordStatus = null;
      animatedDropKey = null;
      animatedPopKey = null;
      animatedSwapKey = null;
      animatedGravityShiftId = null;
      animatedColumnBattleKey = null;
      columnBattleDropReadyKey = null;
      tokenRevealAnimations = [];
      render();
      scrollGameToTop();
    }

    function scrollGameToTop() {
      if (services.scrollToTop) {
        services.scrollToTop();
      }
    }

    function clearActiveControlFocus() {
      var active = document.activeElement;

      if (active instanceof HTMLElement && root.contains(active)) {
        active.blur();
      }
    }

    function getBoardColumnFromPointer(event) {
      var rect = els.board.getBoundingClientRect();
      var x = event.clientX - rect.left;
      var y = event.clientY - rect.top;
      var mode = state ? engine.getMode(state.modeId) : null;
      var horizontalGravity = mode && mode.gravity && (state.gravityDirection === "left" || state.gravityDirection === "right");
      var laneCount = state ? engine.getDropLaneCount(state) : engine.COLS;

      if (x < 0 || x > rect.width || y < 0 || y > rect.height) {
        return NaN;
      }

      if (horizontalGravity) {
        return Math.max(0, Math.min(laneCount - 1, Math.floor((y / rect.height) * laneCount)));
      }

      return Math.max(0, Math.min(laneCount - 1, Math.floor((x / rect.width) * laneCount)));
    }

    function playColumn(col) {
      if (!state || state.winner || state.draw) {
        return;
      }

      clearActiveControlFocus();
      state = engine.dropPiece(state, col);
      queueTokenReveal(state.lastMove);
      maybeRecordMatch();
      render();
    }

    function queueTokenReveal(lastMove) {
      var tokenFound = lastMove && lastMove.tokenFound;
      var reveal;

      if (!tokenFound || !tokenFound.hidden) {
        return;
      }

      reveal = {
        id: state.dropCount + ":" + tokenFound.row + ":" + tokenFound.col + ":" + tokenFound.power,
        row: tokenFound.row,
        col: tokenFound.col,
        power: tokenFound.power,
        player: tokenFound.player
      };
      tokenRevealAnimations.push(reveal);

      global.setTimeout(function () {
        tokenRevealAnimations = tokenRevealAnimations.filter(function (animation) {
          return animation.id !== reveal.id;
        });
        if (mounted) {
          render();
        }
      }, 3000);
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
      var gameStarted = Boolean(state && (state.turnCount > 0 || state.dropCount > 0 || hasPlannedMove()));
      var inputs = [
        [els.redName, "R"],
        [els.redNameLive, "R"],
        [els.yellowName, "Y"],
        [els.yellowNameLive, "Y"]
      ];

      inputs.forEach(function (entry) {
        var input = entry[0];
        var mark = entry[1];

        if (!input) {
          return;
        }

        if (input.value !== playerNames[mark]) {
          input.value = playerNames[mark];
        }
        input.disabled = gameStarted;
      });
    }

    function hasPlannedMove() {
      return Boolean(state && state.simultaneous && (state.simultaneous.plans.R !== undefined || state.simultaneous.plans.Y !== undefined));
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
      var mode = state ? engine.getMode(state.modeId) : null;
      var power = state && state.pendingPower && state.pendingPower.name;

      if (!state) {
        return "Choose a variant to launch.";
      }

      if (state.lastError) {
        return state.lastError;
      }

      if (state.winner) {
        return getPlayerLabel(state.winner) + " wins " + mode.title + "." + getRecordSuffix();
      }

      if (state.draw) {
        return mode.title + " ends in a draw." + getRecordSuffix();
      }

      if (state.pendingHandoff) {
        return "Fog board hidden for pass-and-play privacy.";
      }

      if (state.simultaneous && mode.simultaneous && hasPlannedMove()) {
        return getPlayerLabel(state.currentPlayer) + " chooses the second planned column.";
      }

      if (state.pendingDropKind === "bomb") {
        return "Bomb piece selected. Choose a legal column.";
      }

      if (state.pendingDropKind === "wild") {
        return "Wild piece selected. Choose a legal column.";
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

      if (mode.simultaneous) {
        return getPlayerLabel(state.currentPlayer) + " chooses a planned column.";
      }

      return getPlayerLabel(state.currentPlayer) + " drops a piece in " + mode.title + ".";
    }

    function render() {
      syncNameInputs();

      if (!state) {
        renderModeSelect();
        return;
      }

      renderPrivacyState();
      renderBoardTheme();
      renderStatus();
      renderHandSummary();
      renderDropButtons();
      renderWinBanner();
      renderBoard();
      renderColumnBattle();
      renderHand();
      renderRulesMini();
      renderLog();
    }

    function renderModeSelect() {
      var fragment = document.createDocumentFragment();

      els.modeSelect.hidden = false;
      els.handoffPanel.hidden = true;
      els.liveArea.hidden = true;
      els.modeList.replaceChildren();

      engine.MODES.forEach(function (mode) {
        var card = document.createElement("button");
        var title = document.createElement("strong");
        var meta = document.createElement("span");
        var copy = document.createElement("span");

        card.type = "button";
        card.className = "cfp-mode-card";
        card.dataset.modeId = mode.id;

        title.textContent = mode.title;
        meta.textContent = mode.cols + "x" + mode.rows + " | connect " + mode.connect + " | " + mode.bestFor;
        copy.textContent = mode.summary;

        card.append(title, meta, copy);
        fragment.appendChild(card);
      });

      els.modeList.appendChild(fragment);
      if (services.setSessionChip) {
        services.setSessionChip("MODE: SELECT");
      }
    }

    function renderPrivacyState() {
      var usesHandoff = engine.modeUsesHandoff(state);
      var activeName = getPlayerLabel(state.currentPlayer);

      els.modeSelect.hidden = true;
      els.handoffPanel.hidden = !usesHandoff || (!state.pendingHandoff && !state.winner && !state.draw);
      els.liveArea.hidden = usesHandoff && state.pendingHandoff && !state.winner && !state.draw;
      els.nameSetup.hidden = state.turnCount > 0 || state.dropCount > 0 || hasPlannedMove();

      if (state.winner || state.draw) {
        els.handoffPanel.hidden = true;
        els.liveArea.hidden = false;
      }

      els.handoffTitle.textContent = "Pass to " + activeName;
      els.handoffCopy.textContent = activeName + ", tap Start Turn when the device is in your hands. Fog and private tools stay covered between turns.";
    }

    function renderStatus() {
      var mode = engine.getMode(state.modeId);

      els.statusLine.classList.toggle("is-error", Boolean(state.lastError));
      els.statusLine.textContent = getStatusText();
      els.modeReadout.textContent = mode.title;
      els.turnReadout.textContent = state.winner || state.draw ? "Ended" : getPlayerLabel(state.currentPlayer);
      els.lockReadout.textContent = getConstraintText(mode);
      els.turnCount.textContent = String(state.turnCount);
      els.dropCount.textContent = String(state.dropCount);
      els.cancelPower.disabled = !state.pendingPower && state.pendingDropKind === "normal";

      if (services.setSessionChip) {
        services.setSessionChip(state.winner || state.draw ? "SESSION: COMPLETE" : mode.title.toUpperCase());
      }
    }

    function getConstraintText(mode) {
      if (state.lockedColumn !== null) {
        return "Column " + (state.lockedColumn + 1) + " locked for " + engine.PLAYER_LABELS[state.lockedFor];
      }

      if (state.pendingDropKind !== "normal") {
        return state.pendingDropKind.toUpperCase();
      }

      if (mode.gravity) {
        return "Gravity " + state.gravityDirection + " | enter " + engine.getGravityEntrySide(state.gravityDirection);
      }

      if (mode.shrinking) {
        if (state.turnCount < 10) {
          return "Left edge at turn 10";
        }
        if (state.turnCount < 18) {
          return "Right edge at turn 18";
        }
        return "Edges removed";
      }

      if (mode.objectives) {
        return state.players[state.currentPlayer].objective || "Objective";
      }

      if (mode.tokens) {
        return state.tokens.length + " tokens";
      }

      return "Open";
    }

    function renderBoardTheme() {
      var mode = engine.getMode(state.modeId);
      var directions = ["down", "left", "up", "right"];

      els.boardPanel.classList.toggle("is-red-turn", state.currentPlayer === "R");
      els.boardPanel.classList.toggle("is-yellow-turn", state.currentPlayer === "Y");
      els.board.classList.toggle("is-gravity-board", Boolean(mode.gravity));
      directions.forEach(function (direction) {
        els.board.classList.toggle("gravity-" + direction, mode.gravity && state.gravityDirection === direction);
      });
    }

    function renderHandSummary() {
      var fragment = document.createDocumentFragment();

      els.handSummary.replaceChildren();

      engine.PLAYERS.forEach(function (mark) {
        var row = document.createElement("div");
        var name = document.createElement("span");
        var tools = document.createElement("span");
        var toolEntries = getPlayerToolEntries(mark);

        row.className = "cfp-hand-summary-row " + (mark === "R" ? "red" : "yellow");
        row.classList.toggle("is-active", mark === state.currentPlayer && !state.winner && !state.draw);

        name.className = "cfp-hand-summary-player";
        name.textContent = getPlayerLabel(mark);

        tools.className = "cfp-hand-summary-tools";
        toolEntries.forEach(function (toolEntry) {
          var chip = createHandSummaryChip(mark, toolEntry);

          tools.appendChild(chip);
        });

        row.append(name, tools);
        fragment.appendChild(row);
      });

      els.handSummary.appendChild(fragment);
    }

    function getPlayerToolEntries(mark) {
      var player = state.players[mark];
      var tools = player.hand.map(function (name, index) {
        return {
          type: "hand",
          name: name,
          handIndex: index
        };
      });

      if (player.bombs > 0) {
        tools.push({
          type: "special",
          name: "Bomb x" + player.bombs,
          special: "bomb"
        });
      }

      if (player.wilds > 0) {
        tools.push({
          type: "special",
          name: "Wild x" + player.wilds,
          special: "wild"
        });
      }

      if (player.locks > 0) {
        tools.push({
          type: "special",
          name: "Lock x" + player.locks,
          special: "lock"
        });
      }

      if (!tools.length) {
        tools.push({
          type: "empty",
          name: "None"
        });
      }

      return tools;
    }

    function createHandSummaryChip(mark, toolEntry) {
      var chip = document.createElement(toolEntry.type === "empty" ? "span" : "button");
      var selected = isSummaryToolSelected(toolEntry);
      var disabled = toolEntry.type === "empty" || mark !== state.currentPlayer || !canUseSummaryTool(toolEntry, selected);

      chip.className = "cfp-hand-chip";
      chip.classList.toggle("is-selected", selected);
      chip.textContent = toolEntry.name;

      if (toolEntry.type !== "empty") {
        chip.type = "button";
        chip.dataset.summaryTool = "true";
        chip.dataset.player = mark;
        if (toolEntry.type === "hand") {
          chip.dataset.handIndex = String(toolEntry.handIndex);
        }
        if (toolEntry.type === "special") {
          chip.dataset.special = toolEntry.special;
        }
        chip.disabled = disabled;
        chip.setAttribute("aria-pressed", selected ? "true" : "false");
        chip.title = selected ? "Cancel " + toolEntry.name : "Activate " + toolEntry.name;
      }

      return chip;
    }

    function isSummaryToolSelected(toolEntry) {
      if (toolEntry.type === "hand") {
        return Boolean(state.pendingPower && state.pendingPower.handIndex === toolEntry.handIndex);
      }

      if (toolEntry.special === "lock") {
        return Boolean(state.pendingPower && state.pendingPower.name === "Column Lock");
      }

      if (toolEntry.special === "bomb" || toolEntry.special === "wild") {
        return state.pendingDropKind === toolEntry.special;
      }

      return false;
    }

    function canUseSummaryTool(toolEntry, selected) {
      if (selected) {
        return true;
      }

      if (!state.turnOpen || state.pendingHandoff || state.winner || state.draw) {
        return false;
      }

      if (toolEntry.type === "hand") {
        return !state.powerUsedThisTurn && !state.pendingPower && state.pendingDropKind === "normal";
      }

      if (toolEntry.type === "special") {
        return !state.pendingPower && state.pendingDropKind === "normal" && !(toolEntry.special === "lock" && state.powerUsedThisTurn);
      }

      return false;
    }

    function renderDropButtons() {
      var fragment = document.createDocumentFragment();
      var legalColumns = engine.getLegalDropColumns(state);
      var lane;
      var laneCount = engine.getDropLaneCount(state);
      var mode = engine.getMode(state.modeId);
      var laneType = mode.gravity && (state.gravityDirection === "left" || state.gravityDirection === "right") ? "row" : "column";

      els.dropRow.replaceChildren();
      els.dropRow.style.setProperty("--cfp-cols", String(laneCount));
      els.dropRow.setAttribute("aria-label", "Drop by " + laneType);

      for (lane = 0; lane < laneCount; lane += 1) {
        var button = document.createElement("button");
        var landingPosition = engine.getLandingPosition(state, lane);
        var columnPower = state.pendingPower && state.pendingPower.name !== "Shield" && state.pendingPower.name !== "Bomb Piece";
        var pendingDropTool = state.pendingDropKind !== "normal";
        var label = engine.getDropLaneLabel(state, lane);
        var lockedForActivePlayer = state.lockedFor === state.currentPlayer && state.lockedColumn === lane;

        button.type = "button";
        button.className = "cfp-drop-button";
        button.classList.toggle("is-locked", lockedForActivePlayer);
        button.dataset.column = String(lane);
        button.textContent = lockedForActivePlayer ? "LOCK" : (label.indexOf("Row") === 0 ? "R" + (lane + 1) : String(lane + 1));
        button.setAttribute("aria-label", lockedForActivePlayer ? label + " locked" : "Play " + label);
        button.disabled = !state.turnOpen || Boolean(state.winner) || state.draw || !landingPosition || (state.pendingPower && !columnPower && !pendingDropTool) || (!columnPower && legalColumns.indexOf(lane) === -1);
        fragment.appendChild(button);
      }

      els.dropRow.appendChild(fragment);
    }

    function renderWinBanner() {
      if (state.winner) {
        els.winBanner.hidden = false;
        els.endActions.hidden = false;
        els.winBanner.textContent = getPlayerLabel(state.winner) + " Won!";
        return;
      }

      els.winBanner.hidden = true;
      els.endActions.hidden = true;
      els.winBanner.textContent = "";
    }

    function renderColumnBattle() {
      var battle = getColumnBattle();
      var battleKey = battle ? getColumnBattleKey(battle) : null;

      if (!battle) {
        els.columnBattle.hidden = true;
        return;
      }

      if (battleKey === animatedColumnBattleKey) {
        els.columnBattle.hidden = columnBattleDropReadyKey === battleKey;
        return;
      }

      animatedColumnBattleKey = battleKey;
      columnBattleDropReadyKey = null;
      els.columnBattle.hidden = false;
      els.columnBattle.classList.toggle("is-red-winner", battle.firstPlayer === "R");
      els.columnBattle.classList.toggle("is-yellow-winner", battle.firstPlayer === "Y");
      els.columnBattleResult.textContent = getPlayerLabel(battle.firstPlayer) + " drops first";

      global.setTimeout(function () {
        if (mounted && animatedColumnBattleKey === battleKey) {
          columnBattleDropReadyKey = battleKey;
          els.columnBattle.hidden = true;
          render();
        }
      }, 2600);
    }

    function getColumnBattleKey(battle) {
      return state.dropCount + ":" + battle.column + ":" + battle.firstPlayer;
    }

    function getColumnBattle() {
      if (!state.lastMove || state.lastMove.kind !== "drop" || !state.lastMove.columnBattle) {
        return null;
      }

      return state.lastMove.columnBattle;
    }

    function isWinningCell(row, col) {
      return Boolean(state.winningLine && state.winningLine.some(function (position) {
        return position[0] === row && position[1] === col;
      }));
    }

    function renderBoard() {
      var fragment = document.createDocumentFragment();
      var legalColumns = engine.getLegalDropColumns(state);
      var dropBatch = getDropBatch();
      var dropBatchKey = getDropBatchKey(dropBatch);
      var battle = getColumnBattle();
      var battleKey = battle ? getColumnBattleKey(battle) : null;
      var battleDropReady = !battleKey || columnBattleDropReadyKey === battleKey;
      var animateDropBatch = Boolean(dropBatchKey && dropBatchKey !== animatedDropKey && battleDropReady);
      var hidePendingBattleDrops = Boolean(dropBatchKey && battleKey && !battleDropReady && dropBatchKey !== animatedDropKey);
      var popKey = getPopAnimationKey();
      var animatePop = Boolean(popKey && popKey !== animatedPopKey);
      var swapKey = getSwapAnimationKey();
      var animateSwap = Boolean(swapKey && swapKey !== animatedSwapKey);
      var cellRects = getCurrentCellRects();
      var row;
      var col;

      els.board.replaceChildren();
      els.board.style.setProperty("--cfp-cols", String(state.cols));

      for (row = 0; row < state.rows; row += 1) {
        for (col = 0; col < state.cols; col += 1) {
          var cell = document.createElement("button");
          var removed = engine.isRemovedColumn(state, col);
          var displayPiece = removed ? null : engine.getDisplayCell(state, row, col, state.currentPlayer);
          var actualPiece = state.board[row][col];
          var lane = getCellDropLane(row, col);
          var playableColumn = state.turnOpen && !state.pendingHandoff && (!state.pendingPower || state.pendingDropKind !== "normal") && !state.winner && !state.draw && !removed && legalColumns.indexOf(lane) !== -1;
          var label = "Row " + (row + 1) + ", column " + (col + 1);
          var token = removed ? null : engine.getTokenAt(state, row, col);
          var winning = isWinningCell(row, col);

          cell.type = "button";
          cell.className = "cfp-cell";
          cell.dataset.row = String(row);
          cell.dataset.column = String(col);
          cell.setAttribute("role", "gridcell");
          cell.setAttribute("aria-label", getCellLabel(label, displayPiece, removed));
          cell.setAttribute("aria-disabled", playableColumn || state.pendingPower ? "false" : "true");

          if (removed) {
            cell.classList.add("is-removed");
          }

          if (playableColumn) {
            cell.classList.add("is-playable-column");
          }

          if (displayPiece) {
            var disc = createDisc(displayPiece, actualPiece, dropBatch, animateDropBatch, hidePendingBattleDrops, row, col, winning, cellRects, animatePop, animateSwap);

            if (disc) {
              if (disc.classList.contains("is-dropping") || disc.classList.contains("is-gravity-shifting") || disc.classList.contains("is-swapping")) {
                cell.classList.add("is-animation-lane");
              }
              cell.appendChild(disc);
            }
          } else if (token && token.visible) {
            cell.appendChild(createToken());
          }

          appendBombDrop(cell, row, col, dropBatch, dropBatchKey, animateDropBatch);
          appendBombPreBlastPiece(cell, row, col, dropBatch, animateDropBatch);
          appendPopAnimation(cell, row, col, popKey, animatePop);
          appendTokenReveals(cell, row, col);
          appendBombClears(cell, row, col, dropBatch, dropBatchKey, animateDropBatch);

          if (winning) {
            cell.classList.add("is-winning");
          }

          fragment.appendChild(cell);
        }
      }

      els.board.appendChild(fragment);
      if (animateDropBatch) {
        animatedDropKey = dropBatchKey;
      }
      if (animatePop) {
        animatedPopKey = popKey;
      }
      if (animateSwap) {
        animatedSwapKey = swapKey;
      }
      if (state.gravityShift && state.gravityShift.id !== animatedGravityShiftId) {
        animatedGravityShiftId = state.gravityShift.id;
      }
    }

    function getCurrentCellRects() {
      var rects = {};

      els.board.querySelectorAll(".cfp-cell").forEach(function (cell) {
        rects[cell.dataset.row + ":" + cell.dataset.column] = cell.getBoundingClientRect();
      });

      return rects;
    }

    function getCellDropLane(row, col) {
      var mode = engine.getMode(state.modeId);

      if (mode.gravity && (state.gravityDirection === "left" || state.gravityDirection === "right")) {
        return row;
      }

      return col;
    }

    function getCellLabel(label, piece, removed) {
      if (removed) {
        return label + " removed";
      }

      if (!piece) {
        return label + " empty";
      }

      if (piece.mystery) {
        return label + " hidden occupied cell";
      }

      if (piece.wild) {
        return label + " occupied by a wild piece";
      }

      return label + " occupied by " + engine.PLAYER_LABELS[piece.player];
    }

    function getDropBatch() {
      if (!state.lastMove || state.lastMove.kind !== "drop") {
        return [];
      }

      if (Array.isArray(state.lastMove.simultaneousDrops)) {
        return state.lastMove.simultaneousDrops.filter(Boolean);
      }

      return [state.lastMove];
    }

    function getDropBatchKey(dropBatch) {
      if (!dropBatch.length) {
        return null;
      }

      return state.dropCount + ":" + dropBatch.map(function (drop) {
        return [drop.player, drop.pieceId, drop.row, drop.col, drop.sequenceIndex || 0].join("-");
      }).join("|");
    }

    function getPopAnimationKey() {
      var popped = state.lastMove && state.lastMove.popRemoved;

      if (!state.lastMove || state.lastMove.kind !== "power" || state.lastMove.power !== "Pop" || !popped) {
        return null;
      }

      return ["pop", state.publicLog.length, popped.id, popped.row, popped.col].join(":");
    }

    function getSwapAnimationKey() {
      var moves = state.lastMove && state.lastMove.swapMoves;

      if (!state.lastMove || state.lastMove.kind !== "power" || state.lastMove.power !== "Swap Top" || !Array.isArray(moves)) {
        return null;
      }

      return "swap:" + state.publicLog.length + ":" + moves.map(function (move) {
        return [move.pieceId, move.fromRow, move.fromCol, move.toRow, move.toCol].join("-");
      }).join("|");
    }

    function getDropForCell(dropBatch, actualPiece, row, col) {
      if (!actualPiece) {
        return null;
      }

      return dropBatch.find(function (drop) {
        if (drop.pieceId !== undefined && drop.pieceId !== null) {
          return drop.pieceId === actualPiece.id;
        }

        return drop.row === row && drop.col === col && drop.player === actualPiece.player;
      }) || null;
    }

    function createDisc(displayPiece, actualPiece, dropBatch, animateDropBatch, hidePendingBattleDrops, row, col, winning, cellRects, animatePop, animateSwap) {
      var disc = document.createElement("span");
      var gravityMove = getGravityShiftMove(actualPiece, row, col);
      var bombSettleMove = getBombSettleMove(actualPiece, row, col, dropBatch);
      var popSettleMove = getPopSettleMove(actualPiece, row, col);
      var swapMove = getSwapMove(actualPiece, row, col);
      var dropMove = getDropForCell(dropBatch, actualPiece, row, col);

      if (dropMove && hidePendingBattleDrops) {
        return null;
      }

      if (displayPiece.mystery) {
        disc.className = "cfp-disc mystery";
        return disc;
      }

      disc.className = "cfp-disc " + (displayPiece.wild ? "wild" : (displayPiece.player === "R" ? "red" : "yellow"));
      if (displayPiece.shielded) {
        disc.classList.add("shielded");
      }
      if (actualPiece && actualPiece.bomb) {
        disc.classList.add("bomb");
      }
      if (winning && state.winner) {
        disc.classList.add("is-winning-piece");
      }

      if (gravityMove) {
        applyGravityShiftAnimation(disc, gravityMove);
      } else if (bombSettleMove && animateDropBatch) {
        applyBombSettleAnimation(disc, bombSettleMove, cellRects);
      } else if (popSettleMove && animatePop) {
        applyPopSettleAnimation(disc, popSettleMove, cellRects);
      } else if (swapMove && animateSwap) {
        applySwapAnimation(disc, swapMove, cellRects);
      } else if (dropMove && animateDropBatch) {
        var dropAnimation = getDropAnimation(dropMove, row, col);

        disc.classList.add("is-dropping");
        disc.style.setProperty("--cfp-drop-x", dropAnimation.x);
        disc.style.setProperty("--cfp-drop-y", dropAnimation.y);
        disc.style.setProperty("--cfp-drop-mid-x", dropAnimation.midX);
        disc.style.setProperty("--cfp-drop-mid-y", dropAnimation.midY);
        disc.style.setProperty("--cfp-bounce-x", dropAnimation.bounceX);
        disc.style.setProperty("--cfp-bounce-y", dropAnimation.bounceY);
        disc.style.setProperty("--cfp-rebound-x", dropAnimation.reboundX);
        disc.style.setProperty("--cfp-rebound-y", dropAnimation.reboundY);
        disc.style.setProperty("--cfp-settle-x", dropAnimation.settleX);
        disc.style.setProperty("--cfp-settle-y", dropAnimation.settleY);
        disc.style.setProperty("--cfp-drop-duration", dropAnimation.duration);
        disc.style.setProperty("--cfp-drop-delay", dropMove.sequenceIndex ? "120ms" : "0ms");
      }

      return disc;
    }

    function getBombSettleMove(piece, row, col, dropBatch) {
      var bombDrop;

      if (!piece || !state.lastMove || state.lastMove.dropKind !== "bomb" || !Array.isArray(state.lastMove.bombSettledMoves)) {
        return null;
      }

      bombDrop = dropBatch.find(function (drop) {
        return drop.dropKind === "bomb";
      });
      if (!bombDrop) {
        return null;
      }

      return state.lastMove.bombSettledMoves.find(function (move) {
        return move.pieceId === piece.id && move.toRow === row && move.toCol === col;
      }) || null;
    }

    function applyBombSettleAnimation(disc, move, cellRects) {
      var animation = getBombSettleAnimation(move, cellRects);

      disc.classList.add("is-dropping");
      disc.style.setProperty("--cfp-drop-x", animation.x);
      disc.style.setProperty("--cfp-drop-y", animation.y);
      disc.style.setProperty("--cfp-drop-mid-x", animation.midX);
      disc.style.setProperty("--cfp-drop-mid-y", animation.midY);
      disc.style.setProperty("--cfp-bounce-x", animation.bounceX);
      disc.style.setProperty("--cfp-bounce-y", animation.bounceY);
      disc.style.setProperty("--cfp-rebound-x", animation.reboundX);
      disc.style.setProperty("--cfp-rebound-y", animation.reboundY);
      disc.style.setProperty("--cfp-settle-x", animation.settleX);
      disc.style.setProperty("--cfp-settle-y", animation.settleY);
      disc.style.setProperty("--cfp-drop-duration", animation.duration);
      disc.style.setProperty("--cfp-drop-delay", getBombSettleDelay());
    }

    function getPopSettleMove(piece, row, col) {
      if (!piece || !state.lastMove || state.lastMove.kind !== "power" || state.lastMove.power !== "Pop" || !Array.isArray(state.lastMove.popSettledMoves)) {
        return null;
      }

      return state.lastMove.popSettledMoves.find(function (move) {
        return move.pieceId === piece.id && move.toRow === row && move.toCol === col;
      }) || null;
    }

    function applyPopSettleAnimation(disc, move, cellRects) {
      var animation = getBombSettleAnimation(move, cellRects);

      disc.classList.add("is-dropping");
      disc.style.setProperty("--cfp-drop-x", animation.x);
      disc.style.setProperty("--cfp-drop-y", animation.y);
      disc.style.setProperty("--cfp-drop-mid-x", animation.midX);
      disc.style.setProperty("--cfp-drop-mid-y", animation.midY);
      disc.style.setProperty("--cfp-bounce-x", animation.bounceX);
      disc.style.setProperty("--cfp-bounce-y", animation.bounceY);
      disc.style.setProperty("--cfp-rebound-x", animation.reboundX);
      disc.style.setProperty("--cfp-rebound-y", animation.reboundY);
      disc.style.setProperty("--cfp-settle-x", animation.settleX);
      disc.style.setProperty("--cfp-settle-y", animation.settleY);
      disc.style.setProperty("--cfp-drop-duration", animation.duration);
      disc.style.setProperty("--cfp-drop-delay", POP_SETTLE_DELAY_MS + "ms");
    }

    function getSwapMove(piece, row, col) {
      if (!piece || !state.lastMove || state.lastMove.kind !== "power" || state.lastMove.power !== "Swap Top" || !Array.isArray(state.lastMove.swapMoves)) {
        return null;
      }

      return state.lastMove.swapMoves.find(function (move) {
        return move.pieceId === piece.id && move.toRow === row && move.toCol === col;
      }) || null;
    }

    function applySwapAnimation(disc, move, cellRects) {
      var animation = getSwapAnimation(move, cellRects);

      disc.classList.add("is-swapping");
      disc.style.setProperty("--cfp-swap-start-x", animation.startX);
      disc.style.setProperty("--cfp-swap-start-y", animation.startY);
      disc.style.setProperty("--cfp-swap-mid-x", animation.midX);
      disc.style.setProperty("--cfp-swap-mid-y", animation.midY);
    }

    function appendBombDrop(cell, row, col, dropBatch, dropBatchKey, animateDropBatch) {
      var bombDrop = dropBatch.find(function (drop) {
        return drop.dropKind === "bomb";
      });
      var bomb;
      var dropAnimation;

      if (!bombDrop || !animateDropBatch || bombDrop.row !== row || bombDrop.col !== col) {
        return;
      }

      dropAnimation = getDropAnimation(bombDrop, row, col);
      bomb = document.createElement("span");
      bomb.className = "cfp-bomb-drop " + (bombDrop.player === "R" ? "red" : "yellow");
      bomb.style.setProperty("--cfp-drop-x", dropAnimation.x);
      bomb.style.setProperty("--cfp-drop-y", dropAnimation.y);
      bomb.style.setProperty("--cfp-drop-mid-x", dropAnimation.midX);
      bomb.style.setProperty("--cfp-drop-mid-y", dropAnimation.midY);
      bomb.style.setProperty("--cfp-bounce-x", dropAnimation.bounceX);
      bomb.style.setProperty("--cfp-bounce-y", dropAnimation.bounceY);
      bomb.style.setProperty("--cfp-rebound-x", dropAnimation.reboundX);
      bomb.style.setProperty("--cfp-rebound-y", dropAnimation.reboundY);
      bomb.style.setProperty("--cfp-settle-x", dropAnimation.settleX);
      bomb.style.setProperty("--cfp-settle-y", dropAnimation.settleY);
      bomb.style.setProperty("--cfp-drop-duration", dropAnimation.duration);
      cell.classList.add("is-animation-lane");
      cell.appendChild(bomb);
    }

    function appendBombPreBlastPiece(cell, row, col, dropBatch, animateDropBatch) {
      var bombDrop = dropBatch.find(function (drop) {
        return drop.dropKind === "bomb";
      });
      var cleared;
      var piece;
      var dropAnimation;

      if (!bombDrop || !animateDropBatch || !Array.isArray(bombDrop.bombCleared)) {
        return;
      }

      cleared = bombDrop.bombCleared.find(function (entry) {
        return entry.row === row && entry.col === col;
      });

      if (!cleared || (cleared.bomb && row === bombDrop.row && col === bombDrop.col)) {
        return;
      }

      dropAnimation = getDropAnimation(bombDrop, bombDrop.row, bombDrop.col);
      piece = document.createElement("span");
      piece.className = "cfp-disc cfp-preblast-piece " + (cleared.wild ? "wild" : (cleared.player === "R" ? "red" : "yellow"));
      if (cleared.bomb) {
        piece.classList.add("bomb");
      }
      piece.style.setProperty("--cfp-blast-delay", "calc(" + dropAnimation.duration + " - 90ms)");
      cell.classList.add("is-animation-lane");
      cell.appendChild(piece);
    }

    function appendPopAnimation(cell, row, col, popKey, animatePop) {
      var popped = state.lastMove && state.lastMove.popRemoved;
      var piece;
      var ring;

      if (!popKey || !animatePop || !popped || popped.row !== row || popped.col !== col) {
        return;
      }

      piece = createOverlayDisc(popped, "cfp-pop-piece");
      ring = document.createElement("span");
      ring.className = "cfp-pop-ring " + (popped.player === "R" ? "red" : "yellow");
      cell.classList.add("is-animation-lane");
      cell.append(piece, ring);
    }

    function createOverlayDisc(piece, className) {
      var disc = document.createElement("span");

      disc.className = "cfp-disc " + className + " " + (piece.wild ? "wild" : (piece.player === "R" ? "red" : "yellow"));
      if (piece.bomb) {
        disc.classList.add("bomb");
      }
      if (piece.shielded) {
        disc.classList.add("shielded");
      }

      return disc;
    }

    function appendBombClears(cell, row, col, dropBatch, dropBatchKey, animateDropBatch) {
      var lastDrop = dropBatch[dropBatch.length - 1];
      var blast;
      var dropAnimation;

      if (!lastDrop || lastDrop.dropKind !== "bomb" || !animateDropBatch || !Array.isArray(lastDrop.bombCleared)) {
        return;
      }

      if (!lastDrop.bombCleared.some(function (cleared) {
        return cleared.row === row && cleared.col === col;
      })) {
        return;
      }

      dropAnimation = getDropAnimation(lastDrop, lastDrop.row, lastDrop.col);
      blast = document.createElement("span");
      blast.className = "cfp-bomb-blast";
      blast.classList.toggle("is-center", row === lastDrop.row && col === lastDrop.col);
      blast.classList.toggle("red", lastDrop.player === "R");
      blast.classList.toggle("yellow", lastDrop.player === "Y");
      blast.style.setProperty("--cfp-blast-delay", "calc(" + dropAnimation.duration + " - 120ms)");
      cell.classList.add("is-animation-lane");
      cell.appendChild(blast);
    }

    function getBombSettleAnimation(move, cellRects) {
      var deltaCol = move.fromCol - move.toCol;
      var deltaRow = move.fromRow - move.toRow;
      var startX = deltaCol * 126;
      var startY = deltaRow * 126;
      var measuredDelta = getCellCenterDelta(cellRects, move.fromRow, move.fromCol, move.toRow, move.toCol);
      var startUnit = "%";
      var bounceX = deltaCol < 0 ? 10 : (deltaCol > 0 ? -10 : 0);
      var bounceY = deltaRow < 0 ? 10 : (deltaRow > 0 ? -10 : 0);
      var reboundX = bounceX ? bounceX * -0.4 : 0;
      var reboundY = bounceY ? bounceY * -0.4 : 0;
      var travelCells = Math.max(Math.abs(deltaCol), Math.abs(deltaRow), 1);

      if (measuredDelta) {
        startX = measuredDelta.x;
        startY = measuredDelta.y;
        startUnit = "px";
      }

      return {
        x: startX + startUnit,
        y: startY + startUnit,
        midX: (startX * 0.34) + startUnit,
        midY: (startY * 0.34) + startUnit,
        bounceX: bounceX + "%",
        bounceY: bounceY + "%",
        reboundX: reboundX + "%",
        reboundY: reboundY + "%",
        settleX: (bounceX * 0.28) + "%",
        settleY: (bounceY * 0.28) + "%",
        duration: Math.min(980, 430 + travelCells * 76) + "ms"
      };
    }

    function getCellCenterDelta(cellRects, fromRow, fromCol, toRow, toCol) {
      var fromRect;
      var toRect;

      if (!cellRects) {
        return null;
      }

      fromRect = cellRects[fromRow + ":" + fromCol];
      toRect = cellRects[toRow + ":" + toCol];

      if (!fromRect || !toRect) {
        return null;
      }

      return {
        x: (fromRect.left + fromRect.width / 2) - (toRect.left + toRect.width / 2),
        y: (fromRect.top + fromRect.height / 2) - (toRect.top + toRect.height / 2)
      };
    }

    function getSwapAnimation(move, cellRects) {
      var deltaCol = move.fromCol - move.toCol;
      var deltaRow = move.fromRow - move.toRow;
      var startX = deltaCol * 126;
      var startY = deltaRow * 126;
      var measuredDelta = getCellCenterDelta(cellRects, move.fromRow, move.fromCol, move.toRow, move.toCol);
      var unit = "%";
      var arc = move.toRow > move.fromRow ? 24 : -24;

      if (measuredDelta) {
        startX = measuredDelta.x;
        startY = measuredDelta.y;
        unit = "px";
        arc = move.toRow > move.fromRow ? 18 : -18;
      }

      return {
        startX: startX + unit,
        startY: startY + unit,
        midX: ((startX * 0.5) + arc) + unit,
        midY: (startY * 0.5) + unit
      };
    }

    function getBombSettleDelay() {
      var dropBatch = getDropBatch();
      var bombDrop = dropBatch.find(function (drop) {
        return drop.dropKind === "bomb";
      });
      var dropAnimation;

      if (!bombDrop) {
        return BOMB_BLAST_SETTLE_DELAY_MS + "ms";
      }

      dropAnimation = getDropAnimation(bombDrop, bombDrop.row, bombDrop.col);
      return (parseAnimationMs(dropAnimation.duration) + BOMB_BLAST_SETTLE_DELAY_MS) + "ms";
    }

    function parseAnimationMs(value) {
      var numeric = Number.parseFloat(value);

      if (!Number.isFinite(numeric)) {
        return 0;
      }

      return value.indexOf("s") !== -1 && value.indexOf("ms") === -1 ? numeric * 1000 : numeric;
    }

    function getGravityShiftMove(piece, row, col) {
      var shift = state.gravityShift;

      if (!piece || !shift || shift.id === animatedGravityShiftId) {
        return null;
      }

      return shift.moves.find(function (move) {
        return move.pieceId === piece.id && move.toRow === row && move.toCol === col;
      }) || null;
    }

    function applyGravityShiftAnimation(disc, move) {
      var animation = getGravityShiftAnimation(move, state.gravityShift.direction);

      disc.classList.add("is-gravity-shifting");
      disc.style.setProperty("--cfp-gravity-start-x", animation.startX);
      disc.style.setProperty("--cfp-gravity-start-y", animation.startY);
      disc.style.setProperty("--cfp-gravity-mid-x", animation.midX);
      disc.style.setProperty("--cfp-gravity-mid-y", animation.midY);
      disc.style.setProperty("--cfp-gravity-bounce-x", animation.bounceX);
      disc.style.setProperty("--cfp-gravity-bounce-y", animation.bounceY);
    }

    function getGravityShiftAnimation(move, direction) {
      var deltaCol = move.fromCol - move.toCol;
      var deltaRow = move.fromRow - move.toRow;
      var startX = deltaCol * 126;
      var startY = deltaRow * 126;
      var midX = deltaCol * 26;
      var midY = deltaRow * 26;
      var bounceX = 0;
      var bounceY = 0;

      if (direction === "left") {
        bounceX = -10;
      } else if (direction === "right") {
        bounceX = 10;
      } else if (direction === "up") {
        bounceY = -10;
      } else {
        bounceY = 10;
      }

      return {
        startX: startX + "%",
        startY: startY + "%",
        midX: midX + "%",
        midY: midY + "%",
        bounceX: bounceX + "%",
        bounceY: bounceY + "%"
      };
    }

    function getDropAnimation(lastDrop, row, col) {
      var mode = engine.getMode(state.modeId);
      var direction = mode.gravity ? lastDrop.gravityDirection : "down";
      var startX = 0;
      var startY = 0;
      var bounceX = 0;
      var bounceY = 0;
      var reboundX = 0;
      var reboundY = 0;
      var travelCells;

      if (direction === "up") {
        travelCells = state.rows - row;
        startY = travelCells * 126;
        bounceY = -10;
        reboundY = 4;
      } else if (direction === "left") {
        travelCells = state.cols - col;
        startX = travelCells * 126;
        bounceX = -10;
        reboundX = 4;
      } else if (direction === "right") {
        travelCells = col + 1;
        startX = travelCells * -126;
        bounceX = 10;
        reboundX = -4;
      } else {
        travelCells = row + 1;
        startY = travelCells * -126;
        bounceY = 10;
        reboundY = -4;
      }

      return {
        x: startX + "%",
        y: startY + "%",
        midX: (startX * 0.34) + "%",
        midY: (startY * 0.34) + "%",
        bounceX: bounceX + "%",
        bounceY: bounceY + "%",
        reboundX: reboundX + "%",
        reboundY: reboundY + "%",
        settleX: (bounceX * 0.28) + "%",
        settleY: (bounceY * 0.28) + "%",
        duration: Math.min(980, 430 + travelCells * 76) + "ms"
      };
    }

    function createToken() {
      var token = document.createElement("span");
      token.className = "cfp-token";
      token.textContent = "+";
      return token;
    }

    function appendTokenReveals(cell, row, col) {
      tokenRevealAnimations.forEach(function (reveal) {
        var marker;
        var label;

        if (reveal.row !== row || reveal.col !== col) {
          return;
        }

        marker = document.createElement("span");
        label = document.createElement("span");
        marker.className = "cfp-token-reveal " + (reveal.player === "R" ? "red" : "yellow");
        label.className = "cfp-token-reveal-label";
        label.textContent = "TOKEN FOUND " + reveal.power;
        marker.appendChild(label);
        cell.appendChild(marker);
      });
    }

    function renderHand() {
      var mode = engine.getMode(state.modeId);
      var hand = state.players[state.currentPlayer].hand;
      var player = state.players[state.currentPlayer];
      var fragment = document.createDocumentFragment();
      var renderedTools = false;

      els.toolsTitle.textContent = mode.fog ? "private fog tools" : "mode tools";
      els.handOwner.textContent = getPlayerLabel(state.currentPlayer) + " tools";
      els.hand.replaceChildren();

      if (!state.turnOpen || state.pendingHandoff || state.winner || state.draw) {
        var hidden = document.createElement("p");
        hidden.className = "cfp-hand-empty";
        hidden.textContent = mode.fog ? "Hidden until the private fog turn starts." : "Tools unavailable while the match is paused.";
        els.hand.appendChild(hidden);
        return;
      }

      if (player.bombs > 0) {
        fragment.appendChild(createSpecialCard("bomb", "Bomb Piece", player.bombs + " left", "Drop a bomb that clears unshielded pieces in a 3x3 blast area."));
        renderedTools = true;
      }

      if (player.wilds > 0) {
        fragment.appendChild(createSpecialCard("wild", "Wild Piece", player.wilds + " left", "Drop a neutral piece that counts for either player."));
        renderedTools = true;
      }

      if (player.locks > 0) {
        fragment.appendChild(createSpecialCard("lock", "Column Lock", player.locks + " left", "Lock a column for the opponent's next turn."));
        renderedTools = true;
      }

      hand.forEach(function (power, index) {
        fragment.appendChild(createPowerCard(power, index));
        renderedTools = true;
      });

      if (!renderedTools) {
        var empty = document.createElement("p");
        empty.className = "cfp-hand-empty";
        empty.textContent = mode.powerups || mode.bombs || mode.wilds || mode.locks ? "No tools remaining." : "This mode uses the board only.";
        els.hand.appendChild(empty);
        return;
      }

      els.hand.appendChild(fragment);
    }

    function createSpecialCard(special, name, count, rule) {
      var button = document.createElement("button");
      var title = document.createElement("strong");
      var details = document.createElement("span");

      button.type = "button";
      button.className = "cfp-power-card";
      button.dataset.special = special;
      if ((special === "bomb" && state.pendingDropKind === "bomb") ||
          (special === "wild" && state.pendingDropKind === "wild") ||
          (special === "lock" && state.pendingPower && state.pendingPower.name === "Column Lock")) {
        button.classList.add("is-selected");
      }
      button.disabled = Boolean(state.pendingPower) || state.pendingDropKind !== "normal" || (special === "lock" && state.powerUsedThisTurn);

      title.textContent = name;
      details.textContent = count + " | " + rule;
      button.append(title, details);
      return button;
    }

    function createPowerCard(power, index) {
      var button = document.createElement("button");
      var name = document.createElement("strong");
      var rule = document.createElement("span");

      button.type = "button";
      button.className = "cfp-power-card";
      button.dataset.handIndex = String(index);
      button.disabled = state.powerUsedThisTurn || Boolean(state.pendingPower);
      if (state.pendingPower && state.pendingPower.handIndex === index) {
        button.classList.add("is-selected");
      }

      name.textContent = power;
      rule.textContent = getPowerHelp(power);
      button.append(name, rule);
      return button;
    }

    function getPowerHelp(power) {
      if (power === "Pop") {
        return "Remove the bottom piece from any column unless it is shielded or wild.";
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
      if (power === "Bomb Piece") {
        return "Drop a bomb that clears unshielded pieces in a 3x3 blast area.";
      }
      if (power === "Double Drop") {
        return "Drop two pieces in different columns.";
      }
      if (power === "Scan Column") {
        return "Reveal a fog column for this turn.";
      }
      if (power === "Scan Radius") {
        return "Reveal a small fog area.";
      }
      if (power === "Decoy") {
        return "Create a fake fog signal.";
      }
      if (power === "Signal Jam") {
        return "Disrupt the opponent's next fog read.";
      }
      return "One-use tool.";
    }

    function renderRulesMini() {
      var mode = engine.getMode(state.modeId);
      var fragment = document.createDocumentFragment();

      els.rulesTitle.textContent = mode.title + " Rules";
      els.rulesList.replaceChildren();
      mode.rules.forEach(function (rule) {
        var item = document.createElement("li");
        item.textContent = rule;
        fragment.appendChild(item);
      });
      els.rulesList.appendChild(fragment);
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

    function updateModeStats(stats) {
      var mode = engine.getMode(state.modeId);
      var modeStats = Object.assign({
        id: mode.id,
        title: mode.title,
        matches: 0,
        wins: 0,
        draws: 0
      }, stats.modes[mode.id] || {});

      modeStats.title = mode.title;
      modeStats.matches += 1;
      if (state.draw) {
        modeStats.draws += 1;
      } else {
        modeStats.wins += 1;
      }
      stats.modes[mode.id] = modeStats;
    }

    function recordMatch() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      var now = new Date().toISOString();
      var powerupsUsed = countPowerupsUsed();
      var winnerName = state.winner ? getPlayerLabel(state.winner) : "DRAW";
      var mode = engine.getMode(state.modeId);

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

      updateModeStats(stats);
      updatePlayerStats(stats, "R", now);
      updatePlayerStats(stats, "Y", now);

      stats.recent.unshift({
        playedAt: now,
        modeId: mode.id,
        modeTitle: mode.title,
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
      if (!state || !(state.winner || state.draw) || matchRecorded) {
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
        if (!state) {
          return "MODE: SELECT";
        }

        return state.winner || state.draw ? "SESSION: COMPLETE" : engine.getMode(state.modeId).title.toUpperCase();
      }
    };
  }

  global.ChurchGames.registerGame({
    id: GAME_ID,
    sortOrder: 20,
    title: "Connect Four Plus",
    version: "v1.1",
    command: "./connect-four-plus --select-mode",
    status: "installed",
    players: "2 local",
    duration: "8-25 min",
    type: "strategy / variants",
    themeLabel: "Bauhaus",
    description: "A selectable Connect Four Plus collection with Power Duel, bomb powerups, gravity, wild pieces, locks, board-shift, token, objective, and simultaneous-planning variants.",
    rules: [
      "Choose a Connect Four Plus variant before the match starts.",
      "Current variants use public board play with no private handoff screen.",
      "Power Duel, Draft Duel, Token Hunt, and Hidden Objectives can award Bomb Piece as a one-use powerup.",
      "Gravity, Bomb, Wild, Column Lock, Shrinking Board, Connect 5, Token Hunt, Hidden Objective, and Simultaneous Planning modes are selectable from the in-game mode picker.",
      "Named players save match results and mode stats on this device."
    ],
    getLibraryMetrics: getPowerSummary,
    renderLeaderboard: renderLeaderboard,
    createController: createController
  });
})(window);
