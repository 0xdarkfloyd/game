const HUMAN_COLOR = 'r';
const AI_COLOR = 'b';

const PIECE_LABELS = {
    rR: '車',
    rH: '馬',
    rE: '相',
    rA: '仕',
    rG: '帥',
    rC: '炮',
    rS: '兵',
    bR: '車',
    bH: '馬',
    bE: '象',
    bA: '士',
    bG: '將',
    bC: '砲',
    bS: '卒'
};

const PIECE_VALUES = {
    G: 100000,
    R: 900,
    H: 420,
    E: 210,
    A: 210,
    C: 450,
    S: 100
};

const initialBoard = [
    ['bR', 'bH', 'bE', 'bA', 'bG', 'bA', 'bE', 'bH', 'bR'],
    ['', '', '', '', '', '', '', '', ''],
    ['', 'bC', '', '', '', '', '', 'bC', ''],
    ['bS', '', 'bS', '', 'bS', '', 'bS', '', 'bS'],
    ['', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['rS', '', 'rS', '', 'rS', '', 'rS', '', 'rS'],
    ['', 'rC', '', '', '', '', '', 'rC', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['rR', 'rH', 'rE', 'rA', 'rG', 'rA', 'rE', 'rH', 'rR']
];

let board = cloneBoard(initialBoard);
let currentPlayer = HUMAN_COLOR;
let selectedCell = null;
let validMoves = [];
let lastMove = null;
let gameActive = true;
let aiThinking = false;
let statusMessage = '你執紅方，電腦執黑方。';

function cloneBoard(source) {
    return source.map(row => row.slice());
}

function otherColor(color) {
    return color === 'r' ? 'b' : 'r';
}

function colorName(color) {
    return color === 'r' ? '紅方' : '黑方';
}

function isInsideBoard(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function isInsidePalace(color, row, col) {
    if (col < 3 || col > 5) {
        return false;
    }
    return color === 'r' ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
}

function hasCrossedRiver(color, row) {
    return color === 'r' ? row <= 4 : row >= 5;
}

function createMove(activeBoard, fromRow, fromCol, toRow, toCol) {
    return {
        fromRow,
        fromCol,
        toRow,
        toCol,
        piece: activeBoard[fromRow][fromCol],
        captured: activeBoard[toRow][toCol] || ''
    };
}

function applyMoveToBoard(activeBoard, move) {
    const nextBoard = cloneBoard(activeBoard);
    nextBoard[move.toRow][move.toCol] = nextBoard[move.fromRow][move.fromCol];
    nextBoard[move.fromRow][move.fromCol] = '';
    return nextBoard;
}

function findGeneral(activeBoard, color) {
    const target = `${color}G`;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col] === target) {
                return { row, col };
            }
        }
    }
    return null;
}

function clearPathStraight(activeBoard, fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow) {
        const step = fromCol < toCol ? 1 : -1;
        for (let col = fromCol + step; col !== toCol; col += step) {
            if (activeBoard[fromRow][col]) {
                return false;
            }
        }
        return true;
    }

    if (fromCol === toCol) {
        const step = fromRow < toRow ? 1 : -1;
        for (let row = fromRow + step; row !== toRow; row += step) {
            if (activeBoard[row][fromCol]) {
                return false;
            }
        }
        return true;
    }

    return false;
}

function countPiecesBetween(activeBoard, fromRow, fromCol, toRow, toCol) {
    let count = 0;

    if (fromRow === toRow) {
        const step = fromCol < toCol ? 1 : -1;
        for (let col = fromCol + step; col !== toCol; col += step) {
            if (activeBoard[fromRow][col]) {
                count++;
            }
        }
    } else if (fromCol === toCol) {
        const step = fromRow < toRow ? 1 : -1;
        for (let row = fromRow + step; row !== toRow; row += step) {
            if (activeBoard[row][fromCol]) {
                count++;
            }
        }
    }

    return count;
}

