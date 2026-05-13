(function attachDotsAndBoxes(global) {
  "use strict";

  var PLAYER_ONE = "P1";
  var PLAYER_TWO = "P2";
  var AUTO = "AUTO";
  var DRAW = "DRAW";
  var DEFAULT_WIDTH = 4;
  var DEFAULT_HEIGHT = 4;
  var MIN_SIZE = 1;
  var MAX_SIZE = 20;
  var PLAYERS = [PLAYER_ONE, PLAYER_TWO];
  var DIRECTIONS = [
    { name: "top", dr: -1, dc: 0 },
    { name: "right", dr: 0, dc: 1 },
    { name: "bottom", dr: 1, dc: 0 },
    { name: "left", dr: 0, dc: -1 }
  ];

  function clampDimension(value, fallback) {
    var number = Math.floor(Number(value));

    if (!Number.isFinite(number)) {
      return fallback;
    }

    return Math.max(MIN_SIZE, Math.min(MAX_SIZE, number));
  }

  function createRectangleShape(width, height) {
    var cols = clampDimension(width, DEFAULT_WIDTH);
    var rows = clampDimension(height, DEFAULT_HEIGHT);

    return Array.from({ length: rows }, function () {
      return Array(cols).fill(true);
    });
  }

  function cloneShape(shape) {
    return shape.map(function (row) {
      return row.map(Boolean);
    });
  }

  function normalizeShape(shape, width, height) {
    var rows;
    var cols;

    if (!Array.isArray(shape) || !shape.length || !Array.isArray(shape[0]) || !shape[0].length) {
      return createRectangleShape(width, height);
    }

    rows = clampDimension(shape.length, DEFAULT_HEIGHT);
    cols = clampDimension(shape.reduce(function (max, row) {
      return Math.max(max, Array.isArray(row) ? row.length : 0);
    }, 0), DEFAULT_WIDTH);

    return Array.from({ length: rows }, function (_, rowIndex) {
      return Array.from({ length: cols }, function (_, colIndex) {
        return Boolean(shape[rowIndex] && shape[rowIndex][colIndex]);
      });
    });
  }

  function countShapeBoxes(shape) {
    return shape.reduce(function (sum, row) {
      return sum + row.filter(Boolean).length;
    }, 0);
  }

  function edgeId(orientation, row, col) {
    return orientation + ":" + row + ":" + col;
  }

  function boxId(row, col) {
    return "b:" + row + ":" + col;
  }

  function parseEdgeId(id) {
    var parts = String(id || "").split(":");

    if (parts.length !== 3) {
      return null;
    }

    return {
      orientation: parts[0],
      row: Number(parts[1]),
      col: Number(parts[2])
    };
  }

  function createEdge(orientation, row, col) {
    return {
      id: edgeId(orientation, row, col),
      orientation: orientation,
      row: row,
      col: col,
      drawn: false,
      drawnBy: null,
      adjacentBoxIds: []
    };
  }

  function ensureEdge(edges, orientation, row, col, adjacentBoxId) {
    var id = edgeId(orientation, row, col);

    if (!edges[id]) {
      edges[id] = createEdge(orientation, row, col);
    }

    if (edges[id].adjacentBoxIds.indexOf(adjacentBoxId) === -1) {
      edges[id].adjacentBoxIds.push(adjacentBoxId);
    }

    return id;
  }

  function createBox(row, col, edgeIds) {
    return {
      id: boxId(row, col),
      row: row,
      col: col,
      exists: true,
      owner: null,
      topEdge: edgeIds.top,
      rightEdge: edgeIds.right,
      bottomEdge: edgeIds.bottom,
      leftEdge: edgeIds.left
    };
  }

  function compareEdges(a, b) {
    if (a.orientation !== b.orientation) {
      return a.orientation === "h" ? -1 : 1;
    }

    if (a.row !== b.row) {
      return a.row - b.row;
    }

    return a.col - b.col;
  }

  function generateGraph(shape) {
    var boxes = {};
    var edges = {};
    var boxOrder = [];

    shape.forEach(function (row, rowIndex) {
      row.forEach(function (exists, colIndex) {
        var id;
        var edgeIds;

        if (!exists) {
          return;
        }

        id = boxId(rowIndex, colIndex);
        edgeIds = {
          top: ensureEdge(edges, "h", rowIndex, colIndex, id),
          right: ensureEdge(edges, "v", rowIndex, colIndex + 1, id),
          bottom: ensureEdge(edges, "h", rowIndex + 1, colIndex, id),
          left: ensureEdge(edges, "v", rowIndex, colIndex, id)
        };

        boxes[id] = createBox(rowIndex, colIndex, edgeIds);
        boxOrder.push(id);
      });
    });

    return {
      boxes: boxes,
      edges: edges,
      boxOrder: boxOrder,
      edgeOrder: Object.keys(edges).sort(function (left, right) {
        return compareEdges(edges[left], edges[right]);
      })
    };
  }

  function createInitialState(options) {
    var opts = options || {};
    var shape = normalizeShape(opts.shape, opts.width || opts.cols, opts.height || opts.rows);
    var graph;

    if (!countShapeBoxes(shape)) {
      shape = createRectangleShape(DEFAULT_WIDTH, DEFAULT_HEIGHT);
    }

    graph = generateGraph(shape);

    return {
      status: "playing",
      shape: shape,
      boxRows: shape.length,
      boxCols: shape[0].length,
      boxes: graph.boxes,
      edges: graph.edges,
      boxOrder: graph.boxOrder,
      edgeOrder: graph.edgeOrder,
      totalBoxes: graph.boxOrder.length,
      totalEdges: graph.edgeOrder.length,
      drawnEdgeCount: 0,
      completedBoxCount: 0,
      currentPlayer: PLAYER_ONE,
      scores: {
        P1: 0,
        P2: 0
      },
      moveHistory: [],
      lastMove: null,
      lastError: null,
      lastCapturedBoxIds: [],
      autoLineSeed: null,
      result: null,
      history: []
    };
  }

  function cloneBox(box) {
    return Object.assign({}, box);
  }

  function cloneBoxes(boxes) {
    var cloned = {};

    Object.keys(boxes).forEach(function (id) {
      cloned[id] = cloneBox(boxes[id]);
    });

    return cloned;
  }

  function cloneEdge(edge) {
    return {
      id: edge.id,
      orientation: edge.orientation,
      row: edge.row,
      col: edge.col,
      drawn: edge.drawn,
      drawnBy: edge.drawnBy,
      adjacentBoxIds: edge.adjacentBoxIds.slice()
    };
  }

  function cloneEdges(edges) {
    var cloned = {};

    Object.keys(edges).forEach(function (id) {
      cloned[id] = cloneEdge(edges[id]);
    });

    return cloned;
  }

  function cloneMove(move) {
    if (!move) {
      return null;
    }

    return Object.assign({}, move, {
      completedBoxIds: move.completedBoxIds ? move.completedBoxIds.slice() : []
    });
  }

  function cloneScores(scores) {
    return {
      P1: Number(scores.P1) || 0,
      P2: Number(scores.P2) || 0
    };
  }

  function cloneResult(result) {
    return result ? Object.assign({}, result) : null;
  }

  function cloneAutoLineSeed(seed) {
    return seed ? Object.assign({}, seed) : null;
  }

  function snapshotState(state) {
    return {
      status: state.status,
      shape: cloneShape(state.shape),
      boxRows: state.boxRows,
      boxCols: state.boxCols,
      boxes: cloneBoxes(state.boxes),
      edges: cloneEdges(state.edges),
      boxOrder: state.boxOrder.slice(),
      edgeOrder: state.edgeOrder.slice(),
      totalBoxes: state.totalBoxes,
      totalEdges: state.totalEdges,
      drawnEdgeCount: state.drawnEdgeCount,
      completedBoxCount: state.completedBoxCount,
      currentPlayer: state.currentPlayer,
      scores: cloneScores(state.scores),
      moveHistory: state.moveHistory.map(cloneMove),
      lastMove: cloneMove(state.lastMove),
      lastError: state.lastError,
      lastCapturedBoxIds: state.lastCapturedBoxIds.slice(),
      autoLineSeed: cloneAutoLineSeed(state.autoLineSeed),
      result: cloneResult(state.result)
    };
  }

  function cloneState(state) {
    var cloned = snapshotState(state);

    cloned.history = state.history.slice();
    return cloned;
  }

  function otherPlayer(player) {
    return player === PLAYER_ONE ? PLAYER_TWO : PLAYER_ONE;
  }

  function playerLabel(player) {
    if (player === PLAYER_ONE) {
      return "Player 1";
    }

    if (player === PLAYER_TWO) {
      return "Player 2";
    }

    if (player === AUTO) {
      return "Auto line";
    }

    return "Draw";
  }

  function playerShortLabel(player) {
    return player === PLAYER_ONE ? "P1" : player === PLAYER_TWO ? "P2" : player === AUTO ? "A" : "D";
  }

  function edgeLabel(edge) {
    var axis = edge && edge.orientation === "h" ? "H" : "V";

    return axis + String((edge && edge.row || 0) + 1) + "-" + String((edge && edge.col || 0) + 1);
  }

  function boxLabel(box) {
    return "R" + String(box.row + 1) + " C" + String(box.col + 1);
  }

  function isBoxComplete(box, edges) {
    return Boolean(
      edges[box.topEdge] && edges[box.topEdge].drawn &&
      edges[box.rightEdge] && edges[box.rightEdge].drawn &&
      edges[box.bottomEdge] && edges[box.bottomEdge].drawn &&
      edges[box.leftEdge] && edges[box.leftEdge].drawn
    );
  }

  function countDrawnBoxEdges(box, edges) {
    return [
      box.topEdge,
      box.rightEdge,
      box.bottomEdge,
      box.leftEdge
    ].reduce(function (count, id) {
      return count + (edges[id] && edges[id].drawn ? 1 : 0);
    }, 0);
  }

  function canDrawEdgeWithoutImmediateCapture(state, edge) {
    return edge.adjacentBoxIds.every(function (boxIdValue) {
      var box = state.boxes[boxIdValue];

      return !box || box.owner || countDrawnBoxEdges(box, state.edges) < 2;
    });
  }

  function createRandom(seed) {
    var value = Math.floor(Number(seed));

    if (!Number.isFinite(value)) {
      value = 1;
    }

    value = value % 2147483647;
    if (value <= 0) {
      value += 2147483646;
    }

    return function random() {
      value = value * 16807 % 2147483647;
      return (value - 1) / 2147483646;
    };
  }

  function shuffle(values, random) {
    var copy = values.slice();
    var i;
    var j;
    var temp;

    for (i = copy.length - 1; i > 0; i -= 1) {
      j = Math.floor(random() * (i + 1));
      temp = copy[i];
      copy[i] = copy[j];
      copy[j] = temp;
    }

    return copy;
  }

  function getRandomAutoLineCandidates(state, random) {
    var boundary = [];
    var interior = [];

    state.edgeOrder.forEach(function (id) {
      if (state.edges[id].adjacentBoxIds.length === 1) {
        boundary.push(id);
      } else {
        interior.push(id);
      }
    });

    return shuffle(boundary, random).concat(shuffle(interior, random));
  }

  function validateMove(state, edge, player) {
    var id = typeof edge === "string" ? edge : edge && edge.id;
    var actingPlayer = player || state.currentPlayer;

    if (state.status !== "playing") {
      return { ok: false, reason: "Game has already ended." };
    }

    if (actingPlayer !== state.currentPlayer) {
      return { ok: false, reason: "It is not " + playerLabel(actingPlayer) + "'s turn." };
    }

    if (!id || !state.edges[id]) {
      return { ok: false, reason: "That line is not playable on this board." };
    }

    if (state.edges[id].drawn) {
      return { ok: false, reason: "That line has already been drawn." };
    }

    return { ok: true, reason: "" };
  }

  function calculateResult(state) {
    if (state.scores.P1 === state.scores.P2) {
      return {
        type: "draw",
        winner: DRAW,
        reason: "scores_tied"
      };
    }

    return {
      type: "win",
      winner: state.scores.P1 > state.scores.P2 ? PLAYER_ONE : PLAYER_TWO,
      reason: "most_boxes"
    };
  }

  function createMove(state, player, edge, completedBoxIds, options) {
    return {
      index: state.moveHistory.length + 1,
      player: player,
      edgeId: edge.id,
      orientation: edge.orientation,
      row: edge.row,
      col: edge.col,
      label: edgeLabel(edge),
      completedBoxIds: completedBoxIds.slice(),
      createdAt: options && options.createdAt || null
    };
  }

  function applyMove(state, edgeIdValue, options) {
    var requestedEdgeId = typeof edgeIdValue === "string" ? edgeIdValue : edgeIdValue && edgeIdValue.id;
    var player = options && options.player || state.currentPlayer;
    var validation = validateMove(state, requestedEdgeId, player);
    var next;
    var edge;
    var completedBoxIds = [];
    var move;

    if (!validation.ok) {
      next = cloneState(state);
      next.lastError = validation.reason;
      return { ok: false, reason: validation.reason, state: next };
    }

    next = cloneState(state);
    next.history = state.history.concat([snapshotState(state)]);
    next.lastError = null;
    next.lastCapturedBoxIds = [];

    edge = next.edges[requestedEdgeId];
    edge.drawn = true;
    edge.drawnBy = player;
    next.drawnEdgeCount += 1;

    edge.adjacentBoxIds.forEach(function (id) {
      var box = next.boxes[id];

      if (box && !box.owner && isBoxComplete(box, next.edges)) {
        box.owner = player;
        completedBoxIds.push(id);
      }
    });

    completedBoxIds.forEach(function () {
      next.scores[player] += 1;
      next.completedBoxCount += 1;
    });

    move = createMove(next, player, edge, completedBoxIds, options || {});
    next.moveHistory = next.moveHistory.concat([move]);
    next.lastMove = move;
    next.lastCapturedBoxIds = completedBoxIds.slice();

    if (next.drawnEdgeCount === next.totalEdges) {
      next.status = "ended";
      next.result = calculateResult(next);
    } else if (!completedBoxIds.length) {
      next.currentPlayer = otherPlayer(player);
    }

    return { ok: true, state: next };
  }

  function autoPlaceSafeLines(state, options) {
    var opts = options || {};
    var targetRatio = Number(opts.targetRatio) || 0.5;
    var targetEdgeCount = Math.floor(state.totalEdges * Math.max(0, Math.min(1, targetRatio)));
    var random = createRandom(opts.seed);
    var candidates = getRandomAutoLineCandidates(state, random);
    var next;
    var placedCount = 0;

    if (state.status !== "playing") {
      next = cloneState(state);
      next.lastError = "Game has already ended.";
      return { ok: false, reason: next.lastError, state: next };
    }

    if (state.drawnEdgeCount > 0) {
      next = cloneState(state);
      next.lastError = "Auto lines can only be placed before any lines are drawn.";
      return { ok: false, reason: next.lastError, state: next };
    }

    next = cloneState(state);
    next.lastError = null;
    next.lastCapturedBoxIds = [];

    candidates.some(function (edgeIdValue) {
      var edge = next.edges[edgeIdValue];

      if (placedCount >= targetEdgeCount) {
        return true;
      }

      if (!edge.drawn && canDrawEdgeWithoutImmediateCapture(next, edge)) {
        edge.drawn = true;
        edge.drawnBy = AUTO;
        next.drawnEdgeCount += 1;
        placedCount += 1;
      }

      return false;
    });

    next.autoLineSeed = {
      count: placedCount,
      target: targetEdgeCount,
      ratio: targetRatio,
      safetyLimited: placedCount < targetEdgeCount,
      seed: opts.seed || null
    };

    if (!placedCount) {
      next.lastError = "No safe auto lines were available.";
    }

    return {
      ok: placedCount > 0,
      reason: placedCount > 0 ? "" : next.lastError,
      placedCount: placedCount,
      targetEdgeCount: targetEdgeCount,
      safetyLimited: placedCount < targetEdgeCount,
      state: next
    };
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
      shape: cloneShape(previous.shape),
      boxes: cloneBoxes(previous.boxes),
      edges: cloneEdges(previous.edges),
      boxOrder: previous.boxOrder.slice(),
      edgeOrder: previous.edgeOrder.slice(),
      scores: cloneScores(previous.scores),
      moveHistory: previous.moveHistory.map(cloneMove),
      lastMove: cloneMove(previous.lastMove),
      lastError: null,
      lastCapturedBoxIds: previous.lastCapturedBoxIds.slice(),
      autoLineSeed: cloneAutoLineSeed(previous.autoLineSeed),
      result: cloneResult(previous.result),
      history: state.history.slice(0, -1)
    });

    return restored;
  }

  function isShapeConnected(shape) {
    var total = countShapeBoxes(shape);
    var start = null;
    var seen = {};
    var queue;

    if (!total) {
      return false;
    }

    shape.some(function (row, rowIndex) {
      return row.some(function (exists, colIndex) {
        if (exists) {
          start = { row: rowIndex, col: colIndex };
          return true;
        }

        return false;
      });
    });

    queue = [start];
    seen[start.row + "," + start.col] = true;

    while (queue.length) {
      var point = queue.shift();

      DIRECTIONS.forEach(function (direction) {
        var nextRow = point.row + direction.dr;
        var nextCol = point.col + direction.dc;
        var key = nextRow + "," + nextCol;

        if (
          nextRow >= 0 &&
          nextRow < shape.length &&
          nextCol >= 0 &&
          nextCol < shape[0].length &&
          shape[nextRow][nextCol] &&
          !seen[key]
        ) {
          seen[key] = true;
          queue.push({ row: nextRow, col: nextCol });
        }
      });
    }

    return Object.keys(seen).length === total;
  }

  function getBoxOwnerSet(state, boxIds) {
    var set = {};

    (boxIds || []).forEach(function (id) {
      if (state.boxes[id]) {
        set[id] = true;
      }
    });

    return set;
  }

  var api = {
    PLAYER_ONE: PLAYER_ONE,
    PLAYER_TWO: PLAYER_TWO,
    AUTO: AUTO,
    DRAW: DRAW,
    DEFAULT_WIDTH: DEFAULT_WIDTH,
    DEFAULT_HEIGHT: DEFAULT_HEIGHT,
    MIN_SIZE: MIN_SIZE,
    MAX_SIZE: MAX_SIZE,
    PLAYERS: PLAYERS,
    createRectangleShape: createRectangleShape,
    normalizeShape: normalizeShape,
    cloneShape: cloneShape,
    countShapeBoxes: countShapeBoxes,
    createInitialState: createInitialState,
    applyMove: applyMove,
    autoPlaceSafeLines: autoPlaceSafeLines,
    undoMove: undoMove,
    validateMove: validateMove,
    parseEdgeId: parseEdgeId,
    edgeId: edgeId,
    edgeLabel: edgeLabel,
    boxId: boxId,
    boxLabel: boxLabel,
    isBoxComplete: isBoxComplete,
    countDrawnBoxEdges: countDrawnBoxEdges,
    canDrawEdgeWithoutImmediateCapture: canDrawEdgeWithoutImmediateCapture,
    isShapeConnected: isShapeConnected,
    getBoxOwnerSet: getBoxOwnerSet,
    otherPlayer: otherPlayer,
    playerLabel: playerLabel,
    playerShortLabel: playerShortLabel
  };

  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  }

  global.DotsAndBoxesGame = api;
})(typeof window !== "undefined" ? window : globalThis);
