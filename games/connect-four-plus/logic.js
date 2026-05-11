(function attachConnectFourPlus(global) {
  "use strict";

  var DEFAULT_ROWS = 6;
  var DEFAULT_COLS = 7;
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
        R: ["Double Drop", "Swap Top", "Pop"],
        Y: ["Lock", "Shield", "Pop"]
      },
      rules: [
        "Each player starts with three one-use drafted powers.",
        "Use at most one drafted power before placing a piece.",
        "Used powers are logged publicly.",
        "No random powerups are drawn during this mode."
      ]
    },
    {
      id: "shadow-connect",
      title: "Shadow Connect",
      bestFor: "Advanced fog mode",
      summary: "Players see only their pieces, nearby threats, top pieces, and scan results.",
      rows: 6,
      cols: 7,
      connect: 4,
      fog: true,
      powerups: true,
      startHands: {
        R: ["Scan Column"],
        Y: ["Scan Column"]
      },
      rules: [
        "Fog of war hides some opponent pieces from the active player.",
        "Hidden occupied spaces show as mystery tokens, never as empty cells.",
        "Each player starts with one Scan Column power.",
        "Wins use the true board state and reveal the full board."
      ]
    },
    {
      id: "power-fog",
      title: "Powerups plus Fog",
      bestFor: "Expert mixed mode",
      summary: "Shadow Connect visibility combined with private tactical powerups.",
      rows: 6,
      cols: 7,
      connect: 4,
      fog: true,
      powerups: true,
      randomPowerups: true,
      startHands: "fog-random",
      rules: [
        "Use Shadow Connect visibility rules.",
        "Players also have tactical powerup hands.",
        "Targeting a hidden piece is blocked unless the power reveals information.",
        "Wins reveal the true board."
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
        "When gravity shifts, all pieces slide in the new direction."
      ]
    },
    {
      id: "bomb-pieces",
      title: "Bomb Pieces",
      bestFor: "Tactical disruption",
      summary: "Each player has two bomb pieces that clear orthogonally adjacent cells.",
      rows: 6,
      cols: 7,
      connect: 4,
      bombs: true,
      rules: [
        "Each player gets two bombs for the game.",
        "Instead of a normal piece, drop a bomb piece.",
        "A bomb destroys adjacent pieces above, below, left, and right.",
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
        "If a wild creates wins for both players, the active player wins.",
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
        "You must place in a different column after locking.",
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
      summary: "Players collect public board tokens that grant powerups.",
      rows: 6,
      cols: 7,
      connect: 4,
      powerups: true,
      tokens: true,
      rules: [
        "Three public tokens start on reachable cells.",
        "Landing on a token grants one powerup.",
        "A replacement token appears after a short delay.",
        "Token positions are public; drawn powers are shown in your hand."
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
        "Completing the objective grants a powerup.",
        "The main connect-four win condition remains active.",
        "Objectives reward alternate strategic routes."
      ]
    },
    {
      id: "puzzle-campaign",
      title: "Puzzle Campaign",
      bestFor: "Training mode",
      summary: "A starter puzzle asks Red to find a one-move connect-four win.",
      rows: 6,
      cols: 7,
      connect: 4,
      puzzle: true,
      rules: [
        "Solve focused board positions.",
        "The starter puzzle is a win-in-one for Red.",
        "Additional puzzles can build from this mode.",
        "The board still uses normal connect-four win checks."
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
        "If both choose the same column, round priority alternates."
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
      turnCount: 0,
      dropCount: 0,
      lastError: null,
      lastMove: null,
      pendingPower: null,
      pendingDropKind: "normal",
      powerUsedThisTurn: false,
      dropPlan: {
        remaining: 1,
        firstColumn: null
      },
      lockedColumn: null,
      lockedFor: null,
      lastLockedColumn: null,
      removedColumns: [],
      gravityDirection: "down",
      tokenRespawn: 0,
      tokens: mode.tokens ? createStartingTokens(rows, cols) : [],
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

  function createStartingTokens(rows, cols) {
    var bottom = rows - 1;
    return [
      { row: bottom, col: Math.floor(cols / 2) },
      { row: bottom - 1, col: Math.max(1, Math.floor(cols / 2) - 2) },
      { row: bottom - 1, col: Math.min(cols - 2, Math.floor(cols / 2) + 2) }
    ];
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
      turnCount: state.turnCount,
      dropCount: state.dropCount,
      lastError: state.lastError,
      lastMove: state.lastMove ? Object.assign({}, state.lastMove) : null,
      pendingPower: state.pendingPower ? Object.assign({}, state.pendingPower) : null,
      pendingDropKind: state.pendingDropKind,
      powerUsedThisTurn: state.powerUsedThisTurn,
      dropPlan: Object.assign({}, state.dropPlan),
      lockedColumn: state.lockedColumn,
      lockedFor: state.lockedFor,
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

  function getNonFullColumns(state) {
    var columns = [];
    var col;

    for (col = 0; col < state.cols; col += 1) {
      if (!isRemovedColumn(state, col) && !isColumnFull(state.board, col)) {
        columns.push(col);
      }
    }

    return columns;
  }

  function getLegalDropColumns(state) {
    var columns = getNonFullColumns(state);

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

  function consumePendingPower(next) {
    if (next.pendingPower.handIndex !== null && next.pendingPower.handIndex !== undefined) {
      next.players[next.currentPlayer].hand.splice(next.pendingPower.handIndex, 1);
    }

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
    var player;

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

    if (power === "Column Lock" || power === "Lock") {
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
      next.lockedFor = otherPlayer(next.currentPlayer);
      next.lastLockedColumn = col;
      if (power === "Column Lock") {
        player = next.players[next.currentPlayer];
        player.locks -= 1;
      }
      consumePendingPower(next);
      next.lastError = null;
      return next;
    }

    if (power === "Pop") {
      if (!next.board[next.rows - 1][col] || next.board[next.rows - 1][col].player !== next.currentPlayer) {
        next.lastError = "Pop can only remove your own bottom piece.";
        return next;
      }

      if (next.board[next.rows - 1][col].shielded || next.board[next.rows - 1][col].wild) {
        next.lastError = "That piece cannot be popped.";
        return next;
      }

      next.board[next.rows - 1][col] = null;
      collapseColumn(next.board, col);
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

  function findWinner(state, activePlayer) {
    var activeLine = findWinningLineForPlayer(state.board, activePlayer, state.connectLength);
    var other = otherPlayer(activePlayer);
    var otherLine = findWinningLineForPlayer(state.board, other, state.connectLength);

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

    if (index === -1) {
      return;
    }

    power = drawPowerup();
    next.tokens.splice(index, 1);
    if (next.players[activePlayer].hand.length < MAX_HAND_SIZE) {
      next.players[activePlayer].hand.push(power);
    }
    next.tokenRespawn = 2;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " collected a token and drew " + power + "."]);
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

  function finishTurn(next, activePlayer) {
    var mode = getCurrentMode(next);
    var playerState = next.players[activePlayer];

    playerState.personalTurns += 1;
    next.turnCount += 1;

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

    if (next.tokenRespawn > 0) {
      next.tokenRespawn -= 1;
    }
    respawnToken(next);

    if (next.lockedFor === activePlayer) {
      next.lockedFor = null;
      next.lockedColumn = null;
    }

    if (mode.shrinking && next.turnCount === 10) {
      removeScheduledColumn(next, "left");
    }

    if (mode.shrinking && next.turnCount === 18) {
      removeScheduledColumn(next, "right");
    }

    if (mode.gravity && next.turnCount % 6 === 0) {
      next.gravityDirection = rotateGravity(next.gravityDirection);
      collapseGravity(next);
      next.publicLog = next.publicLog.concat(["Gravity rotated " + next.gravityDirection + "."]);
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

    if (next.lockedFor === activePlayer) {
      next.lockedFor = null;
      next.lockedColumn = null;
    }

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
    var row;
    var activePlayer = next.currentPlayer;
    var result;

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

    if (next.pendingPower) {
      next.lastError = "Resolve or cancel the selected tool before dropping.";
      return next;
    }

    if (legalColumns.indexOf(col) === -1) {
      next.lastError = col === next.lockedColumn ? "That column is locked this turn." : "That column is not playable.";
      return next;
    }

    row = placePiece(next, activePlayer, col, next.pendingDropKind);
    if (row === null) {
      next.lastError = "That column is not playable.";
      return next;
    }

    next.dropCount += 1;
    updateObjective(next, activePlayer, row, col);
    collectToken(next, activePlayer, row, col);
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[activePlayer] + " dropped " + getDropKindLabel(next.lastMove.dropKind) + " in column " + (col + 1) + "."]);

    result = findWinner(next, activePlayer);
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
    var row = getDropRow(next.board, col);
    var dropKind = kind || "normal";

    if (row === null || isRemovedColumn(next, col)) {
      return null;
    }

    if (dropKind === "bomb") {
      next.players[activePlayer].bombs -= 1;
    } else if (dropKind === "wild") {
      next.players[activePlayer].wilds -= 1;
    }

    next.board[row][col] = {
      player: activePlayer,
      shielded: false,
      wild: dropKind === "wild",
      bomb: dropKind === "bomb"
    };

    next.lastMove = {
      kind: "drop",
      dropKind: dropKind,
      player: activePlayer,
      row: row,
      col: col
    };

    if (dropKind === "bomb") {
      explodeBomb(next, row, col);
      collapseAllColumns(next);
    }

    return row;
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
    [
      [row - 1, col],
      [row + 1, col],
      [row, col - 1],
      [row, col + 1]
    ].forEach(function (position) {
      var targetRow = position[0];
      var targetCol = position[1];
      var cell;

      if (!inBounds(next, targetRow, targetCol)) {
        return;
      }

      cell = next.board[targetRow][targetCol];
      if (cell && !cell.shielded) {
        next.board[targetRow][targetCol] = null;
      }
    });
  }

  function planSimultaneousDrop(next, col) {
    var player = next.currentPlayer;
    var first;
    var second;
    var result;

    if (next.winner || next.draw) {
      next.lastError = "The game is already complete.";
      return next;
    }

    if (getLegalDropColumns(next).indexOf(col) === -1) {
      next.lastError = "That column is not playable.";
      return next;
    }

    next.simultaneous.plans[player] = col;
    next.publicLog = next.publicLog.concat([PLAYER_LABELS[player] + " planned a column."]);

    if (next.simultaneous.plans.R === undefined || next.simultaneous.plans.Y === undefined) {
      next.currentPlayer = otherPlayer(player);
      next.lastError = null;
      return next;
    }

    first = next.simultaneous.priority;
    second = otherPlayer(first);
    placePiece(next, first, next.simultaneous.plans[first], "normal");
    next.dropCount += 1;
    placePiece(next, second, next.simultaneous.plans[second], "normal");
    next.dropCount += 1;
    next.publicLog = next.publicLog.concat(["Both planned moves resolved."]);

    result = findWinner(next, second);
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