function getPseudoMoves(activeBoard, row, col) {
    const piece = activeBoard[row][col];
    if (!piece) {
        return [];
    }

    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const maybeAddMove = (toRow, toCol) => {
        if (!isInsideBoard(toRow, toCol)) {
            return;
        }
        const target = activeBoard[toRow][toCol];
        if (!target || target[0] !== color) {
            moves.push(createMove(activeBoard, row, col, toRow, toCol));
        }
    };

    if (type === 'R') {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of directions) {
            let nextRow = row + dr;
            let nextCol = col + dc;
            while (isInsideBoard(nextRow, nextCol)) {
                const target = activeBoard[nextRow][nextCol];
                if (!target) {
                    moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                } else {
                    if (target[0] !== color) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    }
                    break;
                }
                nextRow += dr;
                nextCol += dc;
            }
        }
        return moves;
    }

    if (type === 'H') {
        const horseOffsets = [
            [2, 1, 1, 0],
            [2, -1, 1, 0],
            [-2, 1, -1, 0],
            [-2, -1, -1, 0],
            [1, 2, 0, 1],
            [-1, 2, 0, 1],
            [1, -2, 0, -1],
            [-1, -2, 0, -1]
        ];
        for (const [dr, dc, legRow, legCol] of horseOffsets) {
            const blockRow = row + legRow;
            const blockCol = col + legCol;
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsideBoard(toRow, toCol) && !activeBoard[blockRow][blockCol]) {
                maybeAddMove(toRow, toCol);
            }
        }
        return moves;
    }

    if (type === 'E') {
        const elephantOffsets = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        for (const [dr, dc] of elephantOffsets) {
            const eyeRow = row + dr / 2;
            const eyeCol = col + dc / 2;
            const toRow = row + dr;
            const toCol = col + dc;
            if (!isInsideBoard(toRow, toCol) || activeBoard[eyeRow][eyeCol]) {
                continue;
            }
            if ((color === 'r' && toRow < 5) || (color === 'b' && toRow > 4)) {
                continue;
            }
            maybeAddMove(toRow, toCol);
        }
        return moves;
    }

    if (type === 'A') {
        const advisorOffsets = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of advisorOffsets) {
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsidePalace(color, toRow, toCol)) {
                maybeAddMove(toRow, toCol);
            }
        }
        return moves;
    }

    if (type === 'G') {
        const generalOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of generalOffsets) {
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsidePalace(color, toRow, toCol)) {
                maybeAddMove(toRow, toCol);
            }
        }

        const scanStep = color === 'r' ? -1 : 1;
        let scanRow = row + scanStep;
        while (scanRow >= 0 && scanRow < 10) {
            const target = activeBoard[scanRow][col];
            if (target) {
                if (target === `${otherColor(color)}G`) {
                    moves.push(createMove(activeBoard, row, col, scanRow, col));
                }
                break;
            }
            scanRow += scanStep;
        }

        return moves;
    }

    if (type === 'C') {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of directions) {
            let nextRow = row + dr;
            let nextCol = col + dc;
            let jumped = false;

            while (isInsideBoard(nextRow, nextCol)) {
                const target = activeBoard[nextRow][nextCol];
                if (!jumped) {
                    if (!target) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    } else {
                        jumped = true;
                    }
                } else if (target) {
                    if (target[0] !== color) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    }
                    break;
                }

                nextRow += dr;
                nextCol += dc;
            }
        }
        return moves;
    }

    if (type === 'S') {
        const forward = color === 'r' ? -1 : 1;
        maybeAddMove(row + forward, col);
        if (hasCrossedRiver(color, row)) {
            maybeAddMove(row, col - 1);
            maybeAddMove(row, col + 1);
        }
    }

    return moves;
}

