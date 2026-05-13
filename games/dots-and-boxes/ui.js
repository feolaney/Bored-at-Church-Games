(function registerDotsAndBoxes(global) {
  "use strict";

  var GAME_ID = "dots-and-boxes";
  var engine = global.DotsAndBoxesGame;
  var MIN_UI_SIZE = 2;
  var MAX_UI_SIZE = 20;
  var ZOOM_GATE_SIZE = 8;
  var AUTO_LINE_OPTIONS = [
    { ratio: 0.3, label: "small" },
    { ratio: 0.38, label: "medium" },
    { ratio: 0.44, label: "large" }
  ];
  var PRESETS = [
    { width: 2, height: 2, label: "2 x 2" },
    { width: 3, height: 3, label: "3 x 3" },
    { width: 4, height: 4, label: "4 x 4" },
    { width: 5, height: 5, label: "5 x 5" },
    { width: 6, height: 6, label: "6 x 6" },
    { width: 8, height: 8, label: "8 x 8" },
    { width: 12, height: 12, label: "12 x 12" },
    { width: 20, height: 20, label: "20 x 20" },
    { width: 5, height: 3, label: "5 x 3" }
  ];

  function createAutoLineButtonMarkup() {
    return AUTO_LINE_OPTIONS.map(function (option) {
      return '<button type="button" data-auto-ratio="' + option.ratio + '">Auto Solve ' + option.label + '</button>';
    }).join("");
  }

  function createEmptyStats() {
    return {
      version: 1,
      matches: 0,
      draws: 0,
      playerOneWins: 0,
      playerTwoWins: 0,
      totalMoves: 0,
      totalBoxesCaptured: 0,
      lastPlayedAt: null,
      boards: {},
      players: {},
      recent: []
    };
  }

  function normalizeStats(rawStats) {
    var stats = Object.assign(createEmptyStats(), rawStats || {});

    stats.matches = Number(stats.matches) || 0;
    stats.draws = Number(stats.draws) || 0;
    stats.playerOneWins = Number(stats.playerOneWins) || 0;
    stats.playerTwoWins = Number(stats.playerTwoWins) || 0;
    stats.totalMoves = Number(stats.totalMoves) || 0;
    stats.totalBoxesCaptured = Number(stats.totalBoxesCaptured) || 0;
    stats.boards = stats.boards && typeof stats.boards === "object" ? stats.boards : {};
    stats.players = stats.players && typeof stats.players === "object" ? stats.players : {};
    stats.recent = Array.isArray(stats.recent) ? stats.recent : [];

    return stats;
  }

  function formatLibraryMetrics(rawStats) {
    var stats = normalizeStats(rawStats);

    return "matches:" + stats.matches + " boxes:" + stats.totalBoxesCaptured;
  }

  function renderLeaderboard(container, rawStats, helpers) {
    var stats = normalizeStats(rawStats);
    var players = Object.keys(stats.players).map(function (key) {
      return stats.players[key];
    }).sort(function (a, b) {
      if (b.wins !== a.wins) {
        return b.wins - a.wins;
      }

      if (b.boxesCaptured !== a.boxesCaptured) {
        return b.boxesCaptured - a.boxesCaptured;
      }

      return b.games - a.games;
    });
    var boards = Object.keys(stats.boards).map(function (key) {
      return stats.boards[key];
    }).sort(function (a, b) {
      return b.matches - a.matches;
    });
    var summary = document.createElement("dl");

    summary.className = "vapor-readout-grid";
    summary.append(
      helpers.createReadout("matches", String(stats.matches)),
      helpers.createReadout("draws", String(stats.draws)),
      helpers.createReadout("p1 wins", String(stats.playerOneWins)),
      helpers.createReadout("p2 wins", String(stats.playerTwoWins)),
      helpers.createReadout("boxes", String(stats.totalBoxesCaptured)),
      helpers.createReadout("last played", helpers.formatDateTime(stats.lastPlayedAt))
    );
    container.appendChild(summary);

    if (boards.length) {
      container.appendChild(createBoardList(boards));
    }

    if (!players.length) {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No named player results yet. Add player names before the first line to save Dots and Boxes results on this device.";
      container.appendChild(empty);
    } else {
      container.appendChild(createLeaderboardTable(players, helpers));
    }

    if (stats.recent.length) {
      container.appendChild(createRecentList(stats.recent, helpers));
    }
  }

  function createBoardList(boards) {
    var section = document.createElement("section");
    var heading = document.createElement("h2");
    var list = document.createElement("ol");

    heading.textContent = "Board Results";
    list.className = "recent-list";

    boards.slice(0, 5).forEach(function (board) {
      var item = document.createElement("li");

      item.textContent = board.label + " | " + board.matches + " matches | " + board.draws + " draws";
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
      helpers.createCell("boxes"),
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
        helpers.createCell(String(player.boxesCaptured || 0)),
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

      item.textContent = helpers.formatDateTime(match.playedAt) + " | " + match.boardLabel + " | " + result + " | " + match.score;
      list.appendChild(item);
    });

    section.append(heading, list);
    return section;
  }

  function createController(options) {
    var root = options.root;
    var services = options.services;
    var currentBoard = createBoardConfig(engine.DEFAULT_WIDTH, engine.DEFAULT_HEIGHT, "rectangle");
    var state = engine.createInitialState({ shape: currentBoard.shape });
    var savedNames = services.getPlayerNames(GAME_ID);
    var playerNames = {
      P1: typeof savedNames.P1 === "string" ? savedNames.P1 : "",
      P2: typeof savedNames.P2 === "string" ? savedNames.P2 : ""
    };
    var customShape = createStarterShape();
    var mounted = false;
    var els = {};
    var matchRecorded = false;
    var lastRecordStatus = null;
    var setupMessage = "";
    var boardZoomed = false;
    var zoomFocusEdgeId = null;
    var handleResize = null;

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

      wrapper.className = "dots-boxes-game";
      wrapper.setAttribute("aria-label", "Dots and Boxes game");
      wrapper.innerHTML =
        '<section class="dab-board-panel" aria-labelledby="dab-board-heading">' +
          '<div class="dab-marquee" aria-hidden="true"><span>DRAW THE LINE / CLAIM THE BOX / KEEP THE TURN /</span><span>DRAW THE LINE / CLAIM THE BOX / KEEP THE TURN /</span></div>' +
          '<button type="button" class="dab-floating-undo" data-role="undo-move" aria-label="Undo last move">Undo</button>' +
          '<div class="dab-board-heading">' +
            '<div>' +
              '<p class="dab-kicker">shared edges / territory race</p>' +
              '<h2 id="dab-board-heading">Dots and Boxes</h2>' +
            '</div>' +
            '<div class="dab-turn-callout" data-role="turn-callout" aria-live="polite">Player 1 to draw</div>' +
          '</div>' +
          '<div class="dab-result-banner" data-role="result-banner" aria-live="polite" hidden></div>' +
          '<div class="dab-end-actions" data-role="end-actions" hidden>' +
            '<button type="button" data-role="new-game-inline">New Game</button>' +
            '<button type="button" data-role="change-game">Library</button>' +
          '</div>' +
          '<div class="dab-board-tools" data-role="board-tools" hidden>' +
            '<button type="button" class="dab-zoom-out" data-role="zoom-out" aria-label="Zoom out" title="Zoom out"><span class="dab-zoom-icon" aria-hidden="true"></span></button>' +
          '</div>' +
          '<div class="dab-action-row dab-auto-line-row" data-role="auto-line-options" aria-label="Auto solve line presets">' +
            createAutoLineButtonMarkup() +
          '</div>' +
          '<div class="dab-board-scroll" data-role="board-scroll">' +
            '<div class="dab-board-grid" data-role="board" role="grid" aria-label="Dots and Boxes board"></div>' +
          '</div>' +
          '<section class="dab-metrics-panel" data-role="metrics-panel" aria-labelledby="dab-metrics-heading" hidden></section>' +
        '</section>' +
        '<aside class="dab-panel dab-status-panel" aria-labelledby="dab-status-heading">' +
          '<div class="dab-panel-title" id="dab-status-heading">Match</div>' +
          '<div class="dab-panel-body">' +
            '<p class="dab-status-line" data-role="status-line" aria-live="polite"></p>' +
            '<section class="dab-player-setup" aria-labelledby="dab-players-heading">' +
              '<h2 id="dab-players-heading">Players</h2>' +
              '<label><span>player 1</span><input type="text" data-role="p1-name" maxlength="32" autocomplete="off" placeholder="Player 1"></label>' +
              '<label><span>player 2</span><input type="text" data-role="p2-name" maxlength="32" autocomplete="off" placeholder="Player 2"></label>' +
            '</section>' +
            '<dl class="dab-readout-grid">' +
              '<div><dt>turn</dt><dd data-role="turn-readout">Player 1</dd></div>' +
              '<div><dt>board</dt><dd data-role="board-size">4 x 4</dd></div>' +
              '<div><dt>lines</dt><dd data-role="move-count">0 / 40</dd></div>' +
              '<div><dt>left</dt><dd data-role="lines-left">40</dd></div>' +
              '<div><dt>p1 boxes</dt><dd data-role="p1-score">0</dd></div>' +
              '<div><dt>p2 boxes</dt><dd data-role="p2-score">0</dd></div>' +
            '</dl>' +
            '<div class="dab-action-row">' +
              '<button type="button" data-role="new-game">New Game</button>' +
            '</div>' +
            '<section class="dab-board-setup" aria-labelledby="dab-board-setup-heading">' +
              '<h2 id="dab-board-setup-heading">Board</h2>' +
              '<div class="dab-preset-row" data-role="preset-list" aria-label="Board presets"></div>' +
              '<div class="dab-dimensions">' +
                '<label><span>width</span><input type="number" data-role="rect-width" min="2" max="20" step="1" value="4"></label>' +
                '<label><span>height</span><input type="number" data-role="rect-height" min="2" max="20" step="1" value="4"></label>' +
                '<button type="button" data-role="start-rectangle">Start Rectangle</button>' +
              '</div>' +
              '<details class="dab-shape-editor" data-role="shape-editor">' +
                '<summary>Custom Shape</summary>' +
                '<div class="dab-shape-controls">' +
                  '<label><span>wide</span><input type="number" data-role="shape-width" min="2" max="20" step="1" value="5"></label>' +
                  '<label><span>high</span><input type="number" data-role="shape-height" min="2" max="20" step="1" value="4"></label>' +
                '</div>' +
                '<div class="dab-shape-grid" data-role="shape-grid" aria-label="Select boxes included in the custom board"></div>' +
                '<p class="dab-shape-note" data-role="shape-note"></p>' +
                '<div class="dab-action-row dab-shape-actions">' +
                  '<button type="button" data-role="use-shape">Use Shape</button>' +
                  '<button type="button" data-role="fill-shape">Fill</button>' +
                  '<button type="button" data-role="clear-shape">Clear</button>' +
                '</div>' +
              '</details>' +
              '<p class="dab-setup-message" data-role="setup-message"></p>' +
            '</section>' +
          '</div>' +
        '</aside>' +
        '<aside class="dab-panel dab-log-panel" aria-labelledby="dab-log-heading">' +
          '<div class="dab-panel-title" id="dab-log-heading">Rules / Log</div>' +
          '<div class="dab-panel-body">' +
            '<section class="dab-rules" aria-labelledby="dab-rules-heading">' +
              '<h2 id="dab-rules-heading">Ruleset</h2>' +
              '<ul>' +
                '<li>Draw one undrawn horizontal or vertical line between neighboring dots.</li>' +
                '<li>If your line completes a box, claim it for 1 point and take another turn.</li>' +
                '<li>If one line completes two boxes, claim both boxes.</li>' +
                '<li>If no box is completed, the turn passes to the other player.</li>' +
                '<li>The game ends when every playable line is drawn; most boxes wins.</li>' +
                '<li>On custom boards, only selected boxes count and only lines touching selected boxes are playable.</li>' +
              '</ul>' +
            '</section>' +
            '<section class="dab-move-log-section" aria-labelledby="dab-move-log-heading">' +
              '<h2 id="dab-move-log-heading">Move Log</h2>' +
              '<ol class="dab-move-log" data-role="move-log" aria-live="polite"></ol>' +
            '</section>' +
          '</div>' +
        '</aside>';

      return wrapper;
    }

    function bindElements() {
      [
        "turn-callout",
        "result-banner",
        "end-actions",
        "new-game-inline",
        "change-game",
        "board-tools",
        "zoom-out",
        "board-scroll",
        "board",
        "metrics-panel",
        "status-line",
        "p1-name",
        "p2-name",
        "turn-readout",
        "board-size",
        "move-count",
        "lines-left",
        "p1-score",
        "p2-score",
        "new-game",
        "undo-move",
        "preset-list",
        "rect-width",
        "rect-height",
        "start-rectangle",
        "auto-line-options",
        "shape-editor",
        "shape-width",
        "shape-height",
        "shape-grid",
        "shape-note",
        "use-shape",
        "fill-shape",
        "clear-shape",
        "setup-message",
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
        var edgeButton;
        var result;

        if (!(event.target instanceof Element)) {
          return;
        }

        edgeButton = event.target.closest(".dab-edge");
        if (!edgeButton || edgeButton.disabled) {
          return;
        }

        if (shouldGateMoveWithZoom()) {
          zoomIntoEdge(edgeButton);
          return;
        }

        setupMessage = "";
        result = engine.applyMove(state, edgeButton.dataset.edgeId);
        state = result.state;
        maybeRecordMatch();
        render();
      });

      els.presetList.addEventListener("click", function (event) {
        var button;

        if (!(event.target instanceof Element)) {
          return;
        }

        button = event.target.closest("button[data-width]");
        if (!button) {
          return;
        }

        setRectangleBoard(Number(button.dataset.width), Number(button.dataset.height), button.textContent);
      });

      els.startRectangle.addEventListener("click", function () {
        setRectangleBoard(
          readBoardDimension(els.rectWidth.value, engine.DEFAULT_WIDTH),
          readBoardDimension(els.rectHeight.value, engine.DEFAULT_HEIGHT),
          null
        );
      });

      els.autoLineOptions.addEventListener("click", function (event) {
        var button;

        if (!(event.target instanceof Element)) {
          return;
        }

        button = event.target.closest("button[data-auto-ratio]");
        if (!button) {
          return;
        }

        applyAutoLines(Number(button.dataset.autoRatio));
      });

      els.shapeWidth.addEventListener("change", resizeCustomShapeFromInputs);
      els.shapeHeight.addEventListener("change", resizeCustomShapeFromInputs);

      els.shapeGrid.addEventListener("click", function (event) {
        var cell;
        var row;
        var col;

        if (!(event.target instanceof Element)) {
          return;
        }

        cell = event.target.closest("button[data-row]");
        if (!cell) {
          return;
        }

        row = Number(cell.dataset.row);
        col = Number(cell.dataset.col);
        customShape[row][col] = !customShape[row][col];
        setupMessage = "";
        renderShapeEditor();
      });

      els.useShape.addEventListener("click", function () {
        var count = engine.countShapeBoxes(customShape);

        if (!count) {
          setupMessage = "Select at least one box before starting a custom board.";
          renderStatus();
          renderShapeEditor();
          return;
        }

        setCustomBoard();
      });

      els.fillShape.addEventListener("click", function () {
        customShape = createFilledShape(customShape[0].length, customShape.length, true);
        setupMessage = "";
        renderShapeEditor();
      });

      els.clearShape.addEventListener("click", function () {
        customShape = createFilledShape(customShape[0].length, customShape.length, false);
        setupMessage = "";
        renderShapeEditor();
      });

      els.newGame.addEventListener("click", resetMatch);
      els.newGameInline.addEventListener("click", resetMatch);
      els.changeGame.addEventListener("click", changeGame);
      els.zoomOut.addEventListener("click", zoomOutBoard);

      els.undoMove.addEventListener("click", function () {
        state = engine.undoMove(state);
        render();
      });

      els.p1Name.addEventListener("input", function () {
        updatePlayerName(engine.PLAYER_ONE, els.p1Name.value);
      });

      els.p2Name.addEventListener("input", function () {
        updatePlayerName(engine.PLAYER_TWO, els.p2Name.value);
      });

      if (typeof global.addEventListener === "function" && !handleResize) {
        handleResize = function () {
          if (mounted && els.board && root.contains(els.board)) {
            syncZoomPresentation();
          }
        };
        global.addEventListener("resize", handleResize);
      }
    }

    function readBoardDimension(value, fallback) {
      var number = Math.floor(Number(value));

      if (!Number.isFinite(number)) {
        return fallback;
      }

      return Math.max(MIN_UI_SIZE, Math.min(MAX_UI_SIZE, number));
    }

    function createFilledShape(width, height, fill) {
      var cols = readBoardDimension(width, engine.DEFAULT_WIDTH);
      var rows = readBoardDimension(height, engine.DEFAULT_HEIGHT);

      return Array.from({ length: rows }, function () {
        return Array(cols).fill(Boolean(fill));
      });
    }

    function createStarterShape() {
      return [
        [true, true, true, true, false],
        [true, false, false, true, false],
        [true, true, true, true, true],
        [false, false, true, false, false]
      ];
    }

    function resizeShape(shape, width, height, fillNewCells) {
      var cols = readBoardDimension(width, engine.DEFAULT_WIDTH);
      var rows = readBoardDimension(height, engine.DEFAULT_HEIGHT);

      return Array.from({ length: rows }, function (_, rowIndex) {
        return Array.from({ length: cols }, function (_, colIndex) {
          if (shape[rowIndex] && typeof shape[rowIndex][colIndex] === "boolean") {
            return shape[rowIndex][colIndex];
          }

          return Boolean(fillNewCells);
        });
      });
    }

    function resizeCustomShapeFromInputs() {
      customShape = resizeShape(customShape, els.shapeWidth.value, els.shapeHeight.value, true);
      setupMessage = "";
      renderShapeEditor();
    }

    function createBoardConfig(width, height, mode, shape, label) {
      var boardShape = shape ? engine.cloneShape(shape) : engine.createRectangleShape(width, height);
      var boxCount = engine.countShapeBoxes(boardShape);

      return {
        mode: mode || "rectangle",
        width: boardShape[0].length,
        height: boardShape.length,
        shape: boardShape,
        boxes: boxCount,
        label: label || (mode === "custom" ? boxCount + " box shape" : boardShape[0].length + " x " + boardShape.length + " boxes")
      };
    }

    function setRectangleBoard(width, height, label) {
      currentBoard = createBoardConfig(width, height, "rectangle", null, label || width + " x " + height + " boxes");
      els.rectWidth.value = String(currentBoard.width);
      els.rectHeight.value = String(currentBoard.height);
      boardZoomed = false;
      zoomFocusEdgeId = null;
      resetMatch("Started " + currentBoard.label + ".");
    }

    function setCustomBoard() {
      currentBoard = createBoardConfig(customShape[0].length, customShape.length, "custom", customShape, engine.countShapeBoxes(customShape) + " box shape");
      boardZoomed = false;
      zoomFocusEdgeId = null;
      resetMatch("Started " + currentBoard.label + ".");
    }

    function resetMatch(message) {
      setupMessage = typeof message === "string" ? message : "";
      boardZoomed = false;
      zoomFocusEdgeId = null;
      state = engine.createInitialState({ shape: currentBoard.shape });
      matchRecorded = false;
      lastRecordStatus = null;
      render();
      if (services.scrollToTop) {
        services.scrollToTop();
      }
    }

    function canUseAutoLines() {
      return state.status === "playing" && state.drawnEdgeCount === 0;
    }

    function createAutoLineSeed() {
      return Date.now() + state.totalEdges * 31 + state.totalBoxes * 17;
    }

    function formatAutoLineRatio(targetRatio) {
      return Math.round(targetRatio * 100) + "%";
    }

    function getAutoLineMessage(result, targetRatio) {
      var message = "Auto placed " + result.placedCount + " random safe lines.";

      if (result.safetyLimited) {
        message += " Safety stopped before " + formatAutoLineRatio(targetRatio) + " to avoid one-move boxes.";
      }

      message += " " + getPlayerLabel(state.currentPlayer) + " opens.";
      return message;
    }

    function applyAutoLines(targetRatio) {
      var ratio = Number(targetRatio);
      var result;

      if (!canUseAutoLines()) {
        setupMessage = "Auto lines can only be placed before any lines are drawn.";
        render();
        return;
      }

      if (!Number.isFinite(ratio)) {
        ratio = AUTO_LINE_OPTIONS[1].ratio;
      }

      result = engine.autoPlaceSafeLines(state, {
        targetRatio: ratio,
        seed: createAutoLineSeed()
      });
      state = result.state;
      setupMessage = result.ok ? getAutoLineMessage(result, ratio) : result.reason;
      render();
    }

    function changeGame() {
      if (services.goToLibrary) {
        services.goToLibrary();
      }
    }

    function getPlayerName(player) {
      return (playerNames[player] || "").trim();
    }

    function getPlayerLabel(player) {
      var name = getPlayerName(player);
      var defaultLabel = engine.playerLabel(player);

      return name ? name + " (" + defaultLabel + ")" : defaultLabel;
    }

    function getPlayerInitial(player) {
      var name = getPlayerName(player);

      return name ? name.charAt(0).toUpperCase() : (player === engine.PLAYER_ONE ? "1" : "2");
    }

    function hasAnyCustomName() {
      return Boolean(getPlayerName(engine.PLAYER_ONE) || getPlayerName(engine.PLAYER_TWO));
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
      var captureCount = last ? last.completedBoxIds.length : 0;

      if (state.lastError) {
        return state.lastError;
      }

      if (setupMessage && !state.result && (!state.drawnEdgeCount || setupMessage.indexOf("Zoomed") === 0 || setupMessage.indexOf("Auto") === 0)) {
        return setupMessage;
      }

      if (isLargeBoard() && !boardZoomed) {
        return getPlayerLabel(state.currentPlayer) + " to draw. Tap a line to zoom into that area first.";
      }

      if (state.result && state.result.type === "win") {
        return getPlayerLabel(state.result.winner) + " wins " + state.scores[state.result.winner] + "-" + state.scores[engine.otherPlayer(state.result.winner)] + "." + getRecordSuffix();
      }

      if (state.result && state.result.type === "draw") {
        return "Draw. Both players finished with " + state.scores.P1 + " boxes." + getRecordSuffix();
      }

      if (!last) {
        return getPlayerLabel(engine.PLAYER_ONE) + " opens by drawing any playable line.";
      }

      if (captureCount) {
        return getPlayerLabel(last.player) + " drew " + last.label + " and claimed " + captureCount + " box" + (captureCount === 1 ? "" : "es") + ". " + getPlayerLabel(last.player) + " draws again.";
      }

      return getPlayerLabel(last.player) + " drew " + last.label + ". " + getPlayerLabel(state.currentPlayer) + " to move.";
    }

    function render() {
      syncPlayerInputs();
      renderStatus();
      renderResultBanner();
      renderBoardPresets();
      renderBoard();
      renderShapeEditor();
      syncZoomPresentation();
      renderLog();
      renderMetrics();
    }

    function syncPlayerInputs() {
      if (els.p1Name.value !== playerNames.P1) {
        els.p1Name.value = playerNames.P1;
      }

      if (els.p2Name.value !== playerNames.P2) {
        els.p2Name.value = playerNames.P2;
      }
    }

    function renderStatus() {
      var namesLocked = state.moveHistory.length > 0;
      var isPlayerOneTurn = !state.result && state.currentPlayer === engine.PLAYER_ONE;
      var isPlayerTwoTurn = !state.result && state.currentPlayer === engine.PLAYER_TWO;
      var canAutoSolve = canUseAutoLines();

      els.statusLine.classList.toggle("error", Boolean(state.lastError));
      els.statusLine.classList.toggle("is-p1-turn", isPlayerOneTurn);
      els.statusLine.classList.toggle("is-p2-turn", isPlayerTwoTurn);
      els.statusLine.textContent = getStatusText();
      els.turnReadout.textContent = state.result ? "Ended" : getPlayerLabel(state.currentPlayer);
      els.turnCallout.classList.toggle("ended", Boolean(state.result));
      els.turnCallout.classList.toggle("is-p1-turn", isPlayerOneTurn);
      els.turnCallout.classList.toggle("is-p2-turn", isPlayerTwoTurn);
      els.turnCallout.textContent = state.result ? "Session complete" : getPlayerLabel(state.currentPlayer) + " to draw";
      els.turnReadout.classList.toggle("is-p1-turn", isPlayerOneTurn);
      els.turnReadout.classList.toggle("is-p2-turn", isPlayerTwoTurn);
      els.boardSize.textContent = currentBoard.label;
      els.moveCount.textContent = state.drawnEdgeCount + " / " + state.totalEdges;
      els.linesLeft.textContent = String(state.totalEdges - state.drawnEdgeCount);
      els.p1Score.textContent = String(state.scores.P1);
      els.p2Score.textContent = String(state.scores.P2);
      els.p1Score.parentElement.classList.toggle("is-current-turn", isPlayerOneTurn);
      els.p1Score.parentElement.classList.toggle("is-p1-turn", isPlayerOneTurn);
      els.p2Score.parentElement.classList.toggle("is-current-turn", isPlayerTwoTurn);
      els.p2Score.parentElement.classList.toggle("is-p2-turn", isPlayerTwoTurn);
      els.undoMove.disabled = state.history.length === 0 || Boolean(state.result);
      els.autoLineOptions.hidden = !canAutoSolve;
      Array.prototype.forEach.call(els.autoLineOptions.querySelectorAll("button[data-auto-ratio]"), function (button) {
        button.disabled = !canAutoSolve;
      });
      els.p1Name.disabled = namesLocked;
      els.p2Name.disabled = namesLocked;
      els.setupMessage.textContent = setupMessage && setupMessage !== getStatusText() ? setupMessage : "";

      if (services.setSessionChip) {
        services.setSessionChip(state.result ? "SESSION: COMPLETE" : "SESSION: ACTIVE");
      }
    }

    function isLargeBoard() {
      return state.boxCols > ZOOM_GATE_SIZE || state.boxRows > ZOOM_GATE_SIZE;
    }

    function shouldGateMoveWithZoom() {
      return isLargeBoard() && !boardZoomed && state.status === "playing";
    }

    function calculateBoardTracks() {
      var panelWidth = Math.max(280, els.boardScroll ? els.boardScroll.clientWidth - 36 : 520);
      var panelHeight = Math.max(280, Math.min((global.innerHeight || 760) * 0.72, 760) - 36);
      var dotTrack;
      var boxTrack;
      var widthTrack;
      var heightTrack;
      var lineWeight;
      var touchTrack;

      if (!isLargeBoard()) {
        return null;
      }

      if (boardZoomed) {
        dotTrack = panelWidth < 420 ? 10 : 12;
        widthTrack = Math.floor((panelWidth - (ZOOM_GATE_SIZE + 1) * dotTrack) / ZOOM_GATE_SIZE);
        heightTrack = Math.floor((panelHeight - (ZOOM_GATE_SIZE + 1) * dotTrack) / ZOOM_GATE_SIZE);
        boxTrack = Math.min(widthTrack, heightTrack);
        boxTrack = Math.max(30, Math.min(66, boxTrack));
        lineWeight = Math.max(5, Math.min(7, Math.round(boxTrack * 0.14)));
        touchTrack = Math.max(38, Math.min(48, boxTrack + 8));
      } else {
        dotTrack = 8;
        widthTrack = Math.floor((panelWidth - (state.boxCols + 1) * dotTrack) / state.boxCols);
        heightTrack = Math.floor((panelHeight - (state.boxRows + 1) * dotTrack) / state.boxRows);
        boxTrack = Math.min(widthTrack, heightTrack);
        boxTrack = Math.max(14, Math.min(34, boxTrack));
        lineWeight = 4;
        touchTrack = Math.max(30, Math.min(40, boxTrack + 14));
      }

      return {
        dotTrack: dotTrack,
        boxTrack: boxTrack,
        lineWeight: lineWeight,
        touchTrack: touchTrack
      };
    }

    function setBoardTrackVariable(name, value) {
      root.style.setProperty(name, value + "px");
    }

    function clearBoardTrackVariables() {
      root.style.removeProperty("--dab-dot-track");
      root.style.removeProperty("--dab-box-track");
      root.style.removeProperty("--dab-line-weight");
      root.style.removeProperty("--dab-touch-track");
    }

    function syncZoomPresentation() {
      var tracks = calculateBoardTracks();

      root.classList.toggle("is-large-board", isLargeBoard());
      root.classList.toggle("is-board-zoomed", isLargeBoard() && boardZoomed);
      els.boardTools.hidden = !(isLargeBoard() && boardZoomed);

      if (!tracks) {
        clearBoardTrackVariables();
        return;
      }

      setBoardTrackVariable("--dab-dot-track", tracks.dotTrack);
      setBoardTrackVariable("--dab-box-track", tracks.boxTrack);
      setBoardTrackVariable("--dab-line-weight", tracks.lineWeight);
      setBoardTrackVariable("--dab-touch-track", tracks.touchTrack);
    }

    function scrollEdgeToCenter(edgeId) {
      var edgeButton = edgeId ? els.board.querySelector('[data-edge-id="' + edgeId + '"]') : null;
      var container;
      var containerRect;
      var edgeRect;

      if (!edgeButton || !els.boardScroll) {
        return;
      }

      container = els.boardScroll;
      containerRect = container.getBoundingClientRect();
      edgeRect = edgeButton.getBoundingClientRect();
      container.scrollLeft += edgeRect.left - containerRect.left - container.clientWidth / 2 + edgeRect.width / 2;
      container.scrollTop += edgeRect.top - containerRect.top - container.clientHeight / 2 + edgeRect.height / 2;
    }

    function clearEdgeFocus(edgeButton) {
      if (edgeButton && typeof edgeButton.blur === "function") {
        edgeButton.blur();
      }
    }

    function zoomIntoEdge(edgeButton) {
      boardZoomed = true;
      zoomFocusEdgeId = edgeButton.dataset.edgeId;
      setupMessage = "Zoomed in. Tap a line again to draw.";
      clearEdgeFocus(edgeButton);
      syncZoomPresentation();
      renderStatus();
      (global.requestAnimationFrame || function (callback) {
        callback();
      })(function () {
        scrollEdgeToCenter(zoomFocusEdgeId);
      });
    }

    function zoomOutBoard() {
      boardZoomed = false;
      zoomFocusEdgeId = null;
      setupMessage = "Zoomed out. Tap a line to zoom into that area.";
      syncZoomPresentation();
      renderStatus();
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

    function createMetricReadout(label, value) {
      var item = document.createElement("div");
      var term = document.createElement("dt");
      var detail = document.createElement("dd");

      term.textContent = label;
      detail.textContent = value;
      item.append(term, detail);
      return item;
    }

    function formatPercentValue(value, total) {
      if (!total) {
        return "0%";
      }

      return Math.round((value / total) * 100) + "%";
    }

    function countLeadChanges(timeline) {
      var previousLeader = null;
      var changes = 0;

      timeline.forEach(function (point) {
        var leader = null;

        if (point.p1 > point.p2) {
          leader = engine.PLAYER_ONE;
        } else if (point.p2 > point.p1) {
          leader = engine.PLAYER_TWO;
        }

        if (leader && previousLeader && leader !== previousLeader) {
          changes += 1;
        }

        if (leader) {
          previousLeader = leader;
        }
      });

      return changes;
    }

    function createMatchMetrics() {
      var p1Score = 0;
      var p2Score = 0;
      var timeline = [{ move: 0, p1: 0, p2: 0 }];
      var scoringMoves = [];
      var biggestCapture = { count: 0, player: null, move: null };
      var currentRun = { player: null, count: 0 };
      var longestRun = { player: null, count: 0 };

      state.moveHistory.forEach(function (move) {
        var captured = move.completedBoxIds.length;

        if (captured && move.player === engine.PLAYER_ONE) {
          p1Score += captured;
        } else if (captured && move.player === engine.PLAYER_TWO) {
          p2Score += captured;
        }

        if (captured) {
          scoringMoves.push(move);

          if (captured > biggestCapture.count) {
            biggestCapture = { count: captured, player: move.player, move: move };
          }

          if (currentRun.player === move.player) {
            currentRun.count += captured;
          } else {
            currentRun = { player: move.player, count: captured };
          }

          if (currentRun.count > longestRun.count) {
            longestRun = { player: currentRun.player, count: currentRun.count };
          }
        } else {
          currentRun = { player: null, count: 0 };
        }

        timeline.push({
          move: move.index,
          p1: p1Score,
          p2: p2Score
        });
      });

      return {
        p1Score: state.scores.P1,
        p2Score: state.scores.P2,
        totalBoxes: Math.max(0, state.totalBoxes),
        totalMoves: state.moveHistory.length,
        p1Lines: linesForPlayer(engine.PLAYER_ONE),
        p2Lines: linesForPlayer(engine.PLAYER_TWO),
        scoringMoves: scoringMoves,
        biggestCapture: biggestCapture,
        longestRun: longestRun,
        leadChanges: countLeadChanges(timeline),
        timeline: timeline
      };
    }

    function createScoreShare(metrics) {
      var block = document.createElement("section");
      var heading = document.createElement("h3");
      var chart = document.createElement("div");
      var center = document.createElement("span");
      var legend = document.createElement("dl");
      var totalScore = metrics.p1Score + metrics.p2Score;
      var p1Degrees = totalScore ? Math.round((metrics.p1Score / totalScore) * 360) : 180;

      block.className = "dab-metrics-block dab-score-share";
      heading.textContent = "Score Share";
      chart.className = "dab-score-pie";
      chart.style.background = "conic-gradient(var(--dab-accent) 0deg " + p1Degrees + "deg, var(--dab-p2) " + p1Degrees + "deg 360deg)";
      chart.setAttribute("aria-label", getPlayerLabel(engine.PLAYER_ONE) + " " + metrics.p1Score + " boxes, " + getPlayerLabel(engine.PLAYER_TWO) + " " + metrics.p2Score + " boxes");
      center.textContent = metrics.p1Score + "-" + metrics.p2Score;
      chart.appendChild(center);

      legend.className = "dab-score-legend";
      legend.append(
        createMetricReadout(getPlayerLabel(engine.PLAYER_ONE), metrics.p1Score + " boxes / " + formatPercentValue(metrics.p1Score, totalScore)),
        createMetricReadout(getPlayerLabel(engine.PLAYER_TWO), metrics.p2Score + " boxes / " + formatPercentValue(metrics.p2Score, totalScore))
      );

      block.append(heading, chart, legend);
      return block;
    }

    function createSvgElement(tagName) {
      return document.createElementNS("http://www.w3.org/2000/svg", tagName);
    }

    function formatSvgPoint(x, y) {
      return x.toFixed(2) + "," + y.toFixed(2);
    }

    function scoreTimelineY(score, maxScore) {
      return 56 - (score / maxScore) * 46;
    }

    function scoreForPlayer(point, player) {
      return player === engine.PLAYER_ONE ? point.p1 : point.p2;
    }

    function buildScorePolyline(metrics, player, maxScore) {
      var totalMoves = Math.max(1, metrics.totalMoves);
      var points = [formatSvgPoint(4, scoreTimelineY(0, maxScore))];
      var previousScore = 0;

      metrics.timeline.slice(1).forEach(function (point) {
        var x = 4 + (point.move / totalMoves) * 92;
        var nextScore = scoreForPlayer(point, player);

        points.push(formatSvgPoint(x, scoreTimelineY(previousScore, maxScore)));
        points.push(formatSvgPoint(x, scoreTimelineY(nextScore, maxScore)));
        previousScore = nextScore;
      });

      points.push(formatSvgPoint(96, scoreTimelineY(previousScore, maxScore)));
      return points.join(" ");
    }

    function appendTimelineGrid(svg, maxScore) {
      [0, 0.5, 1].forEach(function (step) {
        var line = createSvgElement("line");
        var y = scoreTimelineY(maxScore * step, maxScore);

        line.setAttribute("x1", "4");
        line.setAttribute("x2", "96");
        line.setAttribute("y1", String(y));
        line.setAttribute("y2", String(y));
        line.setAttribute("class", "dab-timeline-grid-line");
        svg.appendChild(line);
      });
    }

    function createScoreTimeline(metrics) {
      var block = document.createElement("section");
      var heading = document.createElement("h3");
      var chartWrap = document.createElement("div");
      var svg = createSvgElement("svg");
      var p1Line = createSvgElement("polyline");
      var p2Line = createSvgElement("polyline");
      var legend = document.createElement("dl");
      var maxScore = Math.max(1, metrics.p1Score, metrics.p2Score);

      block.className = "dab-metrics-block dab-timeline-block";
      heading.textContent = "Capture Timeline";
      chartWrap.className = "dab-timeline-chart";
      svg.setAttribute("viewBox", "0 0 100 64");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Cumulative boxes captured over " + metrics.totalMoves + " player moves.");

      appendTimelineGrid(svg, maxScore);

      p1Line.setAttribute("points", buildScorePolyline(metrics, engine.PLAYER_ONE, maxScore));
      p1Line.setAttribute("class", "dab-timeline-line is-p1");
      p2Line.setAttribute("points", buildScorePolyline(metrics, engine.PLAYER_TWO, maxScore));
      p2Line.setAttribute("class", "dab-timeline-line is-p2");
      svg.append(p1Line, p2Line);

      legend.className = "dab-timeline-legend";
      legend.append(
        createMetricReadout(engine.playerShortLabel(engine.PLAYER_ONE), metrics.p1Score + " boxes"),
        createMetricReadout(engine.playerShortLabel(engine.PLAYER_TWO), metrics.p2Score + " boxes")
      );

      chartWrap.append(svg, legend);
      block.append(heading, chartWrap);
      return block;
    }

    function describeCaptureMove(capture) {
      if (!capture.move) {
        return "None";
      }

      return engine.playerShortLabel(capture.player) + " +" + capture.count + " on " + capture.move.label;
    }

    function describeCaptureRun(run) {
      if (!run.player || !run.count) {
        return "None";
      }

      return engine.playerShortLabel(run.player) + " +" + run.count + " boxes";
    }

    function createMetricSummary(metrics) {
      var block = document.createElement("section");
      var heading = document.createElement("h3");
      var readouts = document.createElement("dl");

      block.className = "dab-metrics-block dab-summary-block";
      heading.textContent = "Match Readouts";
      readouts.className = "dab-metric-readouts";
      readouts.append(
        createMetricReadout("player moves", String(metrics.totalMoves)),
        createMetricReadout("scoring turns", String(metrics.scoringMoves.length)),
        createMetricReadout("biggest turn", describeCaptureMove(metrics.biggestCapture)),
        createMetricReadout("longest run", describeCaptureRun(metrics.longestRun)),
        createMetricReadout("lead changes", String(metrics.leadChanges)),
        createMetricReadout(engine.playerShortLabel(engine.PLAYER_ONE) + " yield", formatPercentValue(metrics.p1Score, metrics.p1Lines)),
        createMetricReadout(engine.playerShortLabel(engine.PLAYER_TWO) + " yield", formatPercentValue(metrics.p2Score, metrics.p2Lines))
      );

      block.append(heading, readouts);
      return block;
    }

    function renderMetrics() {
      var metrics;
      var heading;
      var summary;
      var grid;

      els.metricsPanel.replaceChildren();

      if (!state.result) {
        els.metricsPanel.hidden = true;
        return;
      }

      metrics = createMatchMetrics();
      heading = document.createElement("h2");
      summary = document.createElement("p");
      grid = document.createElement("div");

      els.metricsPanel.hidden = false;
      heading.id = "dab-metrics-heading";
      heading.textContent = "Match Metrics";
      summary.className = "dab-metrics-summary";
      summary.textContent = metrics.totalBoxes + " boxes closed across " + metrics.totalMoves + " player moves on " + currentBoard.label + ".";
      grid.className = "dab-metrics-grid";
      grid.append(
        createScoreShare(metrics),
        createMetricSummary(metrics),
        createScoreTimeline(metrics)
      );

      els.metricsPanel.append(heading, summary, grid);
    }

    function renderBoardPresets() {
      var fragment = document.createDocumentFragment();

      els.presetList.replaceChildren();

      PRESETS.forEach(function (preset) {
        var button = document.createElement("button");
        var isActive = currentBoard.mode === "rectangle" && currentBoard.width === preset.width && currentBoard.height === preset.height;

        button.type = "button";
        button.dataset.width = String(preset.width);
        button.dataset.height = String(preset.height);
        button.className = isActive ? "is-active" : "";
        button.setAttribute("aria-pressed", isActive ? "true" : "false");
        button.textContent = preset.label;
        fragment.appendChild(button);
      });

      els.presetList.appendChild(fragment);
    }

    function buildGridTemplate(trackCount) {
      return Array.from({ length: trackCount }, function (_, index) {
        return index % 2 === 0 ? "var(--dab-dot-track)" : "var(--dab-box-track)";
      }).join(" ");
    }

    function renderBoard() {
      var capturedSet = engine.getBoxOwnerSet(state, state.lastCapturedBoxIds);
      var rowCount = state.boxRows * 2 + 1;
      var colCount = state.boxCols * 2 + 1;
      var fragment = document.createDocumentFragment();
      var rowIndex;
      var colIndex;

      els.board.replaceChildren();
      els.board.style.gridTemplateColumns = buildGridTemplate(colCount);
      els.board.style.gridTemplateRows = buildGridTemplate(rowCount);
      els.board.setAttribute("aria-label", currentBoard.label + " Dots and Boxes board");

      for (rowIndex = 0; rowIndex < rowCount; rowIndex += 1) {
        for (colIndex = 0; colIndex < colCount; colIndex += 1) {
          fragment.appendChild(createBoardCell(rowIndex, colIndex, capturedSet));
        }
      }

      els.board.appendChild(fragment);
    }

    function createBoardCell(gridRow, gridCol, capturedSet) {
      if (gridRow % 2 === 0 && gridCol % 2 === 0) {
        return createDot();
      }

      if (gridRow % 2 === 0) {
        return createEdgeButton("h", gridRow / 2, (gridCol - 1) / 2);
      }

      if (gridCol % 2 === 0) {
        return createEdgeButton("v", (gridRow - 1) / 2, gridCol / 2);
      }

      return createBoxCell((gridRow - 1) / 2, (gridCol - 1) / 2, capturedSet);
    }

    function createDot() {
      var dot = document.createElement("span");

      dot.className = "dab-dot";
      dot.setAttribute("aria-hidden", "true");
      return dot;
    }

    function createEdgeButton(orientation, row, col) {
      var id = engine.edgeId(orientation, row, col);
      var edge = state.edges[id];
      var element;
      var isLast = state.lastMove && state.lastMove.edgeId === id;

      if (!edge) {
        element = document.createElement("span");
        element.className = "dab-empty-edge";
        element.setAttribute("aria-hidden", "true");
        return element;
      }

      element = document.createElement("button");
      element.type = "button";
      element.className = "dab-edge dab-edge-" + orientation;
      element.dataset.edgeId = id;
      element.setAttribute("role", "gridcell");
      element.setAttribute("aria-label", edge.drawn ? engine.edgeLabel(edge) + " drawn by " + engine.playerLabel(edge.drawnBy) : "Draw " + engine.edgeLabel(edge));
      element.disabled = edge.drawn || state.status !== "playing";

      if (edge.drawn) {
        element.classList.add("is-drawn");
        if (edge.drawnBy === engine.PLAYER_ONE) {
          element.classList.add("is-p1");
        } else if (edge.drawnBy === engine.PLAYER_TWO) {
          element.classList.add("is-p2");
        } else {
          element.classList.add("is-auto");
        }
      }

      if (isLast) {
        element.classList.add("is-last");
      }

      return element;
    }

    function createBoxCell(row, col, capturedSet) {
      var id = engine.boxId(row, col);
      var box = state.boxes[id];
      var cell = document.createElement("div");

      if (!box) {
        cell.className = "dab-box dab-hole";
        cell.setAttribute("aria-hidden", "true");
        return cell;
      }

      cell.className = "dab-box";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-label", engine.boxLabel(box) + (box.owner ? " claimed by " + engine.playerLabel(box.owner) : " open"));

      if (box.owner) {
        cell.classList.add("is-owned", box.owner === engine.PLAYER_ONE ? "is-p1" : "is-p2");
        cell.textContent = getPlayerInitial(box.owner);
      }

      if (capturedSet[id]) {
        cell.classList.add("is-last-capture");
      }

      return cell;
    }

    function renderShapeEditor() {
      var count = engine.countShapeBoxes(customShape);
      var fragment = document.createDocumentFragment();

      els.shapeWidth.value = String(customShape[0].length);
      els.shapeHeight.value = String(customShape.length);
      els.shapeGrid.replaceChildren();
      els.shapeGrid.style.gridTemplateColumns = "repeat(" + customShape[0].length + ", minmax(34px, 1fr))";

      customShape.forEach(function (row, rowIndex) {
        row.forEach(function (selected, colIndex) {
          var button = document.createElement("button");

          button.type = "button";
          button.dataset.row = String(rowIndex);
          button.dataset.col = String(colIndex);
          button.className = selected ? "is-selected" : "";
          button.setAttribute("aria-pressed", selected ? "true" : "false");
          button.setAttribute("aria-label", (selected ? "Remove" : "Add") + " box row " + (rowIndex + 1) + " column " + (colIndex + 1));
          button.textContent = selected ? "ON" : "OFF";
          fragment.appendChild(button);
        });
      });

      els.shapeGrid.appendChild(fragment);
      els.useShape.disabled = count === 0;

      if (!count) {
        els.shapeNote.textContent = "Select at least one box.";
      } else if (!engine.isShapeConnected(customShape)) {
        els.shapeNote.textContent = count + " boxes selected. Separate islands are playable from any legal line.";
      } else {
        els.shapeNote.textContent = count + " boxes selected.";
      }
    }

    function renderLog() {
      var entries = state.moveHistory.slice().reverse();
      var fragment = document.createDocumentFragment();

      els.moveLog.replaceChildren();

      if (!entries.length) {
        var empty = document.createElement("li");
        empty.className = "empty-log";
        empty.textContent = state.autoLineSeed ? state.autoLineSeed.count + " auto lines placed / awaiting first player line" : "awaiting first line";
        els.moveLog.appendChild(empty);
        return;
      }

      entries.slice(0, 28).forEach(function (move) {
        var item = document.createElement("li");
        var captures = move.completedBoxIds.length ? " +" + move.completedBoxIds.length + " box" + (move.completedBoxIds.length === 1 ? "" : "es") : "";

        item.textContent = String(move.index).padStart(3, "0") + " " + engine.playerShortLabel(move.player) + " " + move.label + captures;
        fragment.appendChild(item);
      });

      els.moveLog.appendChild(fragment);
    }

    function normalizeNameKey(name) {
      return name.trim().toLowerCase().replace(/\s+/g, " ");
    }

    function linesForPlayer(player) {
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
        linesDrawn: 0,
        boxesCaptured: 0,
        lastPlayedAt: null,
        lastWonAt: null
      }, stats.players[key] || {});

      record.name = name;
      record.games += 1;
      record.linesDrawn += linesForPlayer(player);
      record.boxesCaptured += state.scores[player];
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

    function updateBoardStats(stats) {
      var key = currentBoard.mode + ":" + state.boxRows + "x" + state.boxCols + ":" + state.totalBoxes;
      var board = Object.assign({
        label: currentBoard.label,
        matches: 0,
        draws: 0,
        playerOneWins: 0,
        playerTwoWins: 0,
        totalMoves: 0,
        totalBoxes: 0
      }, stats.boards[key] || {});

      board.label = currentBoard.label;
      board.matches += 1;
      board.totalMoves += state.drawnEdgeCount;
      board.totalBoxes += state.totalBoxes;

      if (state.result.type === "draw") {
        board.draws += 1;
      } else if (state.result.winner === engine.PLAYER_ONE) {
        board.playerOneWins += 1;
      } else if (state.result.winner === engine.PLAYER_TWO) {
        board.playerTwoWins += 1;
      }

      stats.boards[key] = board;
    }

    function recordMatch() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      var now = new Date().toISOString();
      var winnerName = state.result.type === "draw" ? "DRAW" : getPlayerName(state.result.winner) || engine.playerLabel(state.result.winner);

      stats.matches += 1;
      stats.totalMoves += state.drawnEdgeCount;
      stats.totalBoxesCaptured += state.totalBoxes;
      stats.lastPlayedAt = now;

      if (state.result.type === "draw") {
        stats.draws += 1;
      } else if (state.result.winner === engine.PLAYER_ONE) {
        stats.playerOneWins += 1;
      } else if (state.result.winner === engine.PLAYER_TWO) {
        stats.playerTwoWins += 1;
      }

      updateBoardStats(stats);
      updatePlayerStats(stats, engine.PLAYER_ONE, now);
      updatePlayerStats(stats, engine.PLAYER_TWO, now);

      stats.recent.unshift({
        playedAt: now,
        result: state.result.type,
        winnerMark: state.result.winner || engine.DRAW,
        winnerName: winnerName,
        playerOneName: getPlayerName(engine.PLAYER_ONE) || "Player 1",
        playerTwoName: getPlayerName(engine.PLAYER_TWO) || "Player 2",
        boardLabel: currentBoard.label,
        moves: state.drawnEdgeCount,
        score: state.scores.P1 + "-" + state.scores.P2
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
    sortOrder: 40,
    title: "Dots and Boxes",
    version: "v1.0",
    command: "./dots-and-boxes --pass-and-play",
    status: "installed",
    players: "2 local",
    duration: "5-20 min",
    type: "territory strategy",
    description: "A pass-and-play line drawing match with shared edges, box captures, extra turns, rectangular boards, and custom shapes.",
    rules: [
      "Players take turns drawing one undrawn horizontal or vertical line between neighboring dots.",
      "A line can be drawn only once and must touch at least one playable box.",
      "If your line completes one or more boxes, you claim those boxes for 1 point each and take another turn.",
      "If your line completes no boxes, the turn passes to the other player.",
      "The game ends when every playable line has been drawn.",
      "The player with the most claimed boxes wins; tied high scores are a draw."
    ],
    getLibraryMetrics: formatLibraryMetrics,
    renderLeaderboard: renderLeaderboard,
    createController: createController
  });
})(window);
