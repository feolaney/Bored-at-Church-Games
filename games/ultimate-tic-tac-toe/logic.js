(function attachUltimateGame(global) {
  "use strict";

  var PLAYERS = ["X", "O"];
  var DRAW = "D";
  var BOARD_LABELS = ["A1", "A2", "A3", "B1", "B2", "B3", "C1", "C2", "C3"];
  var CELL_LABELS = ["top-left", "top-middle", "top-right", "middle-left", "center", "middle-right", "bottom-left", "bottom-middle", "bottom-right"];
  var WIN_LINES = [
    [0, 1, 2],
    [3, 4, 5],
    [6, 7, 8],
    [0, 3, 6],
    [1, 4, 7],
    [2, 5, 8],
    [0, 4, 8],
    [2, 4, 6]
  ];

  function createEmptyBoards() {
    return Array.from({ length: 9 }, function () {
      return Array(9).fill(null);
    });
  }

  function createInitialState() {
    return {
      boards: createEmptyBoards(),
      boardStatus: Array(9).fill(null),
      currentPlayer: "X",
      nextBoard: null,
      winner: null,
      winningLine: null,
      moveCount: 0,
      lastMove: null,
      lastError: null,
      log: [],
      history: []
    };
  }

  function cloneBoards(boards) {
    return boards.map(function (board) {
      return board.slice();
    });
  }

  function snapshotState(state) {
    return {
      boards: cloneBoards(state.boards),
      boardStatus: state.boardStatus.slice(),
      currentPlayer: state.currentPlayer,
      nextBoard: state.nextBoard,
      winner: state.winner,
      winningLine: state.winningLine ? state.winningLine.slice() : null,
      moveCount: state.moveCount,
      lastMove: state.lastMove ? Object.assign({}, state.lastMove) : null,
      lastError: state.lastError,
      log: state.log.slice()
    };
  }

  function cloneState(state) {
    var cloned = snapshotState(state);
    cloned.history = state.history.slice();
    return cloned;
  }

  function otherPlayer(player) {
    return player === "X" ? "O" : "X";
  }

  function isBoardOpen(state, boardIndex) {
    return state.boardStatus[boardIndex] === null;
  }

  function findWinningLine(values, player) {
    for (var i = 0; i < WIN_LINES.length; i += 1) {
      var line = WIN_LINES[i];
      if (line.every(function (index) { return values[index] === player; })) {
        return line.slice();
      }
    }

    return null;
  }

  function isFull(values) {
    return values.every(Boolean);
  }

  function getLegalBoards(state) {
    if (state.winner) {
      return [];
    }

    if (state.nextBoard !== null && isBoardOpen(state, state.nextBoard)) {
      return [state.nextBoard];
    }

    return state.boardStatus.reduce(function (boards, status, index) {
      if (status === null) {
        boards.push(index);
      }
      return boards;
    }, []);
  }

  function isFreeMove(state) {
    return getLegalBoards(state).length !== 1 || state.nextBoard === null;
  }

  function validateMove(state, boardIndex, cellIndex) {
    if (state.winner) {
      return { ok: false, reason: "Game has already ended." };
    }

    if (boardIndex < 0 || boardIndex > 8 || cellIndex < 0 || cellIndex > 8) {
      return { ok: false, reason: "Move is outside the board." };
    }

    if (!isBoardOpen(state, boardIndex)) {
      return { ok: false, reason: BOARD_LABELS[boardIndex] + " is closed." };
    }

    if (state.boards[boardIndex][cellIndex]) {
      return { ok: false, reason: BOARD_LABELS[boardIndex] + "-" + (cellIndex + 1) + " is occupied." };
    }

    if (getLegalBoards(state).indexOf(boardIndex) === -1) {
      return { ok: false, reason: "Route locked to " + BOARD_LABELS[state.nextBoard] + "." };
    }

    return { ok: true, reason: "" };
  }

  function evaluateSmallBoard(board, player) {
    var line = findWinningLine(board, player);

    if (line) {
      return { status: player, line: line };
    }

    if (isFull(board)) {
      return { status: DRAW, line: null };
    }

    return { status: null, line: null };
  }

  function formatMove(move) {
    var destination = move.winner ? "HALT" : move.nextBoard === null ? "FREE" : BOARD_LABELS[move.nextBoard];
    var result = "";

    if (move.smallResult === move.player) {
      result = " | CLAIM " + BOARD_LABELS[move.boardIndex];
    } else if (move.smallResult === DRAW) {
      result = " | DRAW " + BOARD_LABELS[move.boardIndex];
    }

    if (move.winner === "X" || move.winner === "O") {
      result += " | GAME " + move.winner;
    } else if (move.winner === DRAW) {
      result += " | GAME DRAW";
    }

    return String(move.number).padStart(3, "0") + " " +
      move.player + " " +
      BOARD_LABELS[move.boardIndex] + "-" + (move.cellIndex + 1) +
      " -> " + destination +
      result;
  }

  function applyMove(state, boardIndex, cellIndex) {
    var validation = validateMove(state, boardIndex, cellIndex);
    var next;
    var player;
    var smallResult;
    var largeLine;
    var sentBoard;
    var move;

    if (!validation.ok) {
      next = cloneState(state);
      next.lastError = validation.reason;
      return { ok: false, reason: validation.reason, state: next };
    }

    next = cloneState(state);
    next.history = state.history.concat([snapshotState(state)]);
    next.lastError = null;
    player = state.currentPlayer;
    next.boards[boardIndex][cellIndex] = player;
    next.moveCount += 1;

    smallResult = evaluateSmallBoard(next.boards[boardIndex], player);
    if (smallResult.status) {
      next.boardStatus[boardIndex] = smallResult.status;
    }

    largeLine = findWinningLine(next.boardStatus, player);
    sentBoard = cellIndex;

    move = {
      number: next.moveCount,
      player: player,
      boardIndex: boardIndex,
      cellIndex: cellIndex,
      sentBoard: sentBoard,
      nextBoard: null,
      smallResult: smallResult.status,
      smallLine: smallResult.line,
      winner: null,
      freeMove: false
    };

    if (largeLine) {
      next.winner = player;
      next.winningLine = largeLine;
      next.nextBoard = null;
      move.winner = player;
    } else if (next.boardStatus.every(Boolean)) {
      next.winner = DRAW;
      next.winningLine = null;
      next.nextBoard = null;
      move.winner = DRAW;
    } else {
      next.currentPlayer = otherPlayer(player);
      next.nextBoard = isBoardOpen(next, sentBoard) ? sentBoard : null;
      move.nextBoard = next.nextBoard;
      move.freeMove = next.nextBoard === null;
    }

    if (move.winner) {
      next.currentPlayer = player;
    }

    next.lastMove = move;
    next.log = next.log.concat([formatMove(move)]);

    return { ok: true, state: next };
  }

  function undoMove(state) {
    var previous;
    var restored;

    if (!state.history.length) {
      restored = cloneState(state);
      restored.lastError = "No move to undo.";
      return restored;
    }

    previous = state.history[state.history.length - 1];
    restored = Object.assign({}, previous, {
      boards: cloneBoards(previous.boards),
      boardStatus: previous.boardStatus.slice(),
      winningLine: previous.winningLine ? previous.winningLine.slice() : null,
      lastMove: previous.lastMove ? Object.assign({}, previous.lastMove) : null,
      log: previous.log.slice(),
      lastError: null,
      history: state.history.slice(0, -1)
    });

    return restored;
  }

  var api = {
    PLAYERS: PLAYERS,
    DRAW: DRAW,
    BOARD_LABELS: BOARD_LABELS,
    CELL_LABELS: CELL_LABELS,
    WIN_LINES: WIN_LINES,
    createInitialState: createInitialState,
    applyMove: applyMove,
    undoMove: undoMove,
    getLegalBoards: getLegalBoards,
    validateMove: validateMove,
    isFreeMove: isFreeMove,
    findWinningLine: findWinningLine
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.UltimateGame = api;
})(typeof window !== "undefined" ? window : globalThis);