function pieceThreatensSquare(activeBoard, fromRow, fromCol, targetRow, targetCol) {
    const piece = activeBoard[fromRow][fromCol];
    if (!piece) {
        return false;
    }

    const color = piece[0];
    const type = piece[1];
    const deltaRow = targetRow - fromRow;
    const deltaCol = targetCol - fromCol;

    if (type === 'R') {
        return (fromRow === targetRow || fromCol === targetCol) &&
            clearPathStraight(activeBoard, fromRow, fromCol, targetRow, targetCol);
    }

    if (type === 'H') {
        const horsePatterns = [
            [2, 1, 1, 0],
            [2, -1, 1, 0],
            [-2, 1, -1, 0],
            [-2, -1, -1, 0],
            [1, 2, 0, 1],
            [-1, 2, 0, 1],
            [1, -2, 0, -1],
            [-1, -2, 0, -1]
        ];
        return horsePatterns.some(([dr, dc, legRow, legCol]) => {
            if (deltaRow !== dr || deltaCol !== dc) {
                return false;
            }
            return !activeBoard[fromRow + legRow][fromCol + legCol];
        });
    }

    if (type === 'E') {
        const onOwnSide = color === 'r' ? targetRow >= 5 : targetRow <= 4;
        if (!onOwnSide || Math.abs(deltaRow) !== 2 || Math.abs(deltaCol) !== 2) {
            return false;
        }
        return !activeBoard[fromRow + deltaRow / 2][fromCol + deltaCol / 2];
    }

    if (type === 'A') {
        return Math.abs(deltaRow) === 1 &&
            Math.abs(deltaCol) === 1 &&
            isInsidePalace(color, targetRow, targetCol);
    }

    if (type === 'G') {
        if (Math.abs(deltaRow) + Math.abs(deltaCol) === 1 && isInsidePalace(color, targetRow, targetCol)) {
            return true;
        }
        return fromCol === targetCol &&
            activeBoard[targetRow][targetCol] &&
            activeBoard[targetRow][targetCol][1] === 'G' &&
            clearPathStraight(activeBoard, fromRow, fromCol, targetRow, targetCol);
    }

    if (type === 'C') {
        return (fromRow === targetRow || fromCol === targetCol) &&
            countPiecesBetween(activeBoard, fromRow, fromCol, targetRow, targetCol) === 1;
    }

    if (type === 'S') {
        const forward = color === 'r' ? -1 : 1;
        if (deltaRow === forward && deltaCol === 0) {
            return true;
        }
        return hasCrossedRiver(color, fromRow) &&
            deltaRow === 0 &&
            Math.abs(deltaCol) === 1;
    }

    return false;
}

