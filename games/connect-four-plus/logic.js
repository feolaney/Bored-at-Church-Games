(function attachConnectFourPlus(global) {
  "use strict";

  var DEFAULT_ROWS = 6;
  var DEFAULT_COLS = 7;
  var PLAYERS = ["R", "Y"];
  var PLAYER_LABELS = {
    R: "Red",
    Y: "Yellow"
  };
  var LOCKED_FOR_BOTH = "BOTH";
  var MAX_HAND_SIZE = 3;
  var DRAW_EVERY_PERSONAL_TURNS = 4;
  var TWO_X_LOCK_TURN_SPAN = 4;
  var POWER_DECK = [
    "Pop",
    "Pop",
    "Pop",
    "Lock",
    "Lock",
    "Lock",
    "Swap Top",
    "Swap Top",
    "Swap Top",
    "Shield",
    "Shield",
    "Shield",
    "Double Drop",
    "Double Drop",
    "Double Drop",
    "Bomb Piece",
    "Bomb Piece",
    "2x Lock",
    "2x Lock"
  ];
  var FOG_POWER_DECK = [
    "Scan Column",
    "Scan Radius",
    "Decoy",
    "Signal Jam"
  ];
  var MODES = [
    {
      id: "power-duel",
      title: "Power Duel",
      bestFor: "Default casual mode",
      summary: "Normal Connect Four plus hidden powerups earned every fourth personal turn.",
      rows: 6,
      cols: 7,
      connect: 4,
      powerups: true,
      randomPowerups: true,
      startHands: "random",
      rules: [
        "Use a standard 7-column by 6-row board.",
        "Each player starts with one powerup and may hold up to three.",
        "Use at most one powerup before dropping.",
        "Bomb Piece powerups drop a bomb that clears unshielded pieces in a 3x3 blast area.",
        "2x Lock powerups lock one column for both players across two full rounds.",
        "Bomb Piece and 2x Lock appear slightly less often than standard powers.",
        "After every fourth personal turn, draw one powerup unless your hand is full."
      ]
    },
    {
      id: "draft-duel",
      title: "Draft Duel",
      bestFor: "Competitive mode",
      summary: "Each player starts with a drafted three-power kit and uses each power once.",
      rows: 6,
      cols: 7,
      connect: 4,
      powerups: true,
      draft: true,
      startHands: {
        R: ["Bomb Piece", "Swap Top", "Pop"],
        Y: ["Bomb Piece", "Shield", "Lock"]
      },
      rules: [
        "Each player starts with three one-use drafted powers.",
        "Use at most one drafted power before placing a piece.",
        "Bomb Piece drops a bomb that clears unshielded pieces in a 3x3 blast area.",
        "No 2x Lock powers are included in the fixed draft kits.",
        "Used powers are logged publicly.",
        "No random powerups are drawn during this mode."
      ]
    },
    {
      id: "gravity-connect",
      title: "Gravity Connect",
      bestFor: "Visual arcade mode",
      summary: "A public-information game where gravity rotates on a predictable schedule.",
      rows: 7,
      cols: 7,
      connect: 4,
      gravity: true,
      rules: [
        "Use a 7-column by 7-row board.",
        "After every sixth total turn, gravity rotates clockwise.",
        "Check for wins before gravity rotates.",
        "When gravity shifts, all pieces slide in the new direction.",
        "New pieces enter from the opposite edge of the current gravity direction."
      ]
    },
    {
      id: "bomb-pieces",
      title: "Bomb Pieces",
      bestFor: "Tactical disruption",
      summary: "Each player has two bomb pieces that clear unshielded pieces in a 3x3 blast area.",
      rows: 6,
      cols: 7,
      connect: 4,
      bombs: true,
      rules: [
        "Each player gets two bombs for the game.",
        "Instead of a normal piece, drop a bomb piece.",
        "A bomb destroys every unshielded occupied square in its 3x3 blast area, including the bomb square.",
        "Pieces fall before win checks resolve."
      ]
    },
    {
      id: "wild-pieces",
      title: "Wild Pieces",
      bestFor: "Fork creation",
      summary: "Each player gets one neutral wild piece that counts for either player.",
      rows: 6,
      cols: 7,
      connect: 4,
      wilds: true,
      rules: [
        "Each player has one neutral wild piece.",
        "A wild counts as either color when checking lines.",
        "If both players have a connect line after a move resolves, the game is a draw.",
        "Wild pieces cannot be removed by Pop."
      ]
    },
    {
      id: "column-locks",
      title: "Column Locks",
      bestFor: "Clean control mode",
      summary: "Public column locks create short-term tactical denial.",
      rows: 6,
      cols: 7,
      connect: 4,
      locks: true,
      rules: [
        "Each player has two locks.",
        "Before placing, lock a non-full column for the opponent's next turn.",
        "The locking player may still place in that column on the same turn.",
        "You cannot lock the only playable column or the same column twice in a row."
      ]
    },
    {
      id: "shrinking-board",
      title: "Shrinking Board",
      bestFor: "Predictable pressure",
      summary: "A 9-column board loses edge columns on a public schedule.",
      rows: 6,
      cols: 9,
      connect: 4,
      shrinking: true,
      rules: [
        "Start with a 9-column board.",
        "After turn 10, remove the leftmost active column.",
        "After turn 18, remove the rightmost active column.",
        "Wins are checked before columns disappear."
      ]
    },
    {
      id: "connect-five",
      title: "Connect 5 Mode",
      bestFor: "Longer strategy",
      summary: "A wider 9x7 board where the first connect five wins.",
      rows: 7,
      cols: 9,
      connect: 5,
      lateDoubleDrop: true,
      rules: [
        "Use a 9-column by 7-row board.",
        "First to connect five wins.",
        "Each player receives one Double Drop powerup after turn 8.",
        "The wider board reduces early traps."
      ]
    },
    {
      id: "token-hunt",
      title: "Token Hunt",
      bestFor: "Board-control mode",
      summary: "Players hunt mostly invisible board tokens that grant powerups.",
      rows: 6,
      cols: 7,
      connect: 4,
      powerups: true,
      tokens: true,
      rules: [
        "Fifteen tokens are randomly placed on the board with no more than three per row.",
        "Only one token starts visible, and it appears at least three rows above the bottom.",
        "Hidden tokens are invisible until a piece lands on them.",
        "Landing on any token grants one powerup, including a chance at Bomb Piece or 2x Lock."
      ]
    },
    {
      id: "hidden-objectives",
      title: "Hidden Objectives",
      bestFor: "Replayability",
      summary: "Completing a side objective grants a powerup without replacing connect-four wins.",
      rows: 6,
      cols: 7,
      connect: 4,
      powerups: true,
      objectives: true,
      rules: [
        "Each player receives one objective.",
        "Completing the objective grants a powerup, including a small chance at Bomb Piece or 2x Lock.",
        "The main connect-four win condition remains active.",
        "Objectives reward alternate strategic routes."
      ]
    },
    {
      id: "simultaneous-planning",
      title: "Simultaneous Planning",
      bestFor: "Prediction game",
      summary: "Players choose columns for the round, then both moves resolve together.",
      rows: 6,
      cols: 7,
      connect: 4,
      simultaneous: true,
      rules: [
        "Red chooses a column for the round.",
        "Yellow chooses a column for the round.",
        "Both moves resolve together.",
        "If both choose the same column, a Column Battle coin flip decides who drops first."
      ]
    }
  ];

  function getMode(modeId) {
    return MODES.find(function (mode) {
      return mode.id === modeId;
    }) || MODES[0];
  }

  function createEmptyBoard(rows, cols) {
    return Array.from({ length: rows }, function () {
      return Array(cols).fill(null);
    });
  }

  function drawPowerup(rng, deck) {
    var random = typeof rng === "function" ? rng : Math.random;
    var powers = deck || POWER_DECK;
    return powers[Math.floor(random() * powers.length)];
  }

  function getStartingHand(mode, player, rng) {
    if (mode.startHands === "random") {
      return [drawPowerup(rng)];
    }

    if (mode.startHands === "fog-random") {
      return [drawPowerup(rng, ["Scan Column", "Lock", "Shield", "Swap Top"])];
    }

    if (mode.startHands && mode.startHands[player]) {
      return mode.startHands[player].slice();
    }

    return [];
  }

  function createInitialState(options) {
    var rng = options && options.rng;
    var mode = getMode(options && options.modeId);
    var rows = mode.rows || DEFAULT_ROWS;
    var cols = mode.cols || DEFAULT_COLS;
    var state = {
      modeId: mode.id,
      rows: rows,
      cols: cols,
      connectLength: mode.connect || 4,
      board: createEmptyBoard(rows, cols),
      currentPlayer: "R",
      pendingHandoff: Boolean(mode.fog),
      turnOpen: !mode.fog,
      winner: null,
      draw: false,
      winningLine: null,
      nextPieceId: 1,
      turnCount: 0,
      dropCount: 0,
      lastError: null,
      lastMove: null,
      gravityShift: null,
      pendingPower: null,
      pendingDropKind: "normal",
      powerUsedThisTurn: false,
      dropPlan: {
        remaining: 1,
        firstColumn: null
      },
      lockedColumn: null,
      lockedFor: null,
      lockedTurnsRemaining: 0,
      lastLockedColumn: null,
      removedColumns: [],
      gravityDirection: "down",
      tokenRespawn: 0,
      tokens: mode.tokens ? createStartingTokens(rows, cols, rng) : [],
      revealedColumns: {
        R: [],
        Y: []
      },
      simultaneous: {
        plans: {},
        priority: "R"
      },
      publicLog: [mode.title + " mode selected."],
      players: {
        R: createPlayerState(mode, "R", rng),
        Y: createPlayerState(mode, "Y", rng)
      }
    };

    if (mode.puzzle) {
      seedPuzzle(state);
    }

    return state;
  }

  function createPlayerState(mode, player, rng) {
    return {
      personalTurns: 0,
      hand: getStartingHand(mode, player, rng),
      bombs: mode.bombs ? 2 : 0,
      wilds: mode.wilds ? 1 : 0,
      locks: mode.locks ? 2 : 0,
      objective: mode.objectives ? (player === "R" ? "Center Builder" : "Edge Pressure") : null,
      objectiveComplete: false,
      centerDrops: 0,
      edgeDrops: 0
    };
  }

  function getRandomIndex(random, length) {
    return Math.floor(random() * length);
  }

  function shuffleCells(cells, random) {
    var shuffled = cells.slice();
    var index;
    var swapIndex;
    var temp;

    for (index = shuffled.length - 1; index > 0; index -= 1) {
      swapIndex = getRandomIndex(random, index + 1);
      temp = shuffled[index];
      shuffled[index] = shuffled[swapIndex];
      shuffled[swapIndex] = temp;
    }

    return shuffled;
  }

  function createStartingTokens(rows, cols, rng) {
    var random = typeof rng === "function" ? rng : Math.random;
    var tokenTarget = Math.min(15, rows * Math.min(cols, 3));
    var visibleMaxRow = Math.max(0, rows - 4);
    var visibleRow = getRandomIndex(random, visibleMaxRow + 1);
    var visibleCol = getRandomIndex(random, cols);
    var rowCounts = Array(rows).fill(0);
    var cells = [];
    var tokens = [{
      row: visibleRow,
      col: visibleCol,
      visible: true
    }];
    var row;
    var col;

    rowCounts[visibleRow] = 1;

    for (row = 0; row < rows; row += 1) {
      for (col = 0; col < cols; col += 1) {
        if (row !== visibleRow || col !== visibleCol) {
          cells.push({ row: row, col: col });
        }
      }
    }

    shuffleCells(cells, random).some(function (cell) {
      if (tokens.length >= tokenTarget) {
        return true;
      }

      if (rowCounts[cell.row] >= 3) {
        return false;
      }

      rowCounts[cell.row] += 1;
      tokens.push({
        row: cell.row,
        col: cell.col,
        visible: false
      });
      return false;
    });

    return tokens;
  }

  function seedPuzzle(state) {
    var bottom = state.rows - 1;
    state.board[bottom][0] = { player: "R", shielded: false, wild: false };
    state.board[bottom][1] = { player: "R", shielded: false, wild: false };
    state.board[bottom][2] = { player: "R", shielded: false, wild: false };
    state.board[bottom - 1][0] = { player: "Y", shielded: false, wild: false };
    state.board[bottom - 1][1] = { player: "Y", shielded: false, wild: false };
    state.publicLog = state.publicLog.concat(["Puzzle goal: Red can win in one move."]);
  }

  function cloneCell(cell) {
    return cell ? Object.assign({}, cell) : null;
  }

  function cloneBoard(board) {
    return board.map(function (row) {
      return row.map(cloneCell);
    });
  }

  function clonePlayer(player) {
    return {
      personalTurns: player.personalTurns,
      hand: player.hand.slice(),
      bombs: player.bombs,
      wilds: player.wilds,
      locks: player.locks,
      objective: player.objective,
      objectiveComplete: player.objectiveComplete,
      centerDrops: player.centerDrops,
      edgeDrops: player.edgeDrops
    };
  }

  function cloneGravityShift(shift) {
    if (!shift) {
      return null;
    }

    return {
      id: shift.id,
      direction: shift.direction,
      moves: shift.moves.map(function (move) {
        return Object.assign({}, move);
      })
    };
  }

  function cloneLastMove(move) {
    var clone;

    if (!move) {
      return null;
    }

    clone = Object.assign({}, move);
    if (Array.isArray(move.bombCleared)) {
      clone.bombCleared = move.bombCleared.map(function (cleared) {
        return Object.assign({}, cleared);
      });
    }
    if (Array.isArray(move.bombSettledMoves)) {
      clone.bombSettledMoves = move.bombSettledMoves.map(function (settledMove) {
        return Object.assign({}, settledMove);
      });
    }
    if (move.popRemoved) {
      clone.popRemoved = Object.assign({}, move.popRemoved);
    }
    if (Array.isArray(move.popSettledMoves)) {
      clone.popSettledMoves = move.popSettledMoves.map(function (settledMove) {
        return Object.assign({}, settledMove);
      });
    }
    if (Array.isArray(move.swapMoves)) {
      clone.swapMoves = move.swapMoves.map(function (swapMove) {
        return Object.assign({}, swapMove);
      });
    }
    if (move.tokenFound) {
      clone.tokenFound = Object.assign({}, move.tokenFound);
    }
    if (move.columnBattle) {
      clone.columnBattle = Object.assign({}, move.columnBattle);
    }
    if (Array.isArray(move.simultaneousDrops)) {
      clone.simultaneousDrops = move.simultaneousDrops.map(cloneLastMove);
    }

    return clone;
  }

  function cloneState(state) {
    return {
      modeId: state.modeId,
      rows: state.rows,
      cols: state.cols,
      connectLength: state.connectLength,
      board: cloneBoard(state.board),
      currentPlayer: state.currentPlayer,
      pendingHandoff: state.pendingHandoff,
      turnOpen: state.turnOpen,
      winner: state.winner,
      draw: state.draw,
      winningLine: state.winningLine ? state.winningLine.map(function (cell) { return cell.slice(); }) : null,
      nextPieceId: state.nextPieceId,
      turnCount: state.turnCount,
      dropCount: state.dropCount,
      lastError: state.lastError,
      lastMove: cloneLastMove(state.lastMove),
      gravityShift: cloneGravityShift(state.gravityShift),
      pendingPower: state.pendingPower ? Object.assign({}, state.pendingPower) : null,
      pendingDropKind: state.pendingDropKind,
      powerUsedThisTurn: state.powerUsedThisTurn,
      dropPlan: Object.assign({}, state.dropPlan),
      lockedColumn: state.lockedColumn,
      lockedFor: state.lockedFor,
      lockedTurnsRemaining: state.lockedTurnsRemaining,
      lastLockedColumn: state.lastLockedColumn,
      removedColumns: state.removedColumns.slice(),
      gravityDirection: state.gravityDirection,
      tokenRespawn: state.tokenRespawn,
      tokens: state.tokens.map(function (token) { return Object.assign({}, token); }),
      revealedColumns: {
        R: state.revealedColumns.R.slice(),
        Y: state.revealedColumns.Y.slice()
      },
      simultaneous: {
        plans: Object.assign({}, state.simultaneous.plans),
        priority: state.simultaneous.priority
      },
      publicLog: state.publicLog.slice(),
      players: {
        R: clonePlayer(state.players.R),
        Y: clonePlayer(state.players.Y)
      }
    };
  }

  function otherPlayer(player) {
    return player === "R" ? "Y" : "R";
  }

  function isLockActiveForPlayer(state, player) {
    return state.lockedColumn !== null && (state.lockedFor === player || state.lockedFor === LOCKED_FOR_BOTH);
  }

  function getCurrentMode(state) {
    return getMode(state.modeId);
  }

  function modeUsesHandoff(state) {
    return Boolean(getCurrentMode(state).fog);
  }

  function inBounds(state, row, col) {
    return row >= 0 && row < state.rows && col >= 0 && col < state.cols;
  }

  function isRemovedColumn(state, col) {
    return state.removedColumns.indexOf(col) !== -1;
  }

  function isColumnFull(board, col) {
    return board[0][col] !== null;
  }

  function getDropRow(board, col) {
    var row;

    for (row = board.length - 1; row >= 0; row -= 1) {
      if (!board[row][col]) {
        return row;
      }
    }

    return null;
  }

  function getDropLaneCount(state) {
    var mode = getCurrentMode(state);

    if (mode.gravity && (state.gravityDirection === "left" || state.gravityDirection === "right")) {
      return state.rows;
    }

    return state.cols;
  }

  function getDropLaneLabel(state, lane) {
    var mode = getCurrentMode(state);

    if (mode.gravity && (state.gravityDirection === "left" || state.gravityDirection === "right")) {
      return "Row " + (lane + 1);
    }

    return "Column " + (lane + 1);
  }

  function getGravityEntrySide(direction) {
    if (direction === "up") {
      return "bottom";
    }
    if (direction === "left") {
      return "right";
    }
    if (direction === "right") {
      return "left";
    }
    return "top";
  }

  function getLandingPosition(state, lane) {
    var mode = getCurrentMode(state);
    var direction = mode.gravity ? state.gravityDirection : "down";
    var row;
    var col;

    if (direction === "left" || direction === "right") {
      if (lane < 0 || lane >= state.rows) {
        return null;
      }

      if (direction === "left") {
        for (col = 0; col < state.cols; col += 1) {
          if (!isRemovedColumn(state, col) && !state.board[lane][col]) {
            return { row: lane, col: col };
          }
        }
      } else {
        for (col = state.cols - 1; col >= 0; col -= 1) {
          if (!isRemovedColumn(state, col) && !state.board[lane][col]) {
            return { row: lane, col: col };
          }
        }
      }

      return null;
    }

    if (lane < 0 || lane >= state.cols || isRemovedColumn(state, lane)) {
      return null;
    }

    if (direction === "up") {
      for (row = 0; row < state.rows; row += 1) {
        if (!state.board[row][lane]) {
          return { row: row, col: lane };
        }
      }
      return null;
    }

    row = getDropRow(state.board, lane);
    return row === null ? null : { row: row, col: lane };
  }

  function getNonFullColumns(state) {
    var columns = [];
    var lane;
    var laneCount = getDropLaneCount(state);

    for (lane = 0; lane < laneCount; lane += 1) {
      if (getLandingPosition(state, lane)) {
        columns.push(lane);
      }
    }

    return columns;
  }

  function getOpenLaneSpaceCount(state, lane) {
    var probe = cloneState(state);
    var position;
    var count = 0;

    position = getLandingPosition(probe, lane);
    while (position) {
      probe.board[position.row][position.col] = {
        player: "R",
        shielded: false,
        wild: false,
        bomb: false
      };
      count += 1;
      position = getLandingPosition(probe, lane);
    }

    return count;
  }

  function getLegalDropColumns(state) {
    var columns = getNonFullColumns(state);

    if (isLockActiveForPlayer(state, state.currentPlayer)) {
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

    for (row = board.length - 1; row >= 0; row -= 1) {
      if (board[row][col]) {
        pieces.push(board[row][col]);
      }
    }

    for (row = board.length - 1; row >= 0; row -= 1) {
      board[row][col] = pieces[board.length - 1 - row] || null;
    }
  }

  function collapseAllColumns(state) {
    var col;

    for (col = 0; col < state.cols; col += 1) {
      collapseColumn(state.board, col);
    }
  }

  function collapseGravity(state) {
    var direction = state.gravityDirection;
    var row;
    var col;
    var pieces;
    var index;

    if (direction === "down") {
      collapseAllColumns(state);
      return;
    }

    if (direction === "up") {
      for (col = 0; col < state.cols; col += 1) {
        pieces = [];
        for (row = 0; row < state.rows; row += 1) {
          if (state.board[row][col]) {
            pieces.push(state.board[row][col]);
          }
        }
        for (row = 0; row < state.rows; row += 1) {
          state.board[row][col] = pieces[row] || null;
        }
      }
      return;
    }

    for (row = 0; row < state.rows; row += 1) {
      pieces = [];
      if (direction === "left") {
        for (col = 0; col < state.cols; col += 1) {
          if (state.board[row][col]) {
            pieces.push(state.board[row][col]);
          }
        }
        for (col = 0; col < state.cols; col += 1) {
          state.board[row][col] = pieces[col] || null;
        }
      } else {
        for (col = state.cols - 1; col >= 0; col -= 1) {
          if (state.board[row][col]) {
            pieces.push(state.board[row][col]);
          }
        }
        for (col = state.cols - 1, index = 0; col >= 0; col -= 1, index += 1) {
          state.board[row][col] = pieces[index] || null;
        }
      }
    }
  }

  function capturePiecePositions(state) {
    var positions = {};
    var row;
    var col;
    var cell;

    for (row = 0; row < state.rows; row += 1) {
      for (col = 0; col < state.cols; col += 1) {
        cell = state.board[row][col];
        if (cell && cell.id !== undefined && cell.id !== null) {
          positions[cell.id] = {
            row: row,
            col: col
          };
        }
      }
    }

    return positions;
  }

  function findPiecePositionById(state, pieceId) {
    var row;
    var col;

    for (row = 0; row < state.rows; row += 1) {
      for (col = 0; col < state.cols; col += 1) {
        if (state.board[row][col] && state.board[row][col].id === pieceId) {
          return {
            row: row,
            col: col
          };
        }
      }
    }

    return null;
  }

  function createGravityShift(beforePositions, state) {
    var moves = [];
    var row;
    var col;
    var cell;
    var before;

    for (row = 0; row < state.rows; row += 1) {
      for (col = 0; col < state.cols; col += 1) {
        cell = state.board[row][col];
        if (!cell || cell.id === undefined || cell.id === null) {
          continue;
        }

        before = beforePositions[cell.id];
        if (before && (before.row !== row || before.col !== col)) {
          moves.push({
            pieceId: cell.id,
            fromRow: before.row,
            fromCol: before.col,
            toRow: row,
            toCol: col
          });
        }
      }
    }

    if (!moves.length) {
      return null;
    }

    return {
      id: state.turnCount + ":" + state.gravityDirection,
      direction: state.gravityDirection,
      moves: moves
    };
  }

  function rotateGravity(direction) {
    if (direction === "down") {
      return "left";
    }
    if (direction === "left") {
      return "up";
    }
    if (direction === "up") {
      return "right";
    }
    return "down";
  }

  function getTopOccupiedRows(board, col) {
    var rows = [];
    var row;

    for (row = 0; row < board.length; row += 1) {
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

    if (state.pendingDropKind !== "normal") {
      return { ok: false, reason: "Use or cancel the selected tool before choosing another." };
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
    next.pendingDropKind = "normal";
    next.powerUsedThisTurn = false;
    next.revealedColumns[next.currentPlayer] = [];
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

    if (power === "Bomb Piece") {
      next.pendingPower = {
        name: power,
        handIndex: handIndex
      };
      next.pendingDropKind = "bomb";
      return next;
    }

    next.pendingPower = {
      name: power,
      handIndex: handIndex
    };
    return next;
  }

  function selectSpecial(state, special) {
    var next = cloneState(state);
    var player = next.players[next.currentPlayer];

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    if (!next.turnOpen || next.pendingHandoff) {
      next.lastError = "Reveal the active player's turn first.";
      return next;
    }

    if (next.pendingPower || next.pendingDropKind !== "normal") {
      next.lastError = "Use or cancel the selected tool before choosing another.";
      return next;
    }

    if (special === "bomb") {
      if (!player.bombs) {
        next.lastError = "No bombs remaining.";
        return next;
      }
      next.pendingDropKind = "bomb";
      next.pendingPower = null;
      next.lastError = null;
      return next;
    }

    if (special === "wild") {
      if (!player.wilds) {
        next.lastError = "No wild pieces remaining.";
        return next;
      }
      next.pendingDropKind = "wild";
      next.pendingPower = null;
      next.lastError = null;
      return next;
    }

    if (special === "lock") {
      if (next.powerUsedThisTurn) {
        next.lastError = "Only one tool may be used each turn.";
        return next;
      }

      if (!player.locks) {
        next.lastError = "No locks remaining.";
        return next;
      }
      next.pendingDropKind = "normal";
      next.pendingPower = {
        name: "Column Lock",
        handIndex: null,
        special: true
      };
      next.lastError = null;
      return next;
    }

    next.lastError = "Unknown tool.";
    return next;
  }

  function consumePendingPower(next, moveData) {
    if (next.pendingPower.handIndex !== null && next.pendingPower.handIndex !== undefined) {
      next.players[next.currentPlayer].hand.splice(next.pendingPower.handIndex, 1);
    }

    next.powerUsedThisTurn = true;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[next.currentPlayer] + " used " + next.pendingPower.name + "."]);
    next.lastMove = Object.assign({
      kind: "power",
      power: next.pendingPower.name
    }, moveData || {});
    next.pendingPower = null;
  }

  function consumePendingDropPower(next, activePlayer) {
    if (!next.pendingPower) {
      return;
    }

    if (next.pendingPower.handIndex !== null && next.pendingPower.handIndex !== undefined) {
      next.players[activePlayer].hand.splice(next.pendingPower.handIndex, 1);
    }

    next.powerUsedThisTurn = true;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " used " + next.pendingPower.name + "."]);
    next.pendingPower = null;
  }

  function applyPowerToColumn(state, col) {
    var next = cloneState(state);
    var power = next.pendingPower && next.pendingPower.name;
    var topRows;
    var temp;
    var nonFullColumns;
    var player;
    var popRow;
    var poppedCell;
    var beforeCollapse;
    var firstSwapRow;
    var secondSwapRow;

    if (!power) {
      next.lastError = "Select a column tool first.";
      return next;
    }

    if (col < 0 || col >= next.cols || isRemovedColumn(next, col)) {
      next.lastError = "Column is outside the playable board.";
      return next;
    }

    if (power === "Scan Column") {
      if (next.revealedColumns[next.currentPlayer].indexOf(col) === -1) {
        next.revealedColumns[next.currentPlayer].push(col);
      }
      consumePendingPower(next);
      next.lastError = null;
      return next;
    }

    if (power === "Column Lock" || power === "Lock" || power === "2x Lock") {
      nonFullColumns = getNonFullColumns(next);

      if (isColumnFull(next.board, col)) {
        next.lastError = "You cannot lock a full column.";
        return next;
      }

      if (nonFullColumns.length <= 1) {
        next.lastError = "You cannot lock the only playable column.";
        return next;
      }

      if (next.lastLockedColumn === col) {
        next.lastError = "That column was the last locked column.";
        return next;
      }

      next.lockedColumn = col;
      next.lockedFor = power === "2x Lock" ? LOCKED_FOR_BOTH : otherPlayer(next.currentPlayer);
      next.lockedTurnsRemaining = power === "2x Lock" ? TWO_X_LOCK_TURN_SPAN : 1;
      next.lastLockedColumn = col;
      if (power === "Column Lock") {
        player = next.players[next.currentPlayer];
        player.locks -= 1;
      }
      consumePendingPower(next);
      if (power === "2x Lock") {
        next.publicLog = next.publicLog.concat([getDropLaneLabel(next, col) + " locked for both players for two full rounds."]);
      }
      next.lastError = null;
      return next;
    }

    if (power === "Pop") {
      if (!next.board[next.rows - 1][col]) {
        next.lastError = "Pop needs a bottom piece in that column.";
        return next;
      }

      if (next.board[next.rows - 1][col].shielded || next.board[next.rows - 1][col].wild) {
        next.lastError = "That bottom piece is protected or wild.";
        return next;
      }

      popRow = next.rows - 1;
      poppedCell = next.board[popRow][col];
      next.board[popRow][col] = null;
      beforeCollapse = capturePiecePositions(next);
      collapseColumn(next.board, col);
      consumePendingPower(next, {
        popRemoved: {
          row: popRow,
          col: col,
          id: poppedCell.id === undefined ? null : poppedCell.id,
          player: poppedCell.player,
          wild: Boolean(poppedCell.wild),
          bomb: Boolean(poppedCell.bomb),
          shielded: Boolean(poppedCell.shielded)
        },
        popSettledMoves: createSettledMoves(beforeCollapse, next)
      });
      next.lastError = null;
      return next;
    }

    if (power === "Swap Top") {
      topRows = getTopOccupiedRows(next.board, col);

      if (topRows.length < 2) {
        next.lastError = "Swap Top needs a column with at least two pieces.";
        return next;
      }

      firstSwapRow = topRows[0];
      secondSwapRow = topRows[1];
      temp = next.board[firstSwapRow][col];
      next.board[firstSwapRow][col] = next.board[secondSwapRow][col];
      next.board[secondSwapRow][col] = temp;
      consumePendingPower(next, {
        swapMoves: [
          {
            pieceId: next.board[secondSwapRow][col].id,
            fromRow: firstSwapRow,
            fromCol: col,
            toRow: secondSwapRow,
            toCol: col
          },
          {
            pieceId: next.board[firstSwapRow][col].id,
            fromRow: secondSwapRow,
            fromCol: col,
            toRow: firstSwapRow,
            toCol: col
          }
        ]
      });
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

    if (!inBounds(next, row, col)) {
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

  function cellCountsForPlayer(cell, player) {
    return Boolean(cell && (cell.player === player || cell.wild));
  }

  function findWinningLineForPlayer(board, player, connectLength) {
    var rows = board.length;
    var cols = board[0].length;
    var target = connectLength || 4;
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

    for (row = 0; row < rows; row += 1) {
      for (col = 0; col < cols; col += 1) {
        for (dirIndex = 0; dirIndex < directions.length; dirIndex += 1) {
          cells = [];

          for (i = 0; i < target; i += 1) {
            nextRow = row + directions[dirIndex][0] * i;
            nextCol = col + directions[dirIndex][1] * i;

            if (nextRow < 0 || nextRow >= rows || nextCol < 0 || nextCol >= cols) {
              cells = null;
              break;
            }

            cells.push([nextRow, nextCol]);
          }

          if (cells && cells.every(function (position) {
            return cellCountsForPlayer(board[position[0]][position[1]], player);
          })) {
            return cells;
          }
        }
      }
    }

    return null;
  }

  function mergeWinningLines(firstLine, secondLine) {
    var seen = {};
    var merged = [];

    [firstLine, secondLine].forEach(function (line) {
      if (!line) {
        return;
      }

      line.forEach(function (position) {
        var key = position[0] + ":" + position[1];

        if (!seen[key]) {
          seen[key] = true;
          merged.push(position);
        }
      });
    });

    return merged;
  }

  function findWinner(state, activePlayer) {
    var activeLine = findWinningLineForPlayer(state.board, activePlayer, state.connectLength);
    var other = otherPlayer(activePlayer);
    var otherLine = findWinningLineForPlayer(state.board, other, state.connectLength);

    if (activeLine && otherLine) {
      return {
        winner: null,
        draw: true,
        line: mergeWinningLines(activeLine, otherLine)
      };
    }

    if (activeLine) {
      return {
        winner: activePlayer,
        draw: false,
        line: activeLine
      };
    }

    if (otherLine) {
      return {
        winner: other,
        draw: false,
        line: otherLine
      };
    }

    return {
      winner: null,
      draw: false,
      line: null
    };
  }

  function isBoardFull(state) {
    return getNonFullColumns(state).length === 0;
  }

  function updateObjective(next, activePlayer, row, col) {
    var player = next.players[activePlayer];
    var center = Math.floor(next.cols / 2);
    var power;

    if (!player.objective || player.objectiveComplete) {
      return;
    }

    if (col === center) {
      player.centerDrops += 1;
    }

    if (col === 0 || col === next.cols - 1) {
      player.edgeDrops += 1;
    }

    if ((player.objective === "Center Builder" && player.centerDrops >= 3) ||
        (player.objective === "Edge Pressure" && player.edgeDrops >= 2)) {
      player.objectiveComplete = true;
      power = drawPowerup();
      if (player.hand.length < MAX_HAND_SIZE) {
        player.hand.push(power);
      }
      next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " completed " + player.objective + " and gained " + power + "."]);
    }
  }

  function collectToken(next, activePlayer, row, col) {
    var index = next.tokens.findIndex(function (token) {
      return token.row === row && token.col === col;
    });
    var power;
    var token;

    if (index === -1) {
      return;
    }

    token = next.tokens[index];
    power = drawPowerup();
    next.tokens.splice(index, 1);
    if (next.players[activePlayer].hand.length < MAX_HAND_SIZE) {
      next.players[activePlayer].hand.push(power);
    }
    if (next.lastMove) {
      next.lastMove.tokenFound = {
        row: row,
        col: col,
        power: power,
        hidden: !token.visible,
        player: activePlayer
      };
    }
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " found a " + (token.visible ? "visible" : "hidden") + " token and drew " + power + "."]);
  }

  function respawnToken(next) {
    var row;
    var col;
    var attempts;

    if (!getCurrentMode(next).tokens || next.tokenRespawn > 0 || next.tokens.length >= 3) {
      return;
    }

    for (attempts = 0; attempts < next.cols * next.rows; attempts += 1) {
      col = (Math.floor(next.cols / 2) + attempts * 2) % next.cols;
      row = getDropRow(next.board, col);
      if (row !== null && next.tokens.every(function (token) {
        return token.row !== row || token.col !== col;
      })) {
        next.tokens.push({ row: row, col: col });
        next.publicLog = next.publicLog.concat(["A new power token appeared in column " + (col + 1) + "."]);
        return;
      }
    }
  }

  function removeScheduledColumn(next, side) {
    var col;
    var row;

    if (side === "left") {
      for (col = 0; col < next.cols; col += 1) {
        if (!isRemovedColumn(next, col)) {
          next.removedColumns.push(col);
          for (row = 0; row < next.rows; row += 1) {
            next.board[row][col] = null;
          }
          next.publicLog = next.publicLog.concat(["Column " + (col + 1) + " disappeared."]);
          return;
        }
      }
    }

    for (col = next.cols - 1; col >= 0; col -= 1) {
      if (!isRemovedColumn(next, col)) {
        next.removedColumns.push(col);
        for (row = 0; row < next.rows; row += 1) {
          next.board[row][col] = null;
        }
        next.publicLog = next.publicLog.concat(["Column " + (col + 1) + " disappeared."]);
        return;
      }
    }
  }

  function advanceLockAfterTurn(next, activePlayer) {
    if (!isLockActiveForPlayer(next, activePlayer)) {
      return;
    }

    if (next.lockedTurnsRemaining > 1) {
      next.lockedTurnsRemaining -= 1;
      return;
    }

    next.lockedFor = null;
    next.lockedColumn = null;
    next.lockedTurnsRemaining = 0;
  }

  function finishTurn(next, activePlayer) {
    var mode = getCurrentMode(next);
    var playerState = next.players[activePlayer];
    var gravityBefore;

    playerState.personalTurns += 1;
    next.turnCount += 1;
    next.gravityShift = null;

    if (mode.randomPowerups && playerState.personalTurns % DRAW_EVERY_PERSONAL_TURNS === 0 && playerState.hand.length < MAX_HAND_SIZE) {
      playerState.hand.push(drawPowerup(null, mode.fog ? ["Scan Column", "Lock", "Shield", "Swap Top"] : POWER_DECK));
      next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " drew a powerup."]);
    }

    if (mode.lateDoubleDrop && next.turnCount === 8) {
      PLAYERS.forEach(function (player) {
        if (next.players[player].hand.length < MAX_HAND_SIZE) {
          next.players[player].hand.push("Double Drop");
        }
      });
      next.publicLog = next.publicLog.concat(["Both players received a late Double Drop."]);
    }

    advanceLockAfterTurn(next, activePlayer);

    if (mode.shrinking && next.turnCount === 10) {
      removeScheduledColumn(next, "left");
    }

    if (mode.shrinking && next.turnCount === 18) {
      removeScheduledColumn(next, "right");
    }

    if (mode.gravity && next.turnCount % 6 === 0) {
      next.gravityDirection = rotateGravity(next.gravityDirection);
      gravityBefore = capturePiecePositions(next);
      collapseGravity(next);
      next.gravityShift = createGravityShift(gravityBefore, next);
      next.publicLog = next.publicLog.concat(["Gravity rotated " + next.gravityDirection + "; new pieces enter from the " + getGravityEntrySide(next.gravityDirection) + "."]);
    }

    next.currentPlayer = otherPlayer(activePlayer);
    next.pendingHandoff = Boolean(mode.fog);
    next.turnOpen = !mode.fog;
    next.pendingPower = null;
    next.pendingDropKind = "normal";
    next.powerUsedThisTurn = false;
    next.dropPlan = {
      remaining: 1,
      firstColumn: null
    };
    next.revealedColumns[activePlayer] = [];
  }

  function completeTerminalTurn(next, activePlayer) {
    next.players[activePlayer].personalTurns += 1;
    next.turnCount += 1;

    advanceLockAfterTurn(next, activePlayer);

    next.turnOpen = false;
    next.pendingHandoff = false;
    next.pendingPower = null;
    next.pendingDropKind = "normal";
    next.powerUsedThisTurn = false;
    next.dropPlan = {
      remaining: 1,
      firstColumn: null
    };
  }

  function dropPiece(state, col) {
    var next = cloneState(state);
    var mode = getCurrentMode(next);
    var legalColumns = getLegalDropColumns(next);
    var position;
    var activePlayer = next.currentPlayer;
    var result;
    var pendingDropPower = next.pendingPower && next.pendingPower.name === "Bomb Piece" && next.pendingDropKind === "bomb";

    next.gravityShift = null;

    if (mode.simultaneous) {
      return planSimultaneousDrop(next, col);
    }

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    if (!next.turnOpen || next.pendingHandoff) {
      next.lastError = "Reveal the active player's turn first.";
      return next;
    }

    if (next.pendingPower && !pendingDropPower) {
      next.lastError = "Resolve or cancel the selected tool before dropping.";
      return next;
    }

    if (legalColumns.indexOf(col) === -1) {
      next.lastError = col === next.lockedColumn ? "That column is locked this turn." : "That column is not playable.";
      return next;
    }

    position = placePiece(next, activePlayer, col, next.pendingDropKind);
    if (!position) {
      next.lastError = "That lane is not playable.";
      return next;
    }

    next.dropCount += 1;
    consumePendingDropPower(next, activePlayer);
    updateObjective(next, activePlayer, position.row, position.col);
    collectToken(next, activePlayer, position.row, position.col);
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " dropped " + getDropKindLabel(next.lastMove.dropKind) + " in " + getDropLaneLabel(next, col) + "."]);

    result = findWinner(next, activePlayer);
    if (result.draw) {
      completeTerminalTurn(next, activePlayer);
      next.draw = true;
      next.winningLine = result.line;
      next.lastError = null;
      return next;
    }

    if (result.winner) {
      completeTerminalTurn(next, activePlayer);
      next.winner = result.winner;
      next.winningLine = result.line;
      next.lastError = null;
      return next;
    }

    if (isBoardFull(next)) {
      completeTerminalTurn(next, activePlayer);
      next.draw = true;
      next.lastError = null;
      return next;
    }

    if (next.dropPlan.remaining > 1) {
      next.dropPlan.remaining -= 1;
      next.dropPlan.firstColumn = col;
      next.pendingDropKind = "normal";

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

  function placePiece(next, activePlayer, col, kind) {
    var position = getLandingPosition(next, col);
    var row = position && position.row;
    var landingCol = position && position.col;
    var dropKind = kind || "normal";
    var pieceId;
    var finalPosition;
    var beforeCollapse;

    if (!position) {
      return null;
    }

    if (dropKind === "bomb" && !(next.pendingPower && next.pendingPower.name === "Bomb Piece")) {
      next.players[activePlayer].bombs -= 1;
    } else if (dropKind === "wild") {
      next.players[activePlayer].wilds -= 1;
    }

    pieceId = next.nextPieceId;
    next.board[row][landingCol] = {
      id: pieceId,
      player: activePlayer,
      shielded: false,
      wild: dropKind === "wild",
      bomb: dropKind === "bomb"
    };
    next.nextPieceId += 1;

    next.lastMove = {
      kind: "drop",
      dropKind: dropKind,
      pieceId: pieceId,
      player: activePlayer,
      row: row,
      col: landingCol,
      lane: col,
      gravityDirection: next.gravityDirection,
      entrySide: getGravityEntrySide(next.gravityDirection)
    };

    if (dropKind === "bomb") {
      next.lastMove.bombCleared = explodeBomb(next, row, landingCol);
      beforeCollapse = capturePiecePositions(next);
      collapseAllColumns(next);
      next.lastMove.bombSettledMoves = createSettledMoves(beforeCollapse, next);
      finalPosition = findPiecePositionById(next, pieceId);
      if (finalPosition) {
        next.lastMove.row = finalPosition.row;
        next.lastMove.col = finalPosition.col;
        return finalPosition;
      }
    }

    return position;
  }

  function createSettledMoves(beforePositions, state) {
    var moves = [];
    var row;
    var col;
    var cell;
    var before;

    for (row = 0; row < state.rows; row += 1) {
      for (col = 0; col < state.cols; col += 1) {
        cell = state.board[row][col];
        if (!cell || cell.id === undefined || cell.id === null) {
          continue;
        }

        before = beforePositions[cell.id];
        if (before && (before.row !== row || before.col !== col)) {
          moves.push({
            pieceId: cell.id,
            fromRow: before.row,
            fromCol: before.col,
            toRow: row,
            toCol: col
          });
        }
      }
    }

    return moves;
  }

  function getDropKindLabel(kind) {
    if (kind === "bomb") {
      return "a bomb";
    }
    if (kind === "wild") {
      return "a wild";
    }
    return "a piece";
  }

  function explodeBomb(next, row, col) {
    var cleared = [];
    var targetRow;
    var targetCol;
    var cell;

    for (targetRow = row - 1; targetRow <= row + 1; targetRow += 1) {
      for (targetCol = col - 1; targetCol <= col + 1; targetCol += 1) {
        if (!inBounds(next, targetRow, targetCol)) {
          continue;
        }

        cell = next.board[targetRow][targetCol];
        if (cell) {
          if (cell.shielded) {
            continue;
          }

          cleared.push({
            row: targetRow,
            col: targetCol,
            id: cell.id === undefined ? null : cell.id,
            player: cell.player,
            wild: Boolean(cell.wild),
            bomb: Boolean(cell.bomb),
            shielded: Boolean(cell.shielded)
          });
          next.board[targetRow][targetCol] = null;
        }
      }
    }

    return cleared;
  }

  function planSimultaneousDrop(next, col) {
    var player = next.currentPlayer;
    var first;
    var second;
    var firstMove;
    var secondMove;
    var otherPlan;
    var columnBattle = null;
    var result;

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    if (getLegalDropColumns(next).indexOf(col) === -1) {
      next.lastError = "That column is not playable.";
      return next;
    }

    otherPlan = next.simultaneous.plans[otherPlayer(player)];
    if (otherPlan === col && getOpenLaneSpaceCount(next, col) < 2) {
      next.lastError = "That column needs two open spaces for a Column Battle.";
      return next;
    }

    next.simultaneous.plans[player] = col;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[player] + " planned a column."]);

    if (next.simultaneous.plans.R === undefined || next.simultaneous.plans.Y === undefined) {
      next.currentPlayer = otherPlayer(player);
      next.lastError = null;
      return next;
    }

    if (next.simultaneous.plans.R === next.simultaneous.plans.Y) {
      first = Math.random() < 0.5 ? "R" : "Y";
      columnBattle = {
        column: next.simultaneous.plans.R,
        firstPlayer: first,
        secondPlayer: otherPlayer(first)
      };
    } else {
      first = next.simultaneous.priority;
    }
    second = otherPlayer(first);
    placePiece(next, first, next.simultaneous.plans[first], "normal");
    next.dropCount += 1;
    firstMove = cloneLastMove(next.lastMove);
    if (firstMove) {
      firstMove.sequenceIndex = 0;
    }
    placePiece(next, second, next.simultaneous.plans[second], "normal");
    next.dropCount += 1;
    secondMove = cloneLastMove(next.lastMove);
    if (secondMove) {
      secondMove.sequenceIndex = 1;
    }
    next.lastMove = cloneLastMove(secondMove);
    next.lastMove.simultaneousDrops = [firstMove, secondMove];
    if (columnBattle) {
      next.lastMove.columnBattle = columnBattle;
      next.publicLog = next.publicLog.concat(["Column Battle in column " + (columnBattle.column + 1) + ": " + PLAYER_LABELS[first] + " won the flip and dropped first."]);
    }
    next.publicLog = next.publicLog.concat(["Both planned moves resolved."]);

    result = findWinner(next, second);
    if (result.draw) {
      next.draw = true;
      next.winningLine = result.line;
      next.turnCount += 1;
      next.players.R.personalTurns += 1;
      next.players.Y.personalTurns += 1;
      next.turnOpen = false;
      next.pendingHandoff = false;
      next.pendingPower = null;
      next.pendingDropKind = "normal";
      next.powerUsedThisTurn = false;
      next.simultaneous.plans = {};
      next.lastError = null;
      return next;
    }

    if (result.winner) {
      next.winner = result.winner;
      next.winningLine = result.line;
      next.turnCount += 1;
      next.players.R.personalTurns += 1;
      next.players.Y.personalTurns += 1;
      next.turnOpen = false;
      next.pendingHandoff = false;
      next.pendingPower = null;
      next.pendingDropKind = "normal";
      next.powerUsedThisTurn = false;
      next.simultaneous.plans = {};
      next.lastError = null;
      return next;
    }

    next.turnCount += 1;
    next.players.R.personalTurns += 1;
    next.players.Y.personalTurns += 1;
    next.simultaneous.plans = {};
    next.simultaneous.priority = otherPlayer(next.simultaneous.priority);
    next.currentPlayer = "R";
    next.lastError = null;

    if (isBoardFull(next)) {
      next.draw = true;
    }

    return next;
  }

  function cancelPendingPower(state) {
    var next = cloneState(state);
    next.pendingPower = null;
    next.pendingDropKind = "normal";
    next.lastError = null;
    return next;
  }

  function getTokenAt(state, row, col) {
    return state.tokens.find(function (token) {
      return token.row === row && token.col === col;
    }) || null;
  }

  function isAdjacentToOwnPiece(state, row, col, player) {
    var rowOffset;
    var colOffset;
    var nextRow;
    var nextCol;
    var cell;

    for (rowOffset = -1; rowOffset <= 1; rowOffset += 1) {
      for (colOffset = -1; colOffset <= 1; colOffset += 1) {
        if (rowOffset === 0 && colOffset === 0) {
          continue;
        }
        nextRow = row + rowOffset;
        nextCol = col + colOffset;
        if (!inBounds(state, nextRow, nextCol)) {
          continue;
        }
        cell = state.board[nextRow][nextCol];
        if (cell && cell.player === player) {
          return true;
        }
      }
    }

    return false;
  }

  function isTopOccupiedCell(state, row, col) {
    var topRows = getTopOccupiedRows(state.board, col);
    return topRows.length && topRows[0] === row;
  }

  function isVisibleThreatCell(state, row, col, viewer) {
    var cell = state.board[row][col];
    var opponent = otherPlayer(viewer);
    var target = state.connectLength;
    var directions = [
      [0, 1],
      [1, 0],
      [1, 1],
      [1, -1]
    ];
    var dirIndex;
    var offset;
    var startRow;
    var startCol;
    var count;
    var blanks;
    var i;
    var nextRow;
    var nextCol;
    var nextCell;

    if (!cell || cell.player !== opponent) {
      return false;
    }

    for (dirIndex = 0; dirIndex < directions.length; dirIndex += 1) {
      for (offset = 0; offset < target; offset += 1) {
        startRow = row - directions[dirIndex][0] * offset;
        startCol = col - directions[dirIndex][1] * offset;
        count = 0;
        blanks = 0;

        for (i = 0; i < target; i += 1) {
          nextRow = startRow + directions[dirIndex][0] * i;
          nextCol = startCol + directions[dirIndex][1] * i;

          if (!inBounds(state, nextRow, nextCol) || isRemovedColumn(state, nextCol)) {
            count = 0;
            blanks = 0;
            break;
          }

          nextCell = state.board[nextRow][nextCol];
          if (cellCountsForPlayer(nextCell, opponent)) {
            count += 1;
          } else if (!nextCell) {
            blanks += 1;
          }
        }

        if (count >= target - 1 && blanks > 0) {
          return true;
        }
      }
    }

    return false;
  }

  function isVisibleToPlayer(state, row, col, player) {
    var cell = state.board[row][col];

    if (!getCurrentMode(state).fog || state.winner || state.draw) {
      return true;
    }

    if (!cell) {
      return true;
    }

    if (cell.player === player || cell.wild) {
      return true;
    }

    if (state.revealedColumns[player].indexOf(col) !== -1) {
      return true;
    }

    if (isTopOccupiedCell(state, row, col)) {
      return true;
    }

    if (isAdjacentToOwnPiece(state, row, col, player)) {
      return true;
    }

    if (isVisibleThreatCell(state, row, col, player)) {
      return true;
    }

    if (state.lastMove && state.lastMove.kind === "drop" && state.lastMove.player !== player && state.lastMove.row === row && state.lastMove.col === col) {
      return true;
    }

    return false;
  }

  function getDisplayCell(state, row, col, player) {
    var cell = state.board[row][col];

    if (!cell) {
      return null;
    }

    if (isVisibleToPlayer(state, row, col, player)) {
      return cloneCell(cell);
    }

    return {
      player: null,
      mystery: true,
      shielded: false,
      wild: false
    };
  }

  var api = {
    ROWS: DEFAULT_ROWS,
    COLS: DEFAULT_COLS,
    PLAYERS: PLAYERS,
    PLAYER_LABELS: PLAYER_LABELS,
    LOCKED_FOR_BOTH: LOCKED_FOR_BOTH,
    POWER_DECK: POWER_DECK,
    FOG_POWER_DECK: FOG_POWER_DECK,
    MAX_HAND_SIZE: MAX_HAND_SIZE,
    MODES: MODES,
    getMode: getMode,
    modeUsesHandoff: modeUsesHandoff,
    createInitialState: createInitialState,
    cloneState: cloneState,
    startTurn: startTurn,
    selectPower: selectPower,
    selectSpecial: selectSpecial,
    cancelPendingPower: cancelPendingPower,
    applyPowerToColumn: applyPowerToColumn,
    applyPowerToCell: applyPowerToCell,
    dropPiece: dropPiece,
    getLegalDropColumns: getLegalDropColumns,
    getNonFullColumns: getNonFullColumns,
    getDropLaneCount: getDropLaneCount,
    getDropLaneLabel: getDropLaneLabel,
    getGravityEntrySide: getGravityEntrySide,
    getLandingPosition: getLandingPosition,
    getTokenAt: getTokenAt,
    getDisplayCell: getDisplayCell,
    isRemovedColumn: isRemovedColumn,
    findWinningLineForPlayer: findWinningLineForPlayer
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.ConnectFourPlus = api;
})(typeof window !== "undefined" ? window : globalThis);
