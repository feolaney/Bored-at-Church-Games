// Hnefatafl Test Suite
// Run with: node tests/games/hnefatafl_test.js

"use strict";

// Game logic stub for testing
var Hnefatafl = {
  isThrone: function(i) { return i === 60; },
  isCorner: function(i) { return i === 0 || i === 10 || i === 110 || i === 120; },
  findKing: function(board) {
    for (var i = 0; i < board.length; i++) if (board[i] === "K") return i;
    return -1;
  },
  countPieces: function(board, type) {
    var c = 0;
    for (var i = 0; i < board.length; i++) if (board[i] === type) c++;
    return c;
  },
  countDefenders: function(board) {
    var c = 0;
    for (var i = 0; i < board.length; i++) if (board[i] === "D" || board[i] === "K") c++;
    return c;
  },
  getSquareName: function(i) {
    var cols = "ABCDEFGHIJK";
    return cols[i % 11] + (Math.floor(i / 11) + 1);
  },
  getOrthogonalNeighbors: function(i) {
    var r = Math.floor(i / 11), c = i % 11, n = [];
    if (r > 0) n.push(i - 11);
    if (r < 10) n.push(i + 11);
    if (c > 0) n.push(i - 1);
    if (c < 10) n.push(i + 1);
    return n;
  },
  isAdjacentToThrone: function(i) {
    var r = Math.floor(i / 11), c = i % 11;
    return (Math.abs(r - 5) + Math.abs(c - 5)) === 1;
  },
  isCompletelySurrounded: function(board, i) {
    var n = this.getOrthogonalNeighbors(i);
    if (n.length !== 4) return false;
    for (var j = 0; j < n.length; j++) {
      var p = board[n[j]];
      if (p === null || p === "D" || p === "K") return false;
    }
    return true;
  },
  getRowCol: function(i) { return { row: Math.floor(i / 11), col: i % 11 }; },
  getIndex: function(r, c) { return r * 11 + c; },
  checkAttackerWin: function(board) {
    var ki = this.findKing(board);
    if (ki < 0) return false;
    return this.isCompletelySurrounded(board, ki);
  },
  checkDefenderWin: function(board) {
    var ki = this.findKing(board);
    return ki >= 0 && this.isCorner(ki);
  },
  validateMove: function(state, from, to) {
    if (!state) return { ok: false, reason: "No state" };
    if (!state.board) return { ok: false, reason: "No board" };
    if (state.gameOver) return { ok: false, reason: "Game ended" };
    if (from === null || from < 0 || from >= 121) return { ok: false, reason: "Invalid from" };
    if (to === null || to < 0 || to >= 121) return { ok: false, reason: "Invalid to" };
    var piece = state.board[from];
    if (!piece) return { ok: false, reason: "No piece at from" };
    var toPiece = state.board[to];
    if (toPiece) return { ok: false, reason: "Occupied" };
    var fr = Math.floor(from / 11), fc = from % 11;
    var tr = Math.floor(to / 11), tc = to % 11;
    if (fr !== tr && fc !== tc) return { ok: false, reason: "Not orthogonal" };
    return { ok: true, reason: "" };
  },
  executeMove: function(state, from, to) {
    var v = this.validateMove(state, from, to);
    if (!v.ok) return { success: false, error: v.reason };
    var nb = state.board.slice();
    nb[to] = nb[from];
    nb[from] = null;
    var ns = {
      board: nb,
      currentPlayer: state.currentPlayer === 1 ? 2 : 1,
      gameOver: false,
      winner: null,
      moveCount: state.moveCount + 1,
      history: state.history.concat([{ board: state.board.slice(), currentPlayer: state.currentPlayer }])
    };
    return { success: true, newState: ns };
  },
  undo: function(state) {
    if (state.history.length === 0) return { success: false, error: "No history" };
    var hs = state.history[state.history.length - 1];
    return { success: true, newState: { 
      board: hs.board, 
      currentPlayer: hs.currentPlayer, 
      gameOver: false, 
      winner: null, 
      moveCount: state.moveCount - 1, 
      history: state.history.slice(0, -1) 
    } };
  }
};

// Test harness
var tests = [];
var passed = 0;
var failed = 0;
var initialState = {
  board: [],
  currentPlayer: 1,
  gameOver: false,
  winner: null,
  moveCount: 0,
  history: []
};

function test(name, fn) {
  tests.push({ name: name, fn: fn });
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg || "Assertion failed");
}

function assertEqual(a, b, msg) {
  if (a !== b) throw new Error(msg || "Expected " + b + " but got " + a);
}

function setupBoard() {
  var b = initialState.board = Array(121).fill(null);
  b[60] = "K";  // Throne is at row 5, col 5 = index 60 (center of 11x11)
  // Defenders in cross pattern around throne (8 defenders)
  // Up, down, left, right at distance 1: 49, 71, 59, 61
  // Up, down, left, right at distance 2: 38, 82, 58, 62
  b[49] = b[71] = b[59] = b[61] = "D";
  b[38] = b[82] = b[58] = b[62] = "D";
  // Attackers on edges - skip positions that overlap with defenders
  // Top edge (row 0): cols 3-6
  b[3] = b[4] = b[5] = b[6] = "A";
  // Bottom edge (row 10): cols 3-6
  b[113] = b[114] = b[115] = b[116] = "A";
  // Left edge (col 0): rows 1,2,8,9 (skip 5)
  b[11] = b[22] = b[88] = b[99] = "A";
  // Right edge (col 10): rows 1,2,8,9 (skip 5)
  b[11+10] = b[22+10] = b[88+10] = b[99+10] = "A";
  return b;
}