function isSquareAttacked(activeBoard, row, col, attackerColor) {
    for (let scanRow = 0; scanRow < 10; scanRow++) {
        for (let scanCol = 0; scanCol < 9; scanCol++) {
            const piece = activeBoard[scanRow][scanCol];
            if (piece && piece[0] === attackerColor) {
                if (pieceThreatensSquare(activeBoard, scanRow, scanCol, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function isInCheck(activeBoard, color) {
    const general = findGeneral(activeBoard, color);
    if (!general) {
        return true;
    }
    return isSquareAttacked(activeBoard, general.row, general.col, otherColor(color));
}

function getLegalMovesForPiece(activeBoard, row, col) {
    const piece = activeBoard[row][col];
    if (!piece) {
        return [];
    }

    const color = piece[0];
    return getPseudoMoves(activeBoard, row, col).filter(move => {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        return !isInCheck(nextBoard, color);
    });
}

function getAllLegalMoves(activeBoard, color) {
    const allMoves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (piece && piece[0] === color) {
                allMoves.push(...getLegalMovesForPiece(activeBoard, row, col));
            }
        }
    }
    return allMoves;
}

function getPositionBonus(piece, row, col) {
    const color = piece[0];
    const type = piece[1];
    const centerDistance = Math.abs(4 - col);

    if (type === 'S') {
        const progress = color === 'r' ? 9 - row : row;
        let bonus = progress * 10;
        if (hasCrossedRiver(color, row)) {
            bonus += 30;
        }
        bonus += Math.max(0, 8 - centerDistance * 2);
        return bonus;
    }

    if (type === 'H' || type === 'C') {
        return Math.max(0, 20 - centerDistance * 4);
    }

    if (type === 'R') {
        return Math.max(0, 12 - centerDistance * 3);
    }

    if (type === 'G') {
        return col === 4 ? 12 : 0;
    }

    return 0;
}

function evaluateBoard(activeBoard) {
    let score = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece) {
                continue;
            }

            const pieceScore = PIECE_VALUES[piece[1]] + getPositionBonus(piece, row, col);
            score += piece[0] === AI_COLOR ? pieceScore : -pieceScore;
        }
    }

    if (isInCheck(activeBoard, HUMAN_COLOR)) {
        score += 40;
    }
    if (isInCheck(activeBoard, AI_COLOR)) {
        score -= 40;
    }

    return score;
}

function evaluateForColor(activeBoard, color) {
    const score = evaluateBoard(activeBoard);
    return color === AI_COLOR ? score : -score;
}

function scoreMove(move) {
    const capturedValue = move.captured ? PIECE_VALUES[move.captured[1]] : 0;
    const moverValue = PIECE_VALUES[move.piece[1]];
    let score = capturedValue * 12 - moverValue;

    if (move.captured && move.captured[1] === 'G') {
        score += 1000000;
    }

    if (move.piece[1] === 'S') {
        score += 8;
    }

    score += Math.max(0, 4 - Math.abs(4 - move.toCol));
    return score;
}

function orderMoves(moves) {
    return moves.slice().sort((a, b) => scoreMove(b) - scoreMove(a));
}

function negamax(activeBoard, color, depth, alpha, beta) {
    const redGeneral = findGeneral(activeBoard, HUMAN_COLOR);
    const blackGeneral = findGeneral(activeBoard, AI_COLOR);

    if (!redGeneral) {
        return { score: color === AI_COLOR ? 1000000 + depth : -1000000 - depth };
    }
    if (!blackGeneral) {
        return { score: color === HUMAN_COLOR ? 1000000 + depth : -1000000 - depth };
    }

    const legalMoves = orderMoves(getAllLegalMoves(activeBoard, color));
    if (legalMoves.length === 0) {
        return { score: -900000 - depth };
    }

    if (depth === 0) {
        return { score: evaluateForColor(activeBoard, color) };
    }

    let bestScore = -Infinity;
    let bestMove = legalMoves[0];

    for (const move of legalMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        const result = negamax(nextBoard, otherColor(color), depth - 1, -beta, -alpha);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }

        alpha = Math.max(alpha, score);
        if (alpha >= beta) {
            break;
        }
    }

    return { score: bestScore, bestMove };
}

function chooseSearchDepth(legalMoves) {
    if (legalMoves.length > 32) {
        return 2;
    }
    if (legalMoves.length > 18) {
        return 3;
    }
    return 4;
}

function chooseComputerMove(activeBoard, color = AI_COLOR) {
    const legalMoves = getAllLegalMoves(activeBoard, color);
    if (legalMoves.length === 0) {
        return null;
    }

    const depth = chooseSearchDepth(legalMoves);
    const result = negamax(activeBoard, color, depth, -Infinity, Infinity);
    return result.bestMove || orderMoves(legalMoves)[0];
}

function getGameState(activeBoard, sideToMove) {
    const redGeneral = findGeneral(activeBoard, HUMAN_COLOR);
    const blackGeneral = findGeneral(activeBoard, AI_COLOR);

    if (!redGeneral) {
        return { winner: AI_COLOR, message: '黑方勝：紅帥被吃。' };
    }
    if (!blackGeneral) {
        return { winner: HUMAN_COLOR, message: '紅方勝：黑將被吃。' };
    }

    const legalMoves = getAllLegalMoves(activeBoard, sideToMove);
    if (legalMoves.length > 0) {
        return null;
    }

    if (isInCheck(activeBoard, sideToMove)) {
        return {
            winner: otherColor(sideToMove),
            message: `${colorName(otherColor(sideToMove))}勝：${colorName(sideToMove)}被將死。`
        };
    }

    return {
        winner: otherColor(sideToMove),
        message: `${colorName(otherColor(sideToMove))}勝：${colorName(sideToMove)}無子可動。`
    };
}

