(function (global) {
  "use strict";

  var GAME_ID = "hnefatafl";
  var BOARD_SIZE = 11;
  
  // Piece types
  var EMPTY = null;
  var ATTACKER = "A";
  var DEFENDER = "D";
  var KING = "K";
  
  // Players (for turn tracking)
  var ATTACKER_player = 1;  // Attackers move first
  var DEFENDER_player = 2;
  
  // Special squares
  var THRONE = 60;  // Center square (index 5*11 + 5 = 60)
  var CORNERS = [0, 10, 110, 120];  // Four corners: (0,0), (0,10), (10,0), (10,10)

  function createEmptyBoard() {
    return Array(BOARD_SIZE * BOARD_SIZE).fill(EMPTY);
  }

  function copyBoard(board) {
    return board.slice();
  }

  function getRowCol(index) {
    return { row: Math.floor(index / BOARD_SIZE), col: index % BOARD_SIZE };
  }

  function getIndex(row, col) {
    return row * BOARD_SIZE + col;
  }

  function isInside(row, col) {
    return row >= 0 && row < BOARD_SIZE && col >= 0 && col < BOARD_SIZE;
  }

  function isSpecialSquare(index) {
    return index === THRONE || CORNERS.indexOf(index) !== -1;
  }

  function isThrone(index) {
    return index === THRONE;
  }

  function isCorner(index) {
    return CORNERS.indexOf(index) !== -1;
  }

  function isAttackerPiece(piece) {
    return piece === ATTACKER || piece === KING;
  }

  function isDefenderPiece(piece) {
    return piece === DEFENDER || piece === KING;
  }

  // Initialize the board with standard setup
  function createInitialState() {
    var board = createEmptyBoard();
    
    // Setup from the plan - Fetlar variant adapted for Copenhagen tournament
    // Throne (center) has the King
    board[THRONE] = KING;
    
    // Defenders around throne in cross pattern
    var defenderOffsets = [-11, 11, -1, 1];  // up, down, left, right
    for (var i = 0; i < defenderOffsets.length; i++) {
      board[THRONE + defenderOffsets[i]] = DEFENDER;
    }
    // Additional defenders in a diamond pattern around throne
    var diagonalOffsets = [-12, -10, 10, 12];  // diagonal positions
    for (i = 0; i < diagonalOffsets.length; i++) {
      // Add more defenders to form the standard 8 defenders
    }
    // Standard Copenhagen setup: 8 defenders in a cross/pattern around king
    // Cross pattern: already placed 4, need 4 more
    var secondRingOffset = [-22, 22, -2, 2];
    for (i = 0; i < secondRingOffset.length; i++) {
      board[THRONE + secondRingOffset[i]] = DEFENDER;
    }
    
    // Actually, let me use the correct Copenhagen setup:
    // Reset and place properly
    board = createEmptyBoard();
    board[THRONE] = KING;
    
    // 8 defenders around throne
    var defenders = [
      THRONE - 11, THRONE + 11, THRONE - 1, THRONE + 1,  // immediate cross
      THRONE - 22, THRONE + 22, THRONE - 2, THRONE + 2   // outer cross
    ];
    for (i = 0; i < defenders.length; i++) {
      board[defenders[i]] = DEFENDER;
    }
    
    // 16 attackers on edge midpoints (4 on each edge)
    // Top edge (row 0): columns 3,4,5,6
    board[getIndex(0, 3)] = ATTACKER;
    board[getIndex(0, 4)] = ATTACKER;
    board[getIndex(0, 5)] = ATTACKER;
    board[getIndex(0, 6)] = ATTACKER;
    
    // Bottom edge (row 10): columns 3,4,5,6
    board[getIndex(10, 3)] = ATTACKER;
    board[getIndex(10, 4)] = ATTACKER;
    board[getIndex(10, 5)] = ATTACKER;
    board[getIndex(10, 6)] = ATTACKER;
    
    // Left edge (col 0): rows 3,4,5,6
    board[getIndex(3, 0)] = ATTACKER;
    board[getIndex(4, 0)] = ATTACKER;
    board[getIndex(5, 0)] = ATTACKER;
    board[getIndex(6, 0)] = ATTACKER;
    
    // Right edge (col 10): rows 3,4,5,6
    board[getIndex(3, 10)] = ATTACKER;
    board[getIndex(4, 10)] = ATTACKER;
    board[getIndex(5, 10)] = ATTACKER;
    board[getIndex(6, 10)] = ATTACKER;
    
    return {
      board: board,
      currentPlayer: ATTACKER_player,  // Attackers move first
      kingCorner: null,  // Track which corner king is adjacent to (for Exit Fort)
      kingEscaped: false,
      gameOver: false,
      winner: null,
      moveCount: 0,
      log: [],
      history: [],
      lastMove: null,
      lastError: null
    };
  }

  function cloneState(state) {
    var copy = {};
    copy.board = copyBoard(state.board);
    copy.currentPlayer = state.currentPlayer;
    copy.kingCorner = state.kingCorner;
    copy.kingEscaped = state.kingEscaped;
    copy.gameOver = state.gameOver;
    copy.winner = state.winner;
    copy.moveCount = state.moveCount;
    copy.log = state.log.slice();
    copy.history = state.history.map(function(s) { return { board: copyBoard(s.board), currentPlayer: s.currentPlayer }; });
    copy.lastMove = state.lastMove ? { from: state.lastMove.from, to: state.lastMove.to } : null;
    copy.lastError = state.lastError;
    return copy;
  }

  function findKing(board) {
    for (var i = 0; i < board.length; i++) {
      if (board[i] === KING) {
        return i;
      }
    }
    return -1;
  }

  function countPieces(board, pieceType) {
    var count = 0;
    for (var i = 0; i < board.length; i++) {
      if (board[i] === pieceType) {
        count++;
      }
    }
    return count;
  }

  function countDefenders(board) {
    // Count defenders + king
    var count = 0;
    for (var i = 0; i < board.length; i++) {
      if (board[i] === DEFENDER || board[i] === KING) {
        count++;
      }
    }
    return count;
  }

  // Find all empty adjacent squares
  function getAdjacentEmpty(board, index) {
    var rc = getRowCol(index);
    var adjacent = [];
    var offsets = [-BOARD_SIZE, BOARD_SIZE, -1, 1];
    
    for (var i = 0; i < offsets.length; i++) {
      var newIndex = index + offsets[i];
      if (!isInside(rc.row, rc.col)) continue;
      
      var newRC = getRowCol(newIndex);
      if (!isInside(newRC.row, newRC.col)) continue;
      
      // Check bounds more carefully
      var dr = newRC.row - rc.row;
      var dc = newRC.col - rc.col;
      
      // Must be orthogonal (not diagonal)
      if (Math.abs(dr) + Math.abs(dc) !== 1) continue;
      
      if (newIndex >= 0 && newIndex < board.length && board[newIndex] === EMPTY && !isThrone(newIndex)) {
        adjacent.push(newIndex);
      }
    }
    return adjacent;
  }

  // Check if a square is "hostile" (throne, corner, or edge for certain situations)
  function isHostileSquare(index) {
    return isThrone(index) || isCorner(index);
  }

  // Get orthogonal adjacent indices
  function getOrthogonalNeighbors(index) {
    var rc = getRowCol(index);
    var neighbors = [];
    var delta = [-BOARD_SIZE, BOARD_SIZE, -1, 1];
    
    for (var i = 0; i < delta.length; i++) {
      var newIndex = index + delta[i];
      var newRC = getRowCol(newIndex);
      if (isInside(newRC.row, newRC.col)) {
        neighbors.push(newIndex);
      }
    }
    return neighbors;
  }

  // Check if piece is surrounded on all 4 sides (for king capture)
  function isCompletelySurrounded(board, index) {
    var neighbors = getOrthogonalNeighbors(index);
    // Must have 4 orthogonal neighbors (not on edge/corner)
    if (neighbors.length !== 4) return false;
    
    for (var i = 0; i < neighbors.length; i++) {
      var piece = board[neighbors[i]];
      if (piece === EMPTY) return false;
      if (piece === DEFENDER || piece === KING) return false;  // Not surrounded by attackers
    }
    return true;
  }

  // Check if king is adjacent to throne and surrounded on 3 sides (throne acts as 4th)
  function isKingCapturableNearThrone(board, kingIndex) {
    if (!isAdjacentToThrone(kingIndex)) return false;
    
    var neighbors = getOrthogonalNeighbors(kingIndex);
    var hostileCount = 0;
    var occupiedNonFriendly = 0;
    
    for (var i = 0; i < neighbors.length; i++) {
      var piece = board[neighbors[i]];
      if (isHostileSquare(neighbors[i]) || piece === ATTACKER) {
        occupiedNonFriendly++;
      }
    }
    
    return occupiedNonFriendly >= 3;
  }

  function isAdjacentToThrone(index) {
    var rc = getRowCol(index);
    var throneRC = getRowCol(THRONE);
    return Math.abs(rc.row - throneRC.row) + Math.abs(rc.col - throneRC.col) === 1;
  }

  function isCornerAdjacent(index) {
    for (var i = 0; i < CORNERS.length; i++) {
      var cornersRC = getRowCol(CORNERS[i]);
      var hereRC = getRowCol(index);
      if (Math.abs(cornersRC.row - hereRC.row) + Math.abs(cornersRC.col - hereRC.col) === 1) {
        return true;
      }
    }
    return false;
  }

  // Check for attacker win: king is captured
  function checkAttackerWin(board) {
    var kingIndex = findKing(board);
    if (kingIndex === -1) return false;  // King should always exist
    
    // King is captured if completely surrounded by attackers
    if (isCompletelySurrounded(board, kingIndex)) return true;
    
    // King near throne, surrounded on 3 sides
    if (isKingCapturableNearThrone(board, kingIndex)) return true;
    
    return false;
  }

  // Check for defender win: king reaches corner
  function checkDefenderWin(board) {
    var kingIndex = findKing(board);
    if (kingIndex === -1) return false;
    
    // King escaped if in a corner
    if (isCorner(kingIndex)) return true;
    
    return false;
  }

  // Get valid moves for a piece (rook-like movement)
  function getRookMoves(board, fromIndex) {
    var piece = board[fromIndex];
    var moves = [];
    var directions = [-BOARD_SIZE, BOARD_SIZE, -1, 1];  // up, down, left, right
    
    for (var d = 0; d < directions.length; d++) {
      var dir = directions[d];
      var pos = fromIndex;
      
      while (true) {
        var nextPos = pos + dir;
        var nextRC = getRowCol(nextPos);
        
        if (!isInside(nextRC.row, nextRC.col)) break;
        
        // Check that the move is in the correct direction (no wrapping)
        var hereRC = getRowCol(pos);
        if (dir === -BOARD_SIZE && nextRC.row > hereRC.row) break;
        if (dir === BOARD_SIZE && nextRC.row < hereRC.row) break;
        if (dir === -1 && nextRC.col < hereRC.col) break;
        if (dir === 1 && nextRC.col > hereRC.col) break;
        
        var nextPiece = board[nextPos];
        
        if (nextPiece === EMPTY) {
          // Can move to empty square (check restrictions)
          if (!isThrone(nextPos) || piece === KING) {
            // Attackers cannot occupy throne
            if (piece === ATTACKER && isThrone(nextPos)) {
              break;  // Cannot move onto throne
            }
            moves.push(nextPos);
          }
        } else {
          // Hit another piece (can capture sandwiched pieces)
          break;
        }
        pos = nextPos;
      }
    }
    
    return moves;
  }

  // Get legal moves for current player
  function getLegalMoves(state) {
    var board = state.board;
    var currentPlayer = state.currentPlayer;
    var legalMoves = [];
    
    for (var i = 0; i < board.length; i++) {
      var piece = board[i];
      
      // Find pieces belonging to current player
      var isMyPiece = false;
      if (currentPlayer === ATTACKER_player && piece === ATTACKER) isMyPiece = true;
      if (currentPlayer === DEFENDER_player && (piece === DEFENDER || piece === KING)) isMyPiece = true;
      
      if (!isMyPiece) continue;
      
      // Get potential rook moves
      var moves = getRookMoves(board, i);
      
      for (var m = 0; m < moves.length; m++) {
        var toPos = moves[m];
        
        // Check for sandwich captures
        var captures = checkCapturesAfterMove(board, i, toPos, piece);
        
        // Special win condition: king reaches corner
        if (piece === KING && isCorner(toPos)) {
          legalMoves.push({ from: i, to: toPos, captures: captures, isWin: true });
          continue;
        }
        
        legalMoves.push({ from: i, to: toPos, captures: captures, isWin: false });
      }
    }
    
    return legalMoves;
  }

  // Check what gets captured when moving from 'from' to 'to' with piece type
  function checkCapturesAfterMove(board, from, to, piece) {
    var captures = [];
    var attackedPieces = [];  // Pieces that might be captured
    
    // After moving, check orthogonal adjacency for sandwich captures
    
    // Find the pieces that would now be "sandwiched" between the moved piece's new position
    // and hostile squares or other attackers
    
    // This is complex - need to check each orthogonal direction from potentially captured pieces
    // For now, return empty captures (the logic goes in validateMove)
    
    return captures;
  }

  function validateMove(state, from, to) {
    if (state.gameOver) {
      return { ok: false, reason: "Game has ended." };
    }
    
    var board = state.board;
    var piece = board[from];
    
    if (piece === EMPTY) {
      return { ok: false, reason: "No piece at the source square." };
    }
    
    // Check if piece belongs to current player
    var isMyPiece = false;
    if (state.currentPlayer === ATTACKER_player && piece === ATTACKER) isMyPiece = true;
    if (state.currentPlayer === DEFENDER_player && (piece === DEFENDER || piece === KING)) isMyPiece = true;
    
    if (!isMyPiece) {
      return { ok: false, reason: "Not your piece." };
    }
    
    // Destination must be empty
    if (board[to] !== EMPTY) {
      return { ok: false, reason: "Destination is occupied." };
    }
    
    // Attackers cannot move to throne
    if (piece === ATTACKER && isThrone(to)) {
      return { ok: false, reason: "Attackers cannot occupy the throne." };
    }
    
    // Check rook-like movement (orthogonal, any distance, no jumping)
    var fromRC = getRowCol(from);
    var toRC = getRowCol(to);
    
    // Must be same row or same column (orthogonal)
    if (fromRC.row !== toRC.row && fromRC.col !== toRC.col) {
      return { ok: false, reason: "Must move orthogonally (like a rook)." };
    }
    
    // Path must be clear
    var dr = toRC.row - fromRC.row;
    var dc = toRC.col - fromRC.col;
    stepRow = dr === 0 ? 0 : dr > 0 ? 1 : -1;
    stepCol = dc === 0 ? 0 : dc > 0 ? 1 : -1;
    var steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    for (var s = 1; s < steps; s++) {
      var checkPos = from + s * stepRow * BOARD_SIZE + s * stepCol;
      if (board[checkPos] !== EMPTY) {
        return { ok: false, reason: "Path is blocked." };
      }
    }
    
    return { ok: true, reason: "" };
  }

  function executeMove(state, from, to) {
    var validation = validateMove(state, from, to);
    if (!validation.ok) {
      return { success: false, error: validation.reason };
    }
    
    var board = copyBoard(state.board);
    var piece = board[from];
    
    // Move the piece
    board[from] = EMPTY;
    board[to] = piece;
    
    // Check for captures (sandwich attack)
    var capturedIndices = findSandwichCaptures(board, to, piece);
    for (var c = 0; c < capturedIndices.length; c++) {
      board[capturedIndices[c]] = EMPTY;
    }
    
    // Check for special captures (adjacent to throne/corners)
    var additionalCaptures = findAdjacentCaptures(board, to, piece);
    for (c = 0; c < additionalCaptures.length; c++) {
      if (capturedIndices.indexOf(additionalCaptures[c]) === -1) {
        board[additionalCaptures[c]] = EMPTY;
      }
    }
    
    // Create new state
    var newState = {
      board: board,
      currentPlayer: state.currentPlayer === ATTACKER_player ? DEFENDER_player : ATTACKER_player,
      kingCorner: state.kingCorner,
      kingEscaped: state.kingEscaped,
      gameOver: false,
      winner: null,
      moveCount: state.moveCount + 1,
      log: state.log.slice(),
      history: [],
      lastMove: { from: from, to: to },
      lastError: null
    };
    
    // Save to history
    for (var h = 0; h < state.history.length; h++) {
      newState.history.push({
        board: copyBoard(state.history[h].board),
        currentPlayer: state.history[h].currentPlayer
      });
    }
    newState.history.push({
      board: copyBoard(state.board),
      currentPlayer: state.currentPlayer
    });
    
    // Add log entry
    var moveLog = "Player " + state.currentPlayer + " moves to " + getSquareName(to) + ".";
    if (capturedIndices.length > 0 || additionalCaptures.length > 0) {
      var totalCaptures = capturedIndices.length + additionalCaptures.length;
      moveLog += " Captured " + totalCaptures + " piece" + (totalCaptures > 1 ? "s" : "") + ".";
    }
    newState.log.push(moveLog);
    
    // Check for game end conditions
    if (checkDefenderWin(board)) {
      newState.gameOver = true;
      newState.winner = DEFENDER_player;
      newState.kingEscaped = true;
      moveLog = "King escapes! Defenders win!";
      newState.log.push(moveLog);
    } else if (checkAttackerWin(board)) {
      newState.gameOver = true;
      newState.winner = ATTACKER_player;
      moveLog = "King captured! Attackers win!";
      newState.log.push(moveLog);
    }
    
    newState.lastError = null;
    return { success: true, newState: newState };
  }

  // Find sandwich captures: piece sandwiched between two enemies or enemy and hostile square
  function findSandwichCaptures(board, movedTo, movedPiece) {
    var captures = [];
    var neighbors = getOrthogonalNeighbors(movedTo);
    
    // For each direction, check if a friendly piece has an enemy on the other side
    for (var d = 0; d < neighbors.length; d += 2) {
      var otherSide = neighbors[d] !== -1 && neighbors[d+1] !== -1 ? [neighbors[d], neighbors[d+1]] : [];
      if (otherSide.length !== 2) continue;
      
      var neighbor1 = otherSide[0];
      var neighbor2 = otherSide[1];
      
      var rc1 = getRowCol(neighbor1);
      var rc2 = getRowCol(neighbor2);
      var movedRC = getRowCol(movedTo);
      
      // Must be opposite sides in a straight line
      if (Math.abs(rc1.row - movedRC.row) + Math.abs(rc1.col - movedRC.col) !== 1) continue;
      if (Math.abs(rc2.row - movedRC.row) + Math.abs(rc2.col - movedRC.col) !== 1) continue;
      
      // Check if they're actually opposite
      var dr1 = rc1.row - movedRC.row;
      var dc1 = rc1.col - movedRC.col;
      var dr2 = rc2.row - movedRC.row;
      var dc2 = rc2.col - movedRC.col;
      
      // Must be on exactly opposite sides of movedPos
      if (dr1 !== -dr2 || dc1 !== -dc2) continue;
      
      var piece1 = board[neighbor1];
      var piece2 = board[neighbor2];
      var sandwiched = movedPiece === ATTACKER ? DEFENDER : KING;
      
      // For defenders (including king), capture attackers sandwiched
      // For attackers, capture defenders (not king) sandwiched
      var targetPiece = movedPiece === ATTACKER ? DEFENDER : ATTACKER;
      
      // Check if one side has the target piece and other side has a friendly piece
      var hasTarget = piece1 === targetPiece && isInside(rc1.row, rc1.col);
      var hasFriendly = piece2 === movedPiece && isInside(rc2.row, rc2.col);
      
      if (hasTarget && hasFriendly) {
        // Sandwiched piece at neighbor1 (or neighbor2 depending on which has target)
        var sandwichPos = hasTarget ? neighbor1 : neighbor2;
        var sandwichRC = getRowCol(sandwichPos);
        if (isInside(sandwichRC.row, sandwichRC.col) && board[sandwichPos] === targetPiece) {
          // Check target piece restrictions
          if (targetPiece === DEFENDER && sandwichPos === THRONE) continue;  // Can't capture on throne
          // King can't be captured on edge unless it's the only defender
          if (targetPiece === DEFENDER && isEdgeOrCorner(sandwichPos) && !isOnlyDefender(board)) continue;
          
          if (captures.indexOf(sandwichPos) === -1) {
            captures.push(sandwichPos);
          }
        }
      }
      
      // Check reverse (target on other side)
      hasTarget = piece2 === targetPiece && isInside(rc2.row, rc2.col);
      hasFriendly = piece1 === movedPiece && isInside(rc1.row, rc1.col);
      
      if (hasTarget && hasFriendly) {
        sandwichPos = hasTarget ? neighbor2 : neighbor1;
        sandwichRC = getRowCol(sandwichPos);
        if (isInside(sandwichRC.row, sandwichRC.col) && board[sandwichPos] === targetPiece) {
          if (targetPiece === DEFENDER && sandwichPos === THRONE) continue;
          if (targetPiece === DEFENDER && isEdgeOrCorner(sandwichPos) && !isOnlyDefender(board)) continue;
          
          if (captures.indexOf(sandwichPos) === -1) {
            captures.push(sandwichPos);
          }
        }
      }
    }
    
    return captures;
  }

  function isEdgeOrCorner(index) {
    var rc = getRowCol(index);
    return rc.row === 0 || rc.row === BOARD_SIZE - 1 || rc.col === 0 || rc.col === BOARD_SIZE - 1 || isCorner(index);
  }

  function isOnlyDefender(board) {
    var defCount = countDefenders(board);
    return defCount <= 2;  // If 2 or fewer defenders, edge capture is allowed
  }

  // Find captures due to adjacency with hostile squares (throne/corners)
  function findAdjacentCaptures(board, movedTo, movedPiece) {
    var captures = [];
    
    // After a piece moves, check if enemy pieces are now adjacent to hostile squares
    // and sandwiched between hostile and friendly
    
    if (movedPiece !== ATTACKER) return captures;  // Only attackers create these captures
    
    // Check around throne
    var throneNeighbors = getOrthogonalNeighbors(THRONE);
    for (var i = 0; i < throneNeighbors.length; i++) {
      var enemyPos = throneNeighbors[i];
      var enemyPiece = board[enemyPos];
      if (enemyPiece === DEFENDER) {
        // Check if this defender has attacker on opposite side
        var enemyNeighbors = getOrthogonalNeighbors(enemyPos);
        for (var j = 0; j < enemyNeighbors.length; j++) {
          var oppPos = enemyNeighbors[j];
          var oppRC = getRowCol(oppPos);
          var enemyRC = getRowCol(enemyPos);
          
          // Check if this is opposite to throne
          var oppNeighborRC = getRowCol(enemyNeighbors[j]);
          var dr = oppRC.row - enemyRC.row;
          var dc = oppRC.col - enemyRC.col;
          var toThroneDR = getRowCol(THRONE).row - enemyRC.row;
          var toThroneDC = getRowCol(THRONE).col - enemyRC.col;
          
          if (dr === -toThroneDR && dc === -toThroneDC) {
            // Opposite side
            if (board[enemyNeighbors[j]] === ATTACKER) {
              if (captures.indexOf(enemyPos) === -1) {
                captures.push(enemyPos);
              }
            }
          }
        }
      }
    }
    
    return captures;
  }

  function undo(state) {
    if (state.history.length === 0) {
      return { success: false, error: "Nothing to undo." };
    }
    
    var lastState = state.history[state.history.length - 1];
    var newState = {
      board: copyBoard(lastState.board),
      currentPlayer: lastState.currentPlayer,
      kingCorner: state.kingCorner,
      kingEscaped: false,
      gameOver: false,
      winner: null,
      moveCount: state.moveCount - 1,
      log: state.log.slice(0, -1),
      history: state.history.slice(0, -1),
      lastMove: null,
      lastError: null
    };
    
    return { success: true, newState: newState };
  }

  function getSquareName(index) {
    var rc = getRowCol(index);
    var cols = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"];
    return cols[rc.col] + (rc.row + 1);
  }

  // Public API
  global.Hnefatafl = {
    createInitialState: createInitialState,
    cloneState: cloneState,
    validateMove: validateMove,
    executeMove: executeMove,
    undo: undo,
    getLegalMoves: getLegalMoves,
    findKing: findKing,
    countDefenders: countDefenders,
    countPieces: countPieces,
    getSquareName: getSquareName,
    getOrthogonalNeighbors: getOrthogonalNeighbors,
    isThrone: isThrone,
    isCorner: isCorner,
    isCornerAdjacent: isCornerAdjacent,
    isAdjacentToThrone: isAdjacentToThrone,
    isCompletelySurrounded: isCompletelySurrounded,
    getRowCol: getRowCol,
    getIndex: getIndex,
    checkAttackerWin: checkAttackerWin,
    checkDefenderWin: checkDefenderWin
  };

})(typeof window !== "undefined" ? window : this);
