(function registerHnefatafl(global) {
  "use strict";

  var GAME_ID = "hnefatafl";
  var game = global.Hnefatafl;

  function createEmptyStats() {
    return {
      version: 1,
      matches: 0,
      attackerWins: 0,
      defenderWins: 0,
      averageMoves: 0,
      lastPlayedAt: null,
      players: {},
      recent: []
    };
  }

  function normalizeStats(rawStats) {
    var stats = Object.assign(createEmptyStats(), rawStats || {});
    stats.matches = Number(stats.matches) || 0;
    stats.attackerWins = Number(stats.attackerWins) || 0;
    stats.defenderWins = Number(stats.defenderWins) || 0;
    stats.averageMoves = Number(stats.averageMoves) || 0;
    stats.players = stats.players && typeof stats.players === "object" ? stats.players : {};
    stats.recent = Array.isArray(stats.recent) ? stats.recent : [];
    return stats;
  }

  function formatLibraryMetrics(rawStats) {
    var stats = normalizeStats(rawStats);
    return "atks:" + stats.attackerWins + " defs:" + stats.defenderWins;
  }

  function renderLeaderboard(container, rawStats, helpers) {
    var stats = normalizeStats(rawStats);
    var summary = document.createElement("dl");
    summary.className = "vapor-readout-grid";
    summary.append(
      helpers.createReadout("matches", String(stats.matches)),
      helpers.createReadout("attacker wins", String(stats.attackerWins)),
      helpers.createReadout("defender wins", String(stats.defenderWins)),
      helpers.createReadout("avg moves", String(stats.averageMoves || "--")),
      helpers.createReadout("last played", helpers.formatDateTime(stats.lastPlayedAt))
    );
    container.appendChild(summary);

    // Add descriptive text about the game
    var desc = document.createElement("p");
    desc.className = "vapor-readout";
    desc.innerHTML = "<strong>Role:</strong> " + (stats.players.attacker || "Attacker") + "<br><strong>Defense:</strong> " + (stats.players.defender || "Defender");
    summary.appendChild(desc);

    if (stats.recent.length) {
      var recentSection = document.createElement("section");
      recentSection.innerHTML = "<h2>Recent</h2><ol></ol>";
      var recentList = recentSection.querySelector("ol");
      stats.recent.slice(0, 5).forEach(function(match) {
        var item = document.createElement("li");
        var resultText = match.winner === 1 ? "ATTACKER WINS" : "DEFENDERS WIN";
        item.textContent = helpers.formatDateTime(match.playedAt) + " | " + resultText + " | " + match.moves + " moves";
        recentList.appendChild(item);
      });
      container.appendChild(recentSection);
    } else {
      var empty = document.createElement("p");
      empty.className = "empty-state";
      empty.textContent = "No games played yet. Launch a match to record results!";
      container.appendChild(empty);
    }
  }

  function createController(options) {
    var root = options.root;
    var services = options.services;
    var state = game.createInitialState();
    var savedNames = services.getPlayerNames(GAME_ID);
    var playerNames = {
      attacker: typeof savedNames.attacker === "string" ? savedNames.attacker : "Attacker",
      defender: typeof savedNames.defender === "string" ? savedNames.defender : "Defenders"
    };
    var mounted = false;
    var els = {};
    var matchRecorded = false;
    var currentPlayerPrompt = null;

    function mount() {
      if (!mounted) {
        root.replaceChildren();
        root.appendChild(createMarkup());
        bindEvents();
        mounted = true;
        render();
        // Prompt for player names
        promptForPlayerNames();
      }
    }

    function promptForPlayerNames() {
      var attacker = window.prompt("Attackers - enter your name:", playerNames.attacker);
      if (attacker !== null) playerNames.attacker = attacker || "Attacker";
      
      var defender = window.prompt("Defenders - enter your name:", playerNames.defender);
      if (defender !== null) playerNames.defender = defender || "Defenders";
      
      services.setPlayerNames(GAME_ID, { attacker: playerNames.attacker, defender: playerNames.defender });
      render();
    }

    function createMarkup() {
      var container = document.createElement("div");
      container.className = "hnefatafl-container";

      // Top bar with controls
      var topBar = document.createElement("div");
      topBar.className = "hnefatafl-topbar";
      topBar.innerHTML = '\
        <div class="game-info">\
          <span class="turn-indicator" id="turn-indicator">ATTACKERS TO MOVE</span>\
          <span class="move-counter" id="move-counter">Move: 0</span>\
        </div>\
        <div class="game-controls">\
          <button type="button" class="control-btn" id="btn-undo" title="Undo last move">UNDO</button>\
          <button type="button" class="control-btn" id="btn-restart" title="Restart game">RESTART</button>\
        </div>\
      ';
      container.appendChild(topBar);

      // Game status banner
      var statusBanner = document.createElement("div");
      statusBanner.className = "game-status";
      statusBanner.id = "game-status";
      container.appendChild(statusBanner);

      // Board wrapper
      var boardWrapper = document.createElement("div");
      boardWrapper.className = "board-wrapper";
      boardWrapper.id = "board-wrapper";
      container.appendChild(boardWrapper);

      // Rules/Info panel
      var infoPanel = document.createElement("div");
      infoPanel.className = "game-info-panel";
      infoPanel.innerHTML = '\
        <div class="info-row">\
          <span class="info-label">ATTACKERS:</span>\
          <span class="info-value" id="attacker-count">16</span>\
        </div>\
        <div class="info-row">\
          <span class="info-label">DEFENDERS:</span>\
          <span class="info-value" id="defender-count">9</span>\
        </div>\
        <div class="info-row">\
          <span class="info-label">KING:</span>\
          <span class="info-value" id="king-status">At throne</span>\
        </div>\
      ';
      container.appendChild(infoPanel);

      // Legend
      var legend = document.createElement("div");
      legend.className = "hnefatafl-legend";
      legend.innerHTML = '\
        <span class="legend-item"><span class="legend-piece attacker"></span> Attacker</span>\
        <span class="legend-item"><span class="legend-piece defender"></span> Defender</span>\
        <span class="legend-item"><span class="legend-piece king"></span> King</span>\
        <span class="legend-item"><span class="legend-piece throne"></span> Throne</span>\
        <span class="legend-item"><span class="legend-piece corner"></span> Corner (Escape)</span>\
      ';
      container.appendChild(legend);

      return container;
    }

    function bindEvents() {
      root.addEventListener("click", function(e) {
        var target = e.target;

        // Handle piece/square clicks
        if (target.classList.contains("board-piece")) {
          var pos = parseInt(target.dataset.pos, 10);
          handleSquareClick(pos);
        } else if (target.classList.contains("board-square")) {
          var pos = parseInt(target.dataset.pos, 10);
          handleSquareClick(pos);
        }

        // Control buttons
        if (target.id === "btn-undo") {
          handleUndo();
        } else if (target.id === "btn-restart") {
          handleRestart();
        }
      });
    }

    function handleSquareClick(pos) {
      if (state.gameOver) return;

      // If we have a selected piece
      if (state.selectedPos !== null) {
        // If clicking the same square, deselect
        if (state.selectedPos === pos) {
          state.selectedPos = null;
        } else {
          // Try to move
          var validation = game.validateMove(state, state.selectedPos, pos);
          if (validation.ok) {
            var result = game.executeMove(state, state.selectedPos, pos);
            if (result.success) {
              state = result.newState;
              state.selectedPos = null;
              checkAndRecordGameEnd();
            }
          } else {
            // Check if clicking another piece of same player
            var piece = state.board[pos];
            var isMyPiece = state.currentPlayer === 1 ? piece === "A" : piece === "D" || piece === "K";
            if (isMyPiece) {
              state.selectedPos = pos;
            } else {
              state.selectedPos = null;
            }
          }
        }
      } else {
        // Select a piece
        var piece = state.board[pos];
        var isMyPiece = state.currentPlayer === 1 ? piece === "A" : piece === "D" || piece === "K";
        if (isMyPiece) {
          state.selectedPos = pos;
        }
      }
      render();
    }

    function handleUndo() {
      var result = game.undo(state);
      if (result.success) {
        state = result.newState;
        state.selectedPos = null;
        matchRecorded = false;
        render();
      }
    }

    function handleRestart() {
      if (window.confirm("Restart this game?")) {
        state = game.createInitialState();
        state.selectedPos = null;
        matchRecorded = false;
        render();
      }
    }

    function checkAndRecordGameEnd() {
      if (state.gameOver && !matchRecorded) {
        matchRecorded = true;
        saveMatchResult();
      }
    }

    function saveMatchResult() {
      var stats = normalizeStats(services.getStats(GAME_ID));
      stats.matches++;
      if (state.winner === 1) {
        stats.attackerWins++;
      } else {
        stats.defenderWins++;
      }
      var avgMoves = stats.averageMoves;
      if (stats.attackerWins === 0 && stats.defenderWins === 0) {
        stats.averageMoves = state.moveCount;
      } else if (stats.averageMoves > 0) {
        var total = avgMoves * (stats.matches - 1) + state.moveCount;
        stats.averageMoves = Math.round(total / stats.matches);
      } else {
        stats.averageMoves = state.moveCount;
      }
      stats.lastPlayedAt = Date.now();
      
      // Record recent match (store up to 10)
      var recent = stats.recent;
      recent.unshift({
        winner: state.winner,
        moves: state.moveCount,
        playedAt: Date.now()
      });
      if (recent.length > 10) recent.pop();
      stats.recent = recent;

      services.setStats(GAME_ID, stats);
    }

    function render() {
      els = {
        boardWrapper: root.querySelector("#board-wrapper"),
        turnIndicator: root.querySelector("#turn-indicator"),
        moveCounter: root.querySelector("#move-counter"),
        attackerCount: root.querySelector("#attacker-count"),
        defenderCount: root.querySelector("#defender-count"),
        kingStatus: root.querySelector("#king-status"),
        gameStatus: root.querySelector("#game-status")
      };

      renderBoard();
      renderState();
    }

    function renderState() {
      // Update turn indicator
      els.turnIndicator.textContent = state.currentPlayer === 1 ? "ATTACKERS TO MOVE" : "DEFENDERS TO MOVE";
      els.turnIndicator.className = "turn-indicator " + (state.currentPlayer === 1 ? "attacker-turn" : "defender-turn");

      // Update move counter
      els.moveCounter.textContent = "Move: " + state.moveCount;

      // Update piece counts
      els.attackerCount.textContent = game.countPieces(state.board, "A");
      els.defenderCount.textContent = game.countPieces(state.board, "D") + (game.findKing(state.board) !== -1 ? 1 : 0);
      
      // Update king status
      var kingPos = game.findKing(state.board);
      if (kingPos !== -1) {
        var kingRC = game.getRowCol(kingPos);
        els.kingStatus.textContent = "Row " + (kingRC.row + 1) + ", Col " + (kingRC.col + 1);
        if (game.isCorner(kingPos)) {
          els.kingStatus.textContent = "ESCAPED!";
          els.kingStatus.classList.add("escape");
        } else if (game.isAdjacentToThrone(kingPos)) {
          els.kingStatus.classList.add("near-throne");
        } else {
          els.kingStatus.classList.remove("escape", "near-throne");
        }
      }

      // Game over status
      if (state.gameOver) {
        var winnerName = state.winner === 1 ? playerNames.attacker : playerNames.defender;
        var winMessage = state.winner === 1 ? 
          "ATTACKERS WIN! King captured." : 
          "DEFENDERS WIN! King escaped to a corner!";
        els.gameStatus.textContent = winMessage;
        els.gameStatus.className = "game-status winner";
      } else {
        els.gameStatus.textContent = "";
        els.gameStatus.className = "game-status";
      }
    }

    function renderBoard() {
      var boardEl = els.boardWrapper.querySelector(".board-grid");
      if (!boardEl) {
        boardEl = document.createElement("div");
        boardEl.className = "board-grid";
        els.boardWrapper.appendChild(boardEl);
      }

      // Clear existing
      boardEl.innerHTML = "";

      // Render board squares
      for (var row = 0; row < 11; row++) {
        for (var col = 0; col < 11; col++) {
          var index = game.getIndex(row, col);
          var square = document.createElement("div");
          square.className = "board-square";
          square.dataset.pos = index;

          var piece = state.board[index];
          
          // Add special square markers
          if (game.isThrone(index)) {
            square.classList.add("special-square", "throne");
          } else if (game.isCorner(index)) {
            square.classList.add("special-square", "corner");
          }

          // Render piece if present
          if (piece) {
            var pieceEl = document.createElement("div");
            pieceEl.className = "board-piece";
            pieceEl.dataset.pos = index;
            
            if (piece === "A") {
              pieceEl.classList.add("attacker");
              pieceEl.setAttribute("aria-label", "Attacker piece");
            } else if (piece === "D") {
              pieceEl.classList.add("defender");
              pieceEl.setAttribute("aria-label", "Defender piece");
            } else if (piece === "K") {
              pieceEl.classList.add("king");
              pieceEl.setAttribute("aria-label", "King piece");
              
              // Add crown marker for king
              var crown = document.createElement("span");
              crown.className = "king-crown";
              crown.textContent = "♔";
              pieceEl.appendChild(crown);
            }
            
            square.appendChild(pieceEl);
          }

          // Highlight selected piece
          if (state.selectedPos === index) {
            square.classList.add("selected");
          }

          // Highlight valid moves for selected piece
          if (state.selectedPos !== null && piece === null) {
            var validation = game.validateMove(state, state.selectedPos, index);
            if (validation.ok) {
              square.classList.add("valid-move");
            }
          }

          boardEl.appendChild(square);
        }
      }

      // Add coordinate labels
      renderCoordinateLabels();
    }

    function renderCoordinateLabels() {
      // Column labels (A-K)
      var colLabels = root.querySelector(".board-col-labels");
      if (!colLabels) {
        colLabels = document.createElement("div");
        colLabels.className = "board-col-labels";
      }
      colLabels.innerHTML = "";
      var cols = ["A","B","C","D","E","F","G","H","I","J","K"];
      for (var i = 0; i < 11; i++) {
        var label = document.createElement("span");
        label.textContent = cols[i];
        colLabels.appendChild(label);
      }

      // Row labels (1-11)
      var rowLabels = root.querySelector(".board-row-labels");
      if (!rowLabels) {
        rowLabels = document.createElement("div");
        rowLabels.className = "board-row-labels";
      }
      rowLabels.innerHTML = "";
      for (var j = 0; j < 11; j++) {
        var rowLabel = document.createElement("span");
        rowLabel.textContent = j + 1;
        rowLabels.appendChild(rowLabel);
      }

      // Append them if not already in the wrapper
      if (!root.querySelector(".board-col-labels")) {
        els.boardWrapper.insertBefore(colLabels, els.boardWrapper.firstChild);
      } else {
        root.querySelector(".board-col-labels").replaceWith(colLabels);
      }
      if (!root.querySelector(".board-row-labels")) {
        els.boardWrapper.insertBefore(rowLabels, els.boardWrapper.firstChild);
      } else {
        root.querySelector(".board-row-labels").replaceWith(rowLabels);
      }
    }

    function showStatus(message, isError) {
      state.lastError = message;
      // Could add a toast or status message display here
    }

    // Expose the state for UI interactions
    state.selectedPos = null;

    // Return the public API
    return {
      mount: mount,
      getState: function() { return state; },
      getSquareName: function(index) { return game.getSquareName(index); }
    };
  }

  // Register the game
  global.ChurchGames.registerGame({
    id: GAME_ID,
    title: "Hnefatafl",
    subtitle: "Viking King's Table",
    description: "Asymmetric Norse battle: Attackers hunt the King, Defenders guard his escape to the corners.",
    minPlayers: 2,
    maxPlayers: 2,
    rules: [
      "Asymmetric roles: 16 Attackers vs 8 Defenders + King",
      "All pieces move like Rooks (orthogonal, any distance, no jumping)",
      "Capture by sandwich: trap opponent piece between two enemies (or enemy + throne/corner)",
      "Attackers win by capturing the King (surround on all 4 sides)",
      "Defenders win by escaping the King to any corner",
      "Throne (center) is hostile - Attackers cannot occupy it",
      "Corners are hostile - only the King can occupy them"
    ],
    createController: createController,
    formatLibraryMetrics: formatLibraryMetrics,
    renderLeaderboard: renderLeaderboard
  });

})(typeof window !== "undefined" ? window : this);