function createBoard() {
    if (typeof document === 'undefined') {
        return;
    }

    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    for (let row = 0; row < 10; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'row';

        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(row);
            cell.dataset.col = String(col);

            if (row === 4) {
                cell.classList.add('river-top');
            }
            if (row === 5) {
                cell.classList.add('river-bottom');
            }
            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                cell.classList.add('selected');
            }
            if (validMoves.some(move => move.toRow === row && move.toCol === col)) {
                cell.classList.add('valid-move');
            }
            if (lastMove && (
                (lastMove.fromRow === row && lastMove.fromCol === col) ||
                (lastMove.toRow === row && lastMove.toCol === col)
            )) {
                cell.classList.add('last-move');
            }

            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = `piece ${piece[0] === 'r' ? 'red' : 'black'}`;
                pieceElement.textContent = PIECE_LABELS[piece];
                pieceElement.style.pointerEvents = 'none';
                cell.appendChild(pieceElement);
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            rowElement.appendChild(cell);
        }

        boardElement.appendChild(rowElement);
    }
}

function clearSelection() {
    selectedCell = null;
    validMoves = [];
}

function selectPiece(row, col) {
    selectedCell = { row, col };
    validMoves = getLegalMovesForPiece(board, row, col);
    createBoard();
}

function updateStatus() {
    if (typeof document === 'undefined') {
        return;
    }

    const turnElement = document.getElementById('turn');
    const statusElement = document.getElementById('status');

    if (gameActive) {
        const suffix = aiThinking ? ' 電腦思考中...' : '';
        turnElement.textContent = `${colorName(currentPlayer)}回合`;
        statusElement.textContent = `${statusMessage}${suffix}`.trim();
    } else {
        turnElement.textContent = '對局結束';
        statusElement.textContent = statusMessage;
    }
}

function finalizeMove() {
    const gameState = getGameState(board, currentPlayer);
    if (gameState) {
        gameActive = false;
        aiThinking = false;
        statusMessage = gameState.message;
        createBoard();
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => window.alert(gameState.message), 20);
        }
        return;
    }

    statusMessage = isInCheck(board, currentPlayer)
        ? `${colorName(currentPlayer)}被將軍。`
        : currentPlayer === HUMAN_COLOR
            ? '你執紅方，電腦執黑方。'
            : '黑方正在找步。';

    createBoard();
    updateStatus();

    if (gameActive && currentPlayer === AI_COLOR) {
        aiThinking = true;
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(computerMove, 180);
        }
    }
}

function performMove(move) {
    board = applyMoveToBoard(board, move);
    lastMove = move;
    currentPlayer = otherColor(currentPlayer);
    clearSelection();
    finalizeMove();
}

function handleCellClick(row, col) {
    if (!gameActive || aiThinking || currentPlayer !== HUMAN_COLOR) {
        return;
    }

    const piece = board[row][col];
    if (!selectedCell) {
        if (piece && piece[0] === HUMAN_COLOR) {
            selectPiece(row, col);
        }
        return;
    }

    const chosenMove = validMoves.find(move => move.toRow === row && move.toCol === col);
    if (chosenMove) {
        performMove(chosenMove);
        return;
    }

    if (piece && piece[0] === HUMAN_COLOR) {
        selectPiece(row, col);
        return;
    }

    clearSelection();
    createBoard();
}

function computerMove() {
    if (!gameActive || currentPlayer !== AI_COLOR) {
        aiThinking = false;
        updateStatus();
        return;
    }

    const move = chooseComputerMove(board, AI_COLOR);
    aiThinking = false;

    if (!move) {
        finalizeMove();
        return;
    }

    performMove(move);
}

function resetGame() {
    board = cloneBoard(initialBoard);
    currentPlayer = HUMAN_COLOR;
    selectedCell = null;
    validMoves = [];
    lastMove = null;
    gameActive = true;
    aiThinking = false;
    statusMessage = '你執紅方，電腦執黑方。';
    createBoard();
    updateStatus();
}

if (typeof window !== 'undefined') {
    window.resetGame = resetGame;
    resetGame();
}

if (typeof module !== 'undefined') {
    module.exports = {
        AI_COLOR,
        HUMAN_COLOR,
        initialBoard,
        applyMoveToBoard,
        chooseComputerMove,
        cloneBoard,
        createMove,
        findGeneral,
        getAllLegalMoves,
        getGameState,
        getLegalMovesForPiece,
        hasCrossedRiver,
        isInCheck,
        otherColor
    };
}
