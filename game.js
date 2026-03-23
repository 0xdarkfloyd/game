// Initial board setup
const initialBoard = [
    ['r車', 'r馬', 'r象', 'r士', 'r将', 'r士', 'r象', 'r馬', 'r車'],
    ['', '', '', '', '', '', '', '', ''],
    ['', 'r炮', '', '', '', '', '', 'r炮', ''],
    ['r兵', '', 'r兵', '', 'r兵', '', 'r兵', '', 'r兵'],
    ['', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['b卒', '', 'b卒', '', 'b卒', '', 'b卒', '', 'b卒'],
    ['', 'b砲', '', '', '', '', '', 'b砲', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['b车', 'b马', 'b相', 'b仕', 'b帅', 'b仕', 'b相', 'b马', 'b车']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let currentPlayer = 'r'; // 'r' for red, 'b' for black
let selectedCell = null;
let validMoves = [];

const pieceNames = {
    '車': '車', '车': '车', '馬': '馬', '马': '马',
    '象': '象', '相': '相', '士': '士', '仕': '仕',
    '将': '将', '帅': '帅', '炮': '炮', '砲': '砲',
    '兵': '兵', '卒': '卒'
};

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    for (let row = 0; row < 10; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'row';

        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (row === 4 || row === 5) {
                cell.classList.add('river');
            }

            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece ' + (piece[0] === 'r' ? 'red' : 'black');
                pieceElement.textContent = piece.substring(1);
                cell.appendChild(pieceElement);
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            rowElement.appendChild(cell);
        }

        boardElement.appendChild(rowElement);
    }
}

function handleCellClick(row, col) {
    const piece = board[row][col];

    // If a piece is already selected
    if (selectedCell) {
        // Check if this is a valid move
        if (validMoves.some(m => m.row === row && m.col === col)) {
            // Make the move
            movePiece(selectedCell.row, selectedCell.col, row, col);
            clearSelection();

            // Switch player and let computer play
            if (currentPlayer === 'b') {
                setTimeout(computerMove, 500);
            }
        } else {
            // Select new piece if it belongs to current player
            clearSelection();
            if (piece && piece[0] === currentPlayer) {
                selectPiece(row, col);
            }
        }
    } else {
        // Select piece if it belongs to current player
        if (piece && piece[0] === currentPlayer) {
            selectPiece(row, col);
        }
    }
}

function selectPiece(row, col) {
    selectedCell = { row, col };
    validMoves = getValidMoves(row, col);

    // Highlight selected cell and valid moves
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const cellRow = parseInt(cell.dataset.row);
        const cellCol = parseInt(cell.dataset.col);

        if (cellRow === row && cellCol === col) {
            cell.classList.add('selected');
        } else if (validMoves.some(m => m.row === cellRow && m.col === cellCol)) {
            cell.classList.add('valid-move');
        }
    });
}

function clearSelection() {
    selectedCell = null;
    validMoves = [];
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'valid-move');
    });
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = '';
    currentPlayer = currentPlayer === 'r' ? 'b' : 'r';
    updateTurnDisplay();
    createBoard();

    // Check for game over
    checkGameOver();
}