function runTests() {
  console.log("Running Hnefatafl tests...\n");
  setupBoard();
  for (var i = 0; i < tests.length; i++) {
    var t = tests[i];
    try {
      t.fn();
      console.log("PASS: " + t.name);
      passed++;
    } catch (e) {
      console.log("FAIL: " + t.name + " - " + e.message);
      failed++;
    }
  }
  console.log("\n" + passed + "/" + (passed + failed) + " tests passed");
  if (failed > 0) {
    process.exit(1);
  }
}

// ============== TESTS ==============

test("Board setup - king at throne", function() {
  assertEqual(initialState.board[60], "K");
});

test("Board setup - 8 defenders", function() {
  assertEqual(Hnefatafl.countPieces(initialState.board, "D"), 8);
});

test("Board setup - 16 attackers", function() {
  assertEqual(Hnefatafl.countPieces(initialState.board, "A"), 16);
});

test("Throne is center square", function() {
  assertEqual(Hnefatafl.isThrone(60), true);
});

test("Corner squares correct", function() {
  assertEqual(Hnefatafl.isCorner(0), true);
  assertEqual(Hnefatafl.isCorner(10), true);
  assertEqual(Hnefatafl.isCorner(110), true);
  assertEqual(Hnefatafl.isCorner(120), true);
});

test("Find king returns throne", function() {
  assertEqual(Hnefatafl.findKing(initialState.board), 60);
});

test("Orthogonal neighbors - center", function() {
  var n = Hnefatafl.getOrthogonalNeighbors(60);
  assertEqual(n.length, 4);
  assertEqual(n[0], 49);  // up: 60-11 = 49
  assertEqual(n[1], 71);  // down: 60+11 = 71
  assertEqual(n[2], 59);  // left: 60-1 = 59
  assertEqual(n[3], 61);  // right: 60+1 = 61
});

test("Orthogonal neighbors - corner", function() {
  var n = Hnefatafl.getOrthogonalNeighbors(0);
  assertEqual(n.length, 2);
});

test("Adjacent to throne - true", function() {
  assertEqual(Hnefatafl.isAdjacentToThrone(49), true);  // up
  assertEqual(Hnefatafl.isAdjacentToThrone(59), true);  // left
});

test("Adjacent to throne - false", function() {
  assertEqual(Hnefatafl.isAdjacentToThrone(33), false);
});

test("Square name A1", function() {
  assertEqual(Hnefatafl.getSquareName(0), "A1");
});

test("Square name K11", function() {
  assertEqual(Hnefatafl.getSquareName(120), "K11");
});

test("Square name F6", function() {
  assertEqual(Hnefatafl.getSquareName(60), "F6");
});

test("Get row/col - center", function() {
  var rc = Hnefatafl.getRowCol(60);
  assertEqual(rc.row, 5);
  assertEqual(rc.col, 5);
});

test("Get index", function() {
  assertEqual(Hnefatafl.getIndex(5, 5), 60);
});

test("Validate move - valid horizontal", function() {
  var b = Array(121).fill(null);
  b[0] = "A";
  var s = { board: b, currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var v = Hnefatafl.validateMove(s, 0, 5);
  assertEqual(v.ok, true);
});

test("Validate move - occupied destination", function() {
  var b = Array(121).fill(null);
  b[0] = "A";
  b[5] = "A";
  var s = { board: b, currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var v = Hnefatafl.validateMove(s, 0, 5);
  assertEqual(v.ok, false);
});

test("Validate move - diagonal invalid", function() {
  var b = Array(121).fill(null);
  b[0] = "A";
  var s = { board: b, currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var v = Hnefatafl.validateMove(s, 0, 12);
  assertEqual(v.ok, false);
});

test("Execute move - basic move", function() {
  var b = Array(121).fill(null);
  b[0] = "A";
  var s = { board: b, currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var r = Hnefatafl.executeMove(s, 0, 5);
  assertEqual(r.success, true);
  assertEqual(r.newState.board[0], null);
  assertEqual(r.newState.board[5], "A");
  assertEqual(r.newState.moveCount, 1);
});

test("Undo - restores state", function() {
  var b = Array(121).fill(null);
  b[0] = "A";
  var s = { board: b, currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var r1 = Hnefatafl.executeMove(s, 0, 5);
  var r2 = Hnefatafl.undo(r1.newState);
  assertEqual(r2.success, true);
  assertEqual(r2.newState.moveCount, 0);
  assertEqual(r2.newState.board[0], "A");
});

test("Undo - no history fails", function() {
  var s = { board: [], currentPlayer: 1, gameOver: false, winner: null, moveCount: 0, history: [] };
  var r = Hnefatafl.undo(s);
  assertEqual(r.success, false);
});

test("Completely surrounded - true", function() {
  var b = Array(121).fill(null);
  b[60] = "K";
  b[49] = b[71] = b[59] = b[61] = "A";
  assertEqual(Hnefatafl.isCompletelySurrounded(b, 60), true);
});

test("Completely surrounded - false", function() {
  var b = Array(121).fill(null);
  b[60] = "K";
  b[49] = b[71] = b[59] = "A";
  assertEqual(Hnefatafl.isCompletelySurrounded(b, 60), false);
});

test("Attacker win - king surrounded", function() {
  var b = Array(121).fill(null);
  b[60] = "K";
  b[49] = b[71] = b[59] = b[61] = "A";
  assertEqual(Hnefatafl.checkAttackerWin(b), true);
});

test("Defender win - king at corner", function() {
  var b = Array(121).fill(null);
  b[0] = "K";
  assertEqual(Hnefatafl.checkDefenderWin(b), true);
});

test("Defender win - king not at corner", function() {
  var b = Array(121).fill(null);
  b[50] = "K";
  assertEqual(Hnefatafl.checkDefenderWin(b), false);
});

runTests();
