(function attachConnectFourPlus(global) {
  "use strict";

  var ROWS = 6;
  var COLS = 7;
  var PLAYERS = ["R", "Y"];
  var PLAYER_LABELS = {
    R: "Red",
    Y: "Yellow"
  };
  var MAX_HAND_SIZE = 3;
  var DRAW_EVERY_PERSONAL_TURNS = 4;
  var POWER_DECK = [
    "Pop",
    "Pop",
    "Lock",
    "Lock",
    "Swap Top",
    "Swap Top",
    "Shield",
    "Shield",
    "Double Drop"
  ];

  function createEmptyBoard() {
    return Array.from({ length: ROWS }, function () {
      return Array(COLS).fill(null);
    });
  }

  function drawPowerup(rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    return POWER_DECK[Math.floor(random() * POWER_DECK.length)];
  }

  function createInitialState(options) {
    var rng = options && options.rng;

    return {
      board: createEmptyBoard(),
      currentPlayer: "R",
      pendingHandoff: true,
      turnOpen: false,
      winner: null,
      draw: false,
      winningLine: null,
      turnCount: 0,
      dropCount: 0,
      lastError: null,
      lastMove: null,
      pendingPower: null,
      powerUsedThisTurn: false,
      dropPlan: {
        remaining: 1,
        firstColumn: null
      },
      lockedColumn: null,
      lockedFor: null,
      publicLog: [],
      players: {
        R: {
          personalTurns: 0,
          hand: [drawPowerup(rng)]
        },
        Y: {
          personalTurns: 0,
          hand: [drawPowerup(rng)]
        }
      }
    };
  }

  function cloneCell(cell) {
    return cell ? Object.assign({}, cell) : null;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(cloneCell);
    });
  }

  function cloneState(state) {
    return {
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      pendingHandoff: state.pendingHandoff,
      turnOpen: state.turnOpen,
      winner: state.winner,
      draw: state.draw,
      winningLine: state.winningLine ? state.winningLine.map(function (cell) { return cell.slice(); }) : null,
      turnCount: state.turnCount,
      dropCount: state.dropCount,
      lastError: state.lastError,
      lastMove: state.lastMove ? Object.assign({}, state.lastMove) : null,
      pendingPower: state.pendingPower ? Object.assign({}, state.pendingPower) : null,
      powerUsedThisTurn: state.powerUsedThisTurn,
      dropPlan: Object.assign({}, state.dropPlan),
      lockedColumn: state.lockedColumn,
      lockedFor: state.lockedFor,
      publicLog: state.publicLog.slice(),
      players: {
        R: {
          personalTurns: state.players.R.personalTurns,
          hand: state.players.R.hand.slice()
        },
        Y: {
          personalTurns: state.players.Y.personalTurns,
          hand: state.players.Y.hand.slice()
        }
      }
    };
  }

  function otherPlayer(player) {
    return player === "R" ? "Y" : "R";
  }

  function inBounds(row, col) {
    return row >= 0 && row < ROWS && col >= 0 && col < COLS;
  }

  function columnHeight(board, col) {
    var count = 0;
    var row;

    for (row = 0; row < ROWS; row += 1) {
      if (board[row][col]) {
        count += 1;
      }
    }

    return count;
  }

  function isColumnFull(board, col) {
    return board[0][col] !== null;
  }

  function getDropRow(board, col) {
    var row;

    for (row = ROWS - 1; row >= 0; row -= 1) {
      if (!board[row][col]) {
        return row;
      }
    }

    return null;
  }

  function getNonFullColumns(board) {
    var columns = [];
    var col;

    for (col = 0; col < COLS; col += 1) {
      if (!isColumnFull(board, col)) {
        columns.push(col);
      }
    }

    return columns;
  }

  function getLegalDropColumns(state) {
    var columns = getNonFullColumns(state.board);

    if (state.lockedFor === state.currentPlayer && state.lockedColumn !== null) {
      columns = columns.filter(function (col) {
        return col !== state.lockedColumn;
      });
    }

    if (state.dropPlan.remaining > 1 && state.dropPlan.firstColumn !== null) {
      columns = columns.filter(function (col) {
        return col !== state.dropPlan.firstColumn;
      });
    }

    return columns;
  }

  function collapseColumn(board, col) {
    var pieces = [];
    var row;

    for (row = ROWS - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        pieces.push(board[row][col]);
      }
    }

    for (row = ROWS - 1; row >= 0; row -= 1) {
      board[row][col] = pieces[ROWS - 1 - row] || null;
    }
  }

  function getTopOccupiedRows(board, col) {
    var rows = [];
    var row;

    for (row = 0; row < ROWS; row += 1) {
      if (board[row][col]) {
        rows.push(row);
      }
    }

    return rows;
  }

  function canUsePower(state, handIndex) {
    if (state.winner || state.draw) {
      return { ok: false, reason: "The game is already complete." };
    }

    if (!state.turnOpen || state.pendingHandoff) {
      return { ok: false, reason: "Reveal the active player's turn first." };
    }

    if (state.powerUsedThisTurn) {
      return { ok: false, reason: "Only one powerup may be used each turn." };
    }

    if (state.pendingPower) {
      return { ok: false, reason: "Resolve the selected powerup first." };
    }

    if (handIndex < 0 || handIndex >= state.players[state.currentPlayer].hand.length) {
      return { ok: false, reason: "That powerup is not in your hand." };
    }

    return { ok: true, reason: "" };
  }

  function startTurn(state) {
    var next = cloneState(state);

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    next.pendingHandoff = false;
    next.turnOpen = true;
    next.lastError = null;
    next.pendingPower = null;
    next.powerUsedThisTurn = false;
    next.dropPlan = {
      remaining: 1,
      firstColumn: null
    };

    return next;
  }

  function selectPower(state, handIndex) {
    var validation = canUsePower(state, handIndex);
    var next = cloneState(state);
    var power;

    if (!validation.ok) {
      next.lastError = validation.reason;
      return next;
    }

    power = next.players[next.currentPlayer].hand[handIndex];
    next.lastError = null;

    if (power === "Double Drop") {
      next.players[next.currentPlayer].hand.splice(handIndex, 1);
      next.powerUsedThisTurn = true;
      next.dropPlan = {
        remaining: 2,
        firstColumn: null
      };
      next.publicLog = next.publicLog.concat([PLAYER_LABELS[next.currentPlayer] + " used Double Drop."]);
      next.lastMove = {
        kind: "power",
        power: power
      };
      return next;
    }

    next.pendingPower = {
      name: power,
      handIndex: handIndex
    };
    return next;
  }

  function consumePendingPower(next) {
    next.players[next.currentPlayer].hand.splice(next.pendingPower.handIndex, 1);
    next.powerUsedThisTurn = true;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[next.currentPlayer] + " used " + next.pendingPower.name + "."]);
    next.lastMove = {
      kind: "power",
      power: next.pendingPower.name
    };
    next.pendingPower = null;
  }

  function applyPowerToColumn(state, col) {
    var next = cloneState(state);
    var power = next.pendingPower && next.pendingPower.name;
    var topRows;
    var temp;
    var nonFullColumns;

    if (!power) {
      next.lastError = "Select a column powerup first.";
      return next;
    }

    if (col < 0 || col >= COLS) {
      next.lastError = "Column is outside the board.";
      return next;
    }

    if (power === "Pop") {
      if (!next.board[ROWS - 1][col] || next.board[ROWS - 1][col].player !== next.currentPlayer) {
        next.lastError = "Pop can only remove your own bottom piece.";
        return next;
      }

      if (next.board[ROWS - 1][col].shielded) {
        next.lastError = "That piece is shielded.";
        return next;
      }

      next.board[ROWS - 1][col] = null;
      collapseColumn(next.board, col);
      consumePendingPower(next);
      next.lastError = null;
      return next;
    }

    if (power === "Lock") {
      nonFullColumns = getNonFullColumns(next.board);

      if (isColumnFull(next.board, col)) {
        next.lastError = "You cannot lock a full column.";
        return next;
      }

      if (nonFullColumns.length <= 1) {
        next.lastError = "You cannot lock the only playable column.";
        return next;
      }

      next.lockedColumn = col;
      next.lockedFor = otherPlayer(next.currentPlayer);
      consumePendingPower(next);
      next.lastError = null;
      return next;
    }

    if (power === "Swap Top") {
      topRows = getTopOccupiedRows(next.board, col);

      if (topRows.length < 2) {
        next.lastError = "Swap Top needs a column with at least two pieces.";
        return next;
      }

      temp = next.board[topRows[0]][col];
      next.board[topRows[0]][col] = next.board[topRows[1]][col];
      next.board[topRows[1]][col] = temp;
      consumePendingPower(next);
      next.lastError = null;
      return next;
    }

    next.lastError = power + " does not target a column.";
    return next;
  }

  function applyPowerToCell(state, row, col) {
    var next = cloneState(state);
    var power = next.pendingPower && next.pendingPower.name;
    var cell;

    if (!power) {
      next.lastError = "Select a piece powerup first.";
      return next;
    }

    if (!inBounds(row, col)) {
      next.lastError = "Target is outside the board.";
      return next;
    }

    cell = next.board[row][col];

    if (power !== "Shield") {
      next.lastError = power + " does not target a piece.";
      return next;
    }

    if (!cell || cell.player !== next.currentPlayer) {
      next.lastError = "Shield can only protect one of your pieces.";
      return next;
    }

    if (cell.shielded) {
      next.lastError = "That piece is already shielded.";
      return next;
    }

    cell.shielded = true;
    consumePendingPower(next);
    next.lastError = null;
    return next;
  }

  function lineOwner(cells, player) {
    return cells.every(function (cell) {
      return cell && cell.player === player;
    });
  }

  function findWinningLineForPlayer(board, player) {
    var directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];
    var row;
    var col;
    var dirIndex;
    var cells;
    var i;
    var nextRow;
    var nextCol;

    for (row = 0; row < ROWS; row += 1) {
      for (col = 0; col < COLS; col += 1) {
        for (dirIndex = 0; dirIndex < directions.length; dirIndex += 1) {
          cells = [];

          for (i = 0; i < 4; i += 1) {
            nextRow = row + directions[dirIndex][0] * i;
            nextCol = col + directions[dirIndex][1] * i;

            if (!inBounds(nextRow, nextCol)) {
              cells = null;
              break;
            }

            cells.push([nextRow, nextCol]);
          }

          if (cells && lineOwner(cells.map(function (position) {
            return board[position[0]][position[1]];
          }), player)) {
            return cells;
          }
        }
      }
    }

    return null;
  }

  function findWinner(board, activePlayer) {
    var activeLine = findWinningLineForPlayer(board, activePlayer);
    var other = otherPlayer(activePlayer);
    var otherLine = findWinningLineForPlayer(board, other);

    if (activeLine) {
      return {
        winner: activePlayer,
        line: activeLine
      };
    }

    if (otherLine) {
      return {
        winner: other,
        line: otherLine
      };
    }

    return {
      winner: null,
      line: null
    };
  }

  function isBoardFull(board) {
    return getNonFullColumns(board).length === 0;
  }

  function finishTurn(next, activePlayer) {
    var playerState = next.players[activePlayer];

    playerState.personalTurns += 1;
    next.turnCount += 1;

    if (playerState.personalTurns % DRAW_EVERY_PERSONAL_TURNS === 0 && playerState.hand.length < MAX_HAND_SIZE) {
      playerState.hand.push(drawPowerup());
      next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " drew a hidden powerup."]);
    }

    if (next.lockedFor === activePlayer) {
      next.lockedFor = null;
      next.lockedColumn = null;
    }

    next.currentPlayer = otherPlayer(activePlayer);
    next.pendingHandoff = true;
    next.turnOpen = false;
    next.pendingPower = null;
    next.powerUsedThisTurn = false;
    next.dropPlan = {
      remaining: 1,
      firstColumn: null
    };
  }

  function completeTerminalTurn(next, activePlayer) {
    next.players[activePlayer].personalTurns += 1;
    next.turnCount += 1;

    if (next.lockedFor === activePlayer) {
      next.lockedFor = null;
      next.lockedColumn = null;
    }

    next.turnOpen = false;
    next.pendingHandoff = false;
    next.pendingPower = null;
    next.powerUsedThisTurn = false;
    next.dropPlan = {
      remaining: 1,
      firstColumn: null
    };
  }

  function dropPiece(state, col) {
    var next = cloneState(state);
    var legalColumns = getLegalDropColumns(next);
    var row;
    var activePlayer = next.currentPlayer;
    var result;

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    if (!next.turnOpen || next.pendingHandoff) {
      next.lastError = "Reveal the active player's turn first.";
      return next;
    }

    if (next.pendingPower) {
      next.lastError = "Resolve or cancel the selected powerup before dropping.";
      return next;
    }

    if (legalColumns.indexOf(col) === -1) {
      next.lastError = col === next.lockedColumn ? "That column is locked this turn." : "That column is not playable.";
      return next;
    }

    row = getDropRow(next.board, col);
    next.board[row][col] = {
      player: activePlayer,
      shielded: false
    };
    next.dropCount += 1;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " dropped in column " + (col + 1) + "."]);
    next.lastMove = {
      kind: "drop",
      player: activePlayer,
      row: row,
      col: col
    };

    result = findWinner(next.board, activePlayer);
    if (result.winner) {
      completeTerminalTurn(next, activePlayer);
      next.winner = result.winner;
      next.winningLine = result.line;
      next.lastError = null;
      return next;
    }

    if (isBoardFull(next.board)) {
      completeTerminalTurn(next, activePlayer);
      next.draw = true;
      next.lastError = null;
      return next;
    }

    if (next.dropPlan.remaining > 1) {
      next.dropPlan.remaining -= 1;
      next.dropPlan.firstColumn = col;

      if (!getLegalDropColumns(next).length) {
        finishTurn(next, activePlayer);
      }

      next.lastError = null;
      return next;
    }

    finishTurn(next, activePlayer);
    next.lastError = null;
    return next;
  }

  function cancelPendingPower(state) {
    var next = cloneState(state);
    next.pendingPower = null;
    next.lastError = null;
    return next;
  }

  var api = {
    ROWS: ROWS,
    COLS: COLS,
    PLAYERS: PLAYERS,
    PLAYER_LABELS: PLAYER_LABELS,
    POWER_DECK: POWER_DECK,
    MAX_HAND_SIZE: MAX_HAND_SIZE,
    createInitialState: createInitialState,
    cloneState: cloneState,
    startTurn: startTurn,
    selectPower: selectPower,
    cancelPendingPower: cancelPendingPower,
    applyPowerToColumn: applyPowerToColumn,
    applyPowerToCell: applyPowerToCell,
    dropPiece: dropPiece,
    getLegalDropColumns: getLegalDropColumns,
    getNonFullColumns: getNonFullColumns,
    findWinningLineForPlayer: findWinningLineForPlayer
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.ConnectFourPlus = api;
})(typeof window !== "undefined" ? window : globalThis);