function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];

    const pieceType = piece.substring(1);
    const color = piece[0];
    const moves = [];

    switch (pieceType) {
        case '車':
        case '车':
            // Rook moves (horizontal and vertical)
            for (let direction of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let newRow = row + direction[0];
                let newCol = col + direction[1];
                while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                    if (!board[newRow][newCol]) {
                        moves.push({ row: newRow, col: newCol });
                    } else {
                        if (board[newRow][newCol][0] !== color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                        break;
                    }
                    newRow += direction[0];
                    newCol += direction[1];
                }
            }
            break;

        case '馬':
        case '马':
            // Horse moves
            const horseMoves = [
                [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
                [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1]
            ];
            for (let [dr, dc, blockR, blockC] of horseMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                const blockRow = row + blockR;
                const blockCol = col + blockC;

                if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9 &&
                    !board[blockRow][blockCol]) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '象':
        case '相':
            // Elephant moves (stays on own side)
            const maxRow = color === 'r' ? 4 : 10;
            const minRow = color === 'r' ? 0 : 5;
            const elephantMoves = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
            for (let [dr, dc] of elephantMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                const blockRow = row + dr / 2;
                const blockCol = col + dc / 2;

                if (newRow >= minRow && newRow < maxRow && newCol >= 0 && newCol < 9 &&
                    !board[blockRow][blockCol]) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '士':
        case '仕':
            // Advisor moves (within palace)
            const palaceRows = color === 'r' ? [0, 1, 2] : [7, 8, 9];
            const palaceCols = [3, 4, 5];
            const advisorMoves = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (let [dr, dc] of advisorMoves) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (palaceRows.includes(newRow) && palaceCols.includes(newCol)) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '将':
        case '帅':
            // General moves (within palace)
            const genPalaceRows = color === 'r' ? [0, 1, 2] : [7, 8, 9];
            const genPalaceCols = [3, 4, 5];
            const generalMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let [dr, dc] of generalMoves) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (genPalaceRows.includes(newRow) && genPalaceCols.includes(newCol)) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '炮':
        case '砲':
            // Cannon moves
            for (let direction of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let newRow = row + direction[0];
                let newCol = col + direction[1];
                let jumped = false;

                while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                    if (!board[newRow][newCol]) {
                        if (!jumped) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    } else {
                        if (!jumped) {
                            jumped = true;
                        } else {
                            if (board[newRow][newCol][0] !== color) {
                                moves.push({ row: newRow, col: newCol });
                            }
                            break;
                        }
                    }
                    newRow += direction[0];
                    newCol += direction[1];
                }
            }
            break;

        case '兵':
        case '卒':
            // Soldier moves
            const forward = color === 'r' ? 1 : -1;
            const crossedRiver = color === 'r' ? row > 4 : row < 5;

            // Forward move
            if (row + forward >= 0 && row + forward < 10) {
                if (!board[row + forward][col] || board[row + forward][col][0] !== color) {
                    moves.push({ row: row + forward, col });
                }
            }

            // Horizontal moves (only after crossing river)
            if (crossedRiver) {
                if (col > 0 && (!board[row][col - 1] || board[row][col - 1][0] !== color)) {
                    moves.push({ row, col: col - 1 });
                }
                if (col < 8 && (!board[row][col + 1] || board[row][col + 1][0] !== color)) {
                    moves.push({ row, col: col + 1 });
                }
            }
            break;
    }

    return moves;
}

// Piece values for AI evaluation
const pieceValues = {
    '車': 9, '车': 9,
    '馬': 4, '马': 4,
    '炮': 4.5, '砲': 4.5,
    '象': 2, '相': 2,
    '士': 2, '仕': 2,
    '兵': 1, '卒': 1,
    '将': 6000, '帅': 6000
};

function getPieceValue(piece) {
    if (!piece) return 0;
    const pieceType = piece.substring(1);
    return pieceValues[pieceType] || 0;
}

function copyBoard(board) {
    return board.map(row => [...row]);
}

function makeMove(testBoard, fromRow, fromCol, toRow, toCol) {
    const newBoard = copyBoard(testBoard);
    newBoard[toRow][toCol] = newBoard[fromRow][fromCol];
    newBoard[fromRow][fromCol] = '';
    return newBoard;
}

function findGeneral(testBoard, color) {
    const generalPieces = color === 'b' ? ['b将', 'b帅'] : ['r将', 'r帅'];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (generalPieces.includes(testBoard[row][col])) {
                return { row, col };
            }
        }
    }
    return null;
}

function getValidMovesForBoard(testBoard, row, col) {
    const savedBoard = board;
    board = testBoard;
    const moves = getValidMoves(row, col);
    board = savedBoard;
    return moves;
}

function isPositionAttacked(testBoard, targetRow, targetCol, byColor) {
    // Check if position (targetRow, targetCol) is attacked by any piece of color 'byColor'
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = testBoard[row][col];
            if (piece && piece[0] === byColor) {
                const moves = getValidMovesForBoard(testBoard, row, col);
                if (moves.some(m => m.row === targetRow && m.col === targetCol)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isInCheck(testBoard, color) {
    const general = findGeneral(testBoard, color);
    if (!general) return true; // No general = lost
    const opponentColor = color === 'r' ? 'b' : 'r';
    return isPositionAttacked(testBoard, general.row, general.col, opponentColor);
}

function getAllPossibleMoves(testBoard, color) {
    const moves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = testBoard[row][col];
            if (piece && piece[0] === color) {
                const pieceMoves = getValidMovesForBoard(testBoard, row, col);
                pieceMoves.forEach(move => {
                    moves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        piece: piece
                    });
                });
            }
        }
    }
    return moves;
}

