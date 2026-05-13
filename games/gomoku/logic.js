(function attachGomokuGame(global) {
  "use strict";

  var BOARD_SIZE = 15;
  var EMPTY = null;
  var BLACK = "BLACK";
  var WHITE = "WHITE";
  var DRAW = "DRAW";
  var RULE_MODE = "freestyle";
  var WIN_LENGTH = 5;
  var PLAYERS = [BLACK, WHITE];
  var DIRECTIONS = [
    { dr: 0, dc: 1, label: "horizontal" },
    { dr: 1, dc: 0, label: "vertical" },
    { dr: 1, dc: 1, label: "diagonal down-right" },
    { dr: 1, dc: -1, label: "diagonal down-left" }
  ];
  var COL_LABELS = "ABCDEFGHIJKLMNO".split("");

  function createEmptyBoard(size) {
    return Array.from({ length: size }, function () {
      return Array(size).fill(EMPTY);
    });
  }

  function createInitialState(options) {
    var size = options && Number(options.boardSize) || BOARD_SIZE;

    return {
      boardSize: size,
      board: createEmptyBoard(size),
      status: "playing",
      ruleMode: RULE_MODE,
      currentPlayer: BLACK,
      occupiedCount: 0,
      moveHistory: [],
      lastMove: null,
      lastError: null,
      winningLine: null,
      result: null,
      history: []
    };
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.slice();
    });
  }

  function cloneMove(move) {
    return move ? Object.assign({}, move) : null;
  }

  function clonePoint(point) {
    return point ? { row: point.row, col: point.col } : null;
  }

  function cloneWinningLine(line) {
    if (!line) {
      return null;
    }

    return {
      player: line.player,
      start: clonePoint(line.start),
      end: clonePoint(line.end),
      direction: { dr: line.direction.dr, dc: line.direction.dc, label: line.direction.label },
      length: line.length,
      cells: line.cells.map(clonePoint)
    };
  }

  function cloneResult(result) {
    return result ? Object.assign({}, result) : null;
  }

  function snapshotState(state) {
    return {
      boardSize: state.boardSize,
      board: cloneBoard(state.board),
      status: state.status,
      ruleMode: state.ruleMode,
      currentPlayer: state.currentPlayer,
      occupiedCount: state.occupiedCount,
      moveHistory: state.moveHistory.map(cloneMove),
      lastMove: cloneMove(state.lastMove),
      lastError: state.lastError,
      winningLine: cloneWinningLine(state.winningLine),
      result: cloneResult(state.result)
    };
  }

  function cloneState(state) {
    var cloned = snapshotState(state);
    cloned.history = state.history.slice();
    return cloned;
  }

  function otherPlayer(player) {
    return player === BLACK ? WHITE : BLACK;
  }

  function isInsideBoard(size, row, col) {
    return row >= 0 && row < size && col >= 0 && col < size;
  }

  function coordinateLabel(row, col) {
    return COL_LABELS[col] + String(row + 1);
  }

  function validateMove(state, player, row, col) {
    var actingPlayer = player || state.currentPlayer;

    if (state.status !== "playing") {
      return { ok: false, reason: "Game has already ended." };
    }

    if (actingPlayer !== state.currentPlayer) {
      return { ok: false, reason: "It is not " + playerLabel(actingPlayer) + "'s turn." };
    }

    if (!isInsideBoard(state.boardSize, row, col)) {
      return { ok: false, reason: "Move is outside the board." };
    }

    if (state.board[row][col] !== EMPTY) {
      return { ok: false, reason: coordinateLabel(row, col) + " is already occupied." };
    }

    return { ok: true, reason: "" };
  }

  function countDirection(board, row, col, dr, dc, player) {
    var size = board.length;
    var count = 0;
    var r = row + dr;
    var c = col + dc;

    while (isInsideBoard(size, r, c) && board[r][c] === player) {
      count += 1;
      r += dr;
      c += dc;
    }

    return {
      count: count,
      stoppedAt: { row: r, col: c }
    };
  }

  function buildLineCells(start, length, dr, dc) {
    var cells = [];
    var i;

    for (i = 0; i < length; i += 1) {
      cells.push({
        row: start.row + i * dr,
        col: start.col + i * dc
      });
    }

    return cells;
  }

  function findWinningLine(board, row, col, player, ruleMode) {
    var mode = ruleMode || RULE_MODE;
    var i;

    for (i = 0; i < DIRECTIONS.length; i += 1) {
      var direction = DIRECTIONS[i];
      var forward = countDirection(board, row, col, direction.dr, direction.dc, player);
      var backward = countDirection(board, row, col, -direction.dr, -direction.dc, player);
      var length = 1 + forward.count + backward.count;
      var winsFreestyle = mode === "freestyle" && length >= WIN_LENGTH;
      var winsExactFive = mode === "exact_five" && length === WIN_LENGTH;
      var start;
      var end;

      if (winsFreestyle || winsExactFive) {
        start = {
          row: row - backward.count * direction.dr,
          col: col - backward.count * direction.dc
        };
        end = {
          row: row + forward.count * direction.dr,
          col: col + forward.count * direction.dc
        };

        return {
          player: player,
          start: start,
          end: end,
          direction: direction,
          length: length,
          cells: buildLineCells(start, length, direction.dr, direction.dc)
        };
      }
    }

    return null;
  }

  function createMove(state, player, row, col, options) {
    return {
      index: state.moveHistory.length + 1,
      player: player,
      row: row,
      col: col,
      coordinate: coordinateLabel(row, col),
      createdAt: options && options.createdAt || null
    };
  }

  function applyMove(state, row, col, options) {
    var player = options && options.player || state.currentPlayer;
    var validation = validateMove(state, player, row, col);
    var next;
    var move;
    var line;

    if (!validation.ok) {
      next = cloneState(state);
      next.lastError = validation.reason;
      return { ok: false, reason: validation.reason, state: next };
    }

    next = cloneState(state);
    next.history = state.history.concat([snapshotState(state)]);
    next.lastError = null;
    next.board[row][col] = player;
    next.occupiedCount += 1;

    move = createMove(next, player, row, col, options || {});
    next.moveHistory = next.moveHistory.concat([move]);
    next.lastMove = move;

    line = findWinningLine(next.board, row, col, player, next.ruleMode);
    if (line) {
      next.status = "ended";
      next.winningLine = line;
      next.result = {
        type: "win",
        winner: player,
        reason: "five_in_row"
      };
    } else if (next.occupiedCount === next.boardSize * next.boardSize) {
      next.status = "ended";
      next.result = {
        type: "draw",
        winner: DRAW
      };
    } else {
      next.currentPlayer = otherPlayer(player);
    }

    return { ok: true, state: next };
  }

  function undoMove(state) {
    var previous;
    var restored;

    if (state.status === "ended") {
      restored = cloneState(state);
      restored.lastError = "The final result is locked. Start a rematch instead.";
      return restored;
    }

    if (!state.history.length) {
      restored = cloneState(state);
      restored.lastError = "No move to undo.";
      return restored;
    }

    previous = state.history[state.history.length - 1];
    restored = Object.assign({}, previous, {
      board: cloneBoard(previous.board),
      moveHistory: previous.moveHistory.map(cloneMove),
      lastMove: cloneMove(previous.lastMove),
      winningLine: cloneWinningLine(previous.winningLine),
      result: cloneResult(previous.result),
      lastError: null,
      history: state.history.slice(0, -1)
    });

    return restored;
  }

  function playerLabel(player) {
    return player === BLACK ? "Black" : player === WHITE ? "White" : "Draw";
  }

  function getWinningCellSet(line) {
    var set = {};

    if (!line || !Array.isArray(line.cells)) {
      return set;
    }

    line.cells.forEach(function (point) {
      set[point.row + "," + point.col] = true;
    });

    return set;
  }

  var api = {
    BOARD_SIZE: BOARD_SIZE,
    EMPTY: EMPTY,
    BLACK: BLACK,
    WHITE: WHITE,
    DRAW: DRAW,
    RULE_MODE: RULE_MODE,
    WIN_LENGTH: WIN_LENGTH,
    PLAYERS: PLAYERS,
    DIRECTIONS: DIRECTIONS,
    COL_LABELS: COL_LABELS,
    createInitialState: createInitialState,
    applyMove: applyMove,
    undoMove: undoMove,
    validateMove: validateMove,
    findWinningLine: findWinningLine,
    countDirection: countDirection,
    isInsideBoard: isInsideBoard,
    otherPlayer: otherPlayer,
    coordinateLabel: coordinateLabel,
    playerLabel: playerLabel,
    getWinningCellSet: getWinningCellSet
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.GomokuGame = api;
})(typeof window !== "undefined" ? window : globalThis);