function evaluatePosition(testBoard, forColor) {
    let score = 0;

    // Material evaluation
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = testBoard[row][col];
            if (piece) {
                const value = getPieceValue(piece);
                if (piece[0] === forColor) {
                    score += value;
                } else {
                    score -= value;
                }
            }
        }
    }

    return score;
}

function getThreatenedPieces(testBoard, color) {
    // Find all pieces of 'color' that are under attack
    const threatened = [];
    const opponentColor = color === 'r' ? 'b' : 'r';

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = testBoard[row][col];
            if (piece && piece[0] === color) {
                if (isPositionAttacked(testBoard, row, col, opponentColor)) {
                    threatened.push({
                        row: row,
                        col: col,
                        piece: piece,
                        value: getPieceValue(piece)
                    });
                }
            }
        }
    }

    return threatened;
}

function evaluateMove(fromRow, fromCol, toRow, toCol) {
    const movingPiece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    // Simulate the move
    const newBoard = makeMove(board, fromRow, fromCol, toRow, toCol);

    // CRITICAL: If this move leaves us in check, it's illegal in real chess
    // Reject it completely
    if (isInCheck(newBoard, 'b')) {
        return -999999;
    }

    let score = 0;

    // HIGH PRIORITY: Capture opponent's general (instant win)
    if (targetPiece && (targetPiece === 'r将' || targetPiece === 'r帅')) {
        return 1000000;
    }

    // Check if we're currently in check - escaping check is TOP priority
    if (isInCheck(board, 'b')) {
        score += 5000; // Huge bonus for any move that gets us out of check
    }

    // DEFENSIVE: Check if Red can checkmate us on next move
    const redMoves = getAllPossibleMoves(newBoard, 'r');
    let redCanCheckmate = false;
    for (let move of redMoves) {
        const testBoard = makeMove(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
        if (isInCheck(testBoard, 'b')) {
            // Red puts us in check - can we escape?
            const ourEscapes = getAllPossibleMoves(testBoard, 'b');
            let canEscape = false;
            for (let escape of ourEscapes) {
                const escapeBoard = makeMove(testBoard, escape.fromRow, escape.fromCol, escape.toRow, escape.toCol);
                if (!isInCheck(escapeBoard, 'b')) {
                    canEscape = true;
                    break;
                }
            }
            if (!canEscape) {
                redCanCheckmate = true;
                // Check if this move prevents that checkmate
                // If we're capturing the threatening piece or blocking, big bonus
                if (targetPiece && move.fromRow === toRow && move.fromCol === toCol) {
                    score += 8000; // Capturing the threatening piece!
                } else {
                    score -= 7000; // This move doesn't prevent checkmate - bad!
                }
                break;
            }
        }
    }

    // DEFENSIVE: Evaluate what Red can capture after our move
    let worstLoss = 0;
    for (let move of redMoves) {
        const testBoard = makeMove(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
        const captured = newBoard[move.toRow][move.toCol];
        if (captured && captured[0] === 'b') {
            const lossValue = getPieceValue(captured);
            if (lossValue > worstLoss) {
                worstLoss = lossValue;
            }
        }
    }

    // Heavy penalty if Red can capture valuable pieces after this move
    if (worstLoss > 0) {
        score -= worstLoss * 80;
    }

    // OFFENSIVE: Evaluate material gain from capture
    if (targetPiece && targetPiece[0] === 'r') {
        const captureValue = getPieceValue(targetPiece);
        const movingValue = getPieceValue(movingPiece);

        // Check if the position we're moving to is safe
        const isDestinationSafe = !isPositionAttacked(newBoard, toRow, toCol, 'r');

        if (isDestinationSafe) {
            // Safe capture - full value
            score += captureValue * 120;

            // Extra bonus for capturing pieces that threaten us
            const threatenedBefore = getThreatenedPieces(board, 'b');
            const threatenedAfter = getThreatenedPieces(newBoard, 'b');
            if (threatenedAfter.length < threatenedBefore.length) {
                score += 200; // We reduced threats by capturing!
            }
        } else {
            // Risky capture - only do it if it's a good trade
            const tradeDiff = captureValue - movingValue;
            if (tradeDiff >= 3) {
                score += tradeDiff * 60; // Very good trade
            } else if (tradeDiff > 0) {
                score += tradeDiff * 30; // Good trade
            } else if (tradeDiff === 0) {
                score += 5; // Equal trade
            } else {
                score += tradeDiff * 150; // Bad trade - heavy penalty
            }
        }
    } else {
        // Non-capture move - check if destination is safe
        const isDestinationSafe = !isPositionAttacked(newBoard, toRow, toCol, 'r');
        if (!isDestinationSafe) {
            const movingValue = getPieceValue(movingPiece);
            score -= movingValue * 70; // Heavy penalty for moving to attacked square
        }
    }

    // DEFENSIVE: Check if we're saving a threatened piece
    const threatenedBefore = getThreatenedPieces(board, 'b');
    const threatenedAfter = getThreatenedPieces(newBoard, 'b');

    for (let threatened of threatenedBefore) {
        if (threatened.row === fromRow && threatened.col === fromCol) {
            // We moved a threatened piece
            const stillThreatened = threatenedAfter.find(t =>
                t.row === toRow && t.col === toCol
            );
            if (!stillThreatened) {
                score += threatened.value * 40; // Successfully saved the piece
            }
        }
    }

    // OFFENSIVE: Check if this move puts opponent in check
    if (isInCheck(newBoard, 'r')) {
        score += 400; // Big bonus for checking opponent

        // Extra bonus if opponent has no escape (checkmate)
        const opponentMoves = getAllPossibleMoves(newBoard, 'r');
        let hasEscape = false;
        for (let move of opponentMoves) {
            const testBoard = makeMove(newBoard, move.fromRow, move.fromCol, move.toRow, move.toCol);
            if (!isInCheck(testBoard, 'r')) {
                hasEscape = true;
                break;
            }
        }
        if (!hasEscape) {
            score += 800000; // Checkmate!
        }
    }

    // Positional evaluation
    const centerCols = [3, 4, 5];
    const centerRows = [3, 4, 5, 6];
    if (centerCols.includes(toCol) && centerRows.includes(toRow)) {
        score += 4;
    }

    // Advance pieces toward opponent
    if (toRow < fromRow) {
        score += 3;
    }

    // Protect general
    const ourGeneral = findGeneral(newBoard, 'b');
    if (ourGeneral) {
        const distance = Math.abs(toRow - ourGeneral.row) + Math.abs(toCol - ourGeneral.col);
        const movingValue = getPieceValue(movingPiece);
        if (movingValue >= 4 && distance <= 3) {
            score += 10; // Keep strong pieces near general
        }
    }

    // Small random for variety
    score += Math.random() * 0.1;

    return score;
}

function computerMove() {
    // Check if we're in check first
    const inCheck = isInCheck(board, 'b');

    // Get all possible moves
    const allMoves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece[0] === 'b') {
                const moves = getValidMoves(row, col);
                moves.forEach(move => {
                    const score = evaluateMove(row, col, move.row, move.col);
                    allMoves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        score: score
                    });
                });
            }
        }
    }

    // Filter out illegal moves (those that leave us in check)
    const legalMoves = allMoves.filter(m => m.score > -999999);

    if (legalMoves.length === 0) {
        console.log("No legal moves - checkmate!");
        return;
    }

    // Sort by score
    legalMoves.sort((a, b) => b.score - a.score);

    // If in check, must take the best escape move
    if (inCheck) {
        const move = legalMoves[0];
        movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
        return;
    }

    // Otherwise, choose from top moves with some variety
    const topMoves = legalMoves.slice(0, Math.min(5, legalMoves.length));
    const move = topMoves[Math.floor(Math.random() * topMoves.length)];

    movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
}

function checkGameOver() {
    let redGeneral = false;
    let blackGeneral = false;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece === 'r将' || piece === 'r帅') redGeneral = true;
            if (piece === 'b将' || piece === 'b帅') blackGeneral = true;
        }
    }

    if (!redGeneral) {
        alert('黑方胜利！Black wins!');
        resetGame();
    } else if (!blackGeneral) {
        alert('红方胜利！Red wins!');
        resetGame();
    }
}

function updateTurnDisplay() {
    const turnElement = document.getElementById('turn');
    turnElement.textContent = currentPlayer === 'r' ? '红方回合 (Red\'s Turn)' : '黑方回合 (Black\'s Turn)';
}

function resetGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    currentPlayer = 'r';
    selectedCell = null;
    validMoves = [];
    updateTurnDisplay();
    createBoard();
}

// Initialize the game when the page loads
createBoard();
