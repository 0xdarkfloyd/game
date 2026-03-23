const HUMAN_COLOR = 'r';
const AI_COLOR = 'b';
const MATE_SCORE = 900000;
const RED_NUMERALS = ['', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u4e03', '\u516b', '\u4e5d'];
const BLACK_NUMERALS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];

const PIECE_LABELS = {
    rR: '\u8eca',
    rH: '\u99ac',
    rE: '\u76f8',
    rA: '\u4ed5',
    rG: '\u5e25',
    rC: '\u70ae',
    rS: '\u5175',
    bR: '\u8eca',
    bH: '\u99ac',
    bE: '\u8c61',
    bA: '\u58eb',
    bG: '\u5c07',
    bC: '\u7832',
    bS: '\u5352'
};

const PIECE_VALUES = {
    G: 100000,
    R: 920,
    H: 430,
    E: 220,
    A: 220,
    C: 460,
    S: 110
};

const MOBILITY_WEIGHTS = {
    R: 5,
    H: 8,
    E: 1,
    A: 1,
    G: 0,
    C: 6,
    S: 3
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

const BOARD_SVG = buildBoardSvg();

let board = cloneBoard(initialBoard);
let currentPlayer = HUMAN_COLOR;
let selectedCell = null;
let validMoves = [];
let lastMove = null;
let gameActive = true;
let aiThinking = false;
let statusMessage = '\u4f60\u57f7\u7d05\u65b9\uff0c\u96fb\u8166\u57f7\u9ed1\u65b9\u3002';
let moveHistory = [];
let moveLog = [];

function cloneBoard(source) {
    return source.map(row => row.slice());
}

function otherColor(color) {
    return color === 'r' ? 'b' : 'r';
}

function colorName(color) {
    return color === 'r' ? '\u7d05\u65b9' : '\u9ed1\u65b9';
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

function countPieces(activeBoard) {
    let count = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col]) {
                count++;
            }
        }
    }

    return count;
}

function cloneMoveLog(entries) {
    return entries.map(entry => ({ ...entry }));
}

function getFileNumber(col) {
    return 9 - col;
}

function formatNumber(color, value) {
    return (color === 'r' ? RED_NUMERALS : BLACK_NUMERALS)[value];
}

function sameMove(left, right) {
    return Boolean(left) && Boolean(right) &&
        left.fromRow === right.fromRow &&
        left.fromCol === right.fromCol &&
        left.toRow === right.toRow &&
        left.toCol === right.toCol;
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
            const toRow = row + dr;
            const toCol = col + dc;
            const eyeRow = row + dr / 2;
            const eyeCol = col + dc / 2;

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

function countAttackersOnSquare(activeBoard, row, col, attackerColor) {
    let count = 0;
    let leastValue = Infinity;

    for (let scanRow = 0; scanRow < 10; scanRow++) {
        for (let scanCol = 0; scanCol < 9; scanCol++) {
            const piece = activeBoard[scanRow][scanCol];
            if (piece && piece[0] === attackerColor) {
                if (pieceThreatensSquare(activeBoard, scanRow, scanCol, row, col)) {
                    count++;
                    leastValue = Math.min(leastValue, PIECE_VALUES[piece[1]]);
                }
            }
        }
    }

    return {
        count,
        leastValue: count > 0 ? leastValue : 0
    };
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

function getCapturingMoves(activeBoard, color) {
    const tacticalMoves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (piece && piece[0] === color) {
                const legalMoves = getLegalMovesForPiece(activeBoard, row, col);
                for (const move of legalMoves) {
                    if (move.captured) {
                        tacticalMoves.push(move);
                    }
                }
            }
        }
    }
    return tacticalMoves;
}

function getPositionBonus(piece, row, col) {
    const color = piece[0];
    const type = piece[1];
    const centerDistance = Math.abs(4 - col);

    if (type === 'S') {
        const progress = color === 'r' ? 9 - row : row;
        let bonus = progress * 12;
        if (hasCrossedRiver(color, row)) {
            bonus += 26;
        }
        bonus += Math.max(0, 10 - centerDistance * 2);
        return bonus;
    }

    if (type === 'H' || type === 'C') {
        return Math.max(0, 22 - centerDistance * 4);
    }

    if (type === 'R') {
        return Math.max(0, 18 - centerDistance * 3);
    }

    if (type === 'E' || type === 'A') {
        const safeRank = color === 'r' ? row - 7 : 2 - row;
        return 12 - Math.abs(safeRank) * 4;
    }

    if (type === 'G') {
        return col === 4 ? 16 : 0;
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

            const baseScore = PIECE_VALUES[piece[1]] + getPositionBonus(piece, row, col);
            const mobility = getPseudoMoves(activeBoard, row, col).length * MOBILITY_WEIGHTS[piece[1]];
            const sign = piece[0] === AI_COLOR ? 1 : -1;

            score += sign * (baseScore + mobility);

            if (piece[1] === 'S' && hasCrossedRiver(piece[0], row)) {
                score += sign * 18;
            }
        }
    }

    if (isInCheck(activeBoard, HUMAN_COLOR)) {
        score += 55;
    }
    if (isInCheck(activeBoard, AI_COLOR)) {
        score -= 55;
    }

    return score;
}

function evaluateForColor(activeBoard, color) {
    const score = evaluateBoard(activeBoard);
    return color === AI_COLOR ? score : -score;
}

function scoreMove(activeBoard, move, ttMove) {
    if (sameMove(move, ttMove)) {
        return 10000000;
    }

    const capturedValue = move.captured ? PIECE_VALUES[move.captured[1]] : 0;
    const moverValue = PIECE_VALUES[move.piece[1]];
    let score = capturedValue * 14 - moverValue;

    if (move.captured && move.captured[1] === 'G') {
        score += MATE_SCORE;
    }
    if (move.piece[1] === 'S') {
        score += 12;
    }
    score += Math.max(0, 5 - Math.abs(4 - move.toCol)) * 6;
    return score;
}

function orderMoves(activeBoard, moves, ttMove) {
    return moves
        .slice()
        .sort((left, right) => scoreMove(activeBoard, right, ttMove) - scoreMove(activeBoard, left, ttMove));
}

function negamax(activeBoard, color, depth, alpha, beta) {
    const redGeneral = findGeneral(activeBoard, HUMAN_COLOR);
    const blackGeneral = findGeneral(activeBoard, AI_COLOR);
    if (!redGeneral) {
        return { score: color === AI_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }
    if (!blackGeneral) {
        return { score: color === HUMAN_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }

    if (depth === 0) {
        return { score: evaluateForColor(activeBoard, color) };
    }

    const legalMoves = orderMoves(activeBoard, getAllLegalMoves(activeBoard, color));
    if (legalMoves.length === 0) {
        return { score: isInCheck(activeBoard, color) ? -MATE_SCORE - depth : -3000 - depth };
    }

    const pieceCount = countPieces(activeBoard);
    let moveLimit = legalMoves.length;

    if (pieceCount >= 24) {
        moveLimit = depth >= 2 ? 14 : 18;
    } else if (pieceCount >= 16) {
        moveLimit = depth >= 3 ? 16 : legalMoves.length;
    }

    const candidateMoves = legalMoves.slice(0, moveLimit);
    let bestMove = candidateMoves[0];
    let bestScore = -Infinity;

    for (const move of candidateMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        const result = negamax(nextBoard, otherColor(color), depth - 1, -beta, -alpha);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        if (score > alpha) {
            alpha = score;
        }
        if (alpha >= beta) {
            break;
        }
    }

    return { score: bestScore, bestMove };
}

function chooseSearchDepth(activeBoard, legalMoves) {
    const pieceCount = countPieces(activeBoard);

    if (pieceCount <= 12) {
        return 4;
    }

    if (legalMoves.length >= 36 && pieceCount >= 24) {
        return 2;
    }

    if (pieceCount <= 22) {
        return 4;
    }

    if (pieceCount <= 28) {
        return 3;
    }

    return 3;
}

function chooseComputerMove(activeBoard, color = AI_COLOR) {
    const legalMoves = getAllLegalMoves(activeBoard, color);
    if (legalMoves.length === 0) {
        return null;
    }

    const depth = chooseSearchDepth(activeBoard, legalMoves);
    const result = negamax(activeBoard, color, depth, -Infinity, Infinity);
    return result.bestMove || orderMoves(activeBoard, legalMoves)[0];
}

function getPiecePrefix(activeBoard, piece, row, col) {
    const color = piece[0];
    const peerRows = [];

    for (let scanRow = 0; scanRow < 10; scanRow++) {
        if (activeBoard[scanRow][col] === piece) {
            peerRows.push(scanRow);
        }
    }

    if (peerRows.length <= 1) {
        return '';
    }

    peerRows.sort((left, right) => color === 'r' ? left - right : right - left);
    const index = peerRows.indexOf(row);

    if (peerRows.length === 2) {
        return index === 0 ? '\u524d' : '\u5f8c';
    }

    if (peerRows.length === 3) {
        return ['\u524d', '\u4e2d', '\u5f8c'][index] || '';
    }

    return formatNumber(color, index + 1);
}

function getMoveAction(color, move) {
    if (move.fromCol === move.toCol) {
        const forward = color === 'r' ? move.toRow < move.fromRow : move.toRow > move.fromRow;
        return forward ? '\u9032' : '\u9000';
    }

    if (move.fromRow === move.toRow) {
        return '\u5e73';
    }

    const forward = color === 'r' ? move.toRow < move.fromRow : move.toRow > move.fromRow;
    return forward ? '\u9032' : '\u9000';
}

function getMoveTarget(color, pieceType, move) {
    if (move.fromRow === move.toRow || pieceType === 'H' || pieceType === 'E' || pieceType === 'A') {
        return formatNumber(color, getFileNumber(move.toCol));
    }

    return formatNumber(color, Math.abs(move.toRow - move.fromRow));
}

function formatMoveNotation(activeBoard, move) {
    const piece = move.piece;
    const color = piece[0];
    const pieceName = PIECE_LABELS[piece];
    const prefix = getPiecePrefix(activeBoard, piece, move.fromRow, move.fromCol);
    const source = prefix || `${pieceName}${formatNumber(color, getFileNumber(move.fromCol))}`;
    const action = getMoveAction(color, move);
    const target = getMoveTarget(color, piece[1], move);

    return prefix
        ? `${prefix}${pieceName}${action}${target}`
        : `${source}${action}${target}`;
}

function appendMoveLog(notation, color) {
    if (color === HUMAN_COLOR) {
        moveLog.push({ red: notation, black: '' });
        return;
    }

    if (moveLog.length === 0 || moveLog[moveLog.length - 1].black) {
        moveLog.push({ red: '', black: notation });
        return;
    }

    moveLog[moveLog.length - 1].black = notation;
}

function getGameState(activeBoard, sideToMove) {
    const redGeneral = findGeneral(activeBoard, HUMAN_COLOR);
    const blackGeneral = findGeneral(activeBoard, AI_COLOR);

    if (!redGeneral) {
        return { winner: AI_COLOR, message: '\u9ed1\u65b9\u52dd\uff1a\u7d05\u5e25\u88ab\u5403\u3002' };
    }
    if (!blackGeneral) {
        return { winner: HUMAN_COLOR, message: '\u7d05\u65b9\u52dd\uff1a\u9ed1\u5c07\u88ab\u5403\u3002' };
    }

    const legalMoves = getAllLegalMoves(activeBoard, sideToMove);
    if (legalMoves.length > 0) {
        return null;
    }

    if (isInCheck(activeBoard, sideToMove)) {
        return {
            winner: otherColor(sideToMove),
            message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u88ab\u5c07\u6b7b\u3002`
        };
    }

    return {
        winner: otherColor(sideToMove),
        message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u7121\u5b50\u53ef\u52d5\u3002`
    };
}

function buildBoardSvg() {
    const stroke = '#6b2d14';
    const lines = [];

    for (let row = 0; row < 10; row++) {
        const y = row + 0.5;
        lines.push(`<line x1="0.5" y1="${y}" x2="8.5" y2="${y}" />`);
    }

    lines.push('<line x1="0.5" y1="0.5" x2="0.5" y2="9.5" />');
    lines.push('<line x1="8.5" y1="0.5" x2="8.5" y2="9.5" />');

    for (let col = 1; col <= 7; col++) {
        const x = col + 0.5;
        lines.push(`<line x1="${x}" y1="0.5" x2="${x}" y2="4.5" />`);
        lines.push(`<line x1="${x}" y1="5.5" x2="${x}" y2="9.5" />`);
    }

    lines.push('<line x1="3.5" y1="0.5" x2="5.5" y2="2.5" />');
    lines.push('<line x1="5.5" y1="0.5" x2="3.5" y2="2.5" />');
    lines.push('<line x1="3.5" y1="7.5" x2="5.5" y2="9.5" />');
    lines.push('<line x1="5.5" y1="7.5" x2="3.5" y2="9.5" />');

    const markerSpecs = [
        { row: 2, col: 1, left: true, right: true },
        { row: 2, col: 7, left: true, right: true },
        { row: 3, col: 0, left: false, right: true },
        { row: 3, col: 2, left: true, right: true },
        { row: 3, col: 4, left: true, right: true },
        { row: 3, col: 6, left: true, right: true },
        { row: 3, col: 8, left: true, right: false },
        { row: 6, col: 0, left: false, right: true },
        { row: 6, col: 2, left: true, right: true },
        { row: 6, col: 4, left: true, right: true },
        { row: 6, col: 6, left: true, right: true },
        { row: 6, col: 8, left: true, right: false },
        { row: 7, col: 1, left: true, right: true },
        { row: 7, col: 7, left: true, right: true }
    ];

    const markers = markerSpecs.map(drawMarker).join('');

    return `
<div class="board-surface">
    <svg class="board-svg" viewBox="0 0 9 10" aria-hidden="true" preserveAspectRatio="none">
        <rect x="0.12" y="0.12" width="8.76" height="9.76" rx="0.12" fill="none" stroke="${stroke}" stroke-width="0.06" />
        <g fill="none" stroke="${stroke}" stroke-width="0.05" stroke-linecap="round">
            ${lines.join('')}
        </g>
        <g fill="none" stroke="${stroke}" stroke-width="0.035" stroke-linecap="square">
            ${markers}
        </g>
        <text x="2.3" y="5.08" text-anchor="middle" fill="${stroke}" font-size="0.44" font-family="KaiTi, STKaiti, serif" letter-spacing="0.08em">
            \u695a\u6cb3
        </text>
        <text x="6.7" y="5.08" text-anchor="middle" fill="${stroke}" font-size="0.44" font-family="KaiTi, STKaiti, serif" letter-spacing="0.08em">
            \u6f22\u754c
        </text>
    </svg>
    <div class="board-grid"></div>
</div>`.trim();
}

function drawMarker({ row, col, left, right }) {
    const x = col + 0.5;
    const y = row + 0.5;
    const short = 0.12;
    const long = 0.22;
    const gap = 0.1;
    const segments = [];

    const appendCorner = (baseX, verticalSign, horizontalSign) => {
        segments.push(
            `<path d="M ${baseX} ${y + verticalSign * gap} l 0 ${verticalSign * short} M ${baseX} ${y + verticalSign * gap} l ${horizontalSign * long} 0" />`
        );
    };

    if (left) {
        appendCorner(x - gap, -1, 1);
        appendCorner(x - gap, 1, 1);
    }
    if (right) {
        appendCorner(x + gap, -1, -1);
        appendCorner(x + gap, 1, -1);
    }

    return segments.join('');
}

function createBoard() {
    if (typeof document === 'undefined') {
        return;
    }

    const boardElement = document.getElementById('board');
    boardElement.innerHTML = BOARD_SVG;
    const gridElement = boardElement.querySelector('.board-grid');

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(row);
            cell.dataset.col = String(col);

            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                cell.classList.add('selected');
            }
            if (lastMove && (
                (lastMove.fromRow === row && lastMove.fromCol === col) ||
                (lastMove.toRow === row && lastMove.toCol === col)
            )) {
                cell.classList.add('last-move');
            }

            const matchingMove = validMoves.find(move => move.toRow === row && move.toCol === col);
            if (matchingMove) {
                cell.classList.add(matchingMove.captured ? 'capture-move' : 'empty-move');
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
            gridElement.appendChild(cell);
        }
    }
}

function renderMoveLog() {
    if (typeof document === 'undefined') {
        return;
    }

    const moveLogElement = document.getElementById('move-log');
    if (!moveLogElement) {
        return;
    }

    if (moveLog.length === 0) {
        moveLogElement.innerHTML = '<div class="move-log-empty">\u5c0d\u5c40\u5c1a\u672a\u958b\u59cb\u8a18\u8b5c\u3002</div>';
        return;
    }

    moveLogElement.innerHTML = '';

    moveLog.forEach((entry, index) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'move-row';

        const indexElement = document.createElement('div');
        indexElement.className = 'move-index';
        indexElement.textContent = `${index + 1}.`;

        const redElement = document.createElement('div');
        redElement.className = `move-entry${entry.red ? '' : ' empty'}`;
        redElement.textContent = entry.red || '--';

        const blackElement = document.createElement('div');
        blackElement.className = `move-entry${entry.black ? '' : ' empty'}`;
        blackElement.textContent = entry.black || '--';

        rowElement.appendChild(indexElement);
        rowElement.appendChild(redElement);
        rowElement.appendChild(blackElement);
        moveLogElement.appendChild(rowElement);
    });

    moveLogElement.scrollTop = moveLogElement.scrollHeight;
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

function snapshotState() {
    return {
        board: cloneBoard(board),
        currentPlayer,
        lastMove: lastMove ? { ...lastMove } : null,
        gameActive,
        aiThinking,
        statusMessage,
        moveLog: cloneMoveLog(moveLog)
    };
}

function restoreState(snapshot) {
    board = cloneBoard(snapshot.board);
    currentPlayer = snapshot.currentPlayer;
    lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    gameActive = snapshot.gameActive;
    aiThinking = snapshot.aiThinking;
    statusMessage = snapshot.statusMessage;
    moveLog = cloneMoveLog(snapshot.moveLog || []);
    clearSelection();
    createBoard();
    renderMoveLog();
    updateStatus();
}

function updateStatus() {
    if (typeof document === 'undefined') {
        return;
    }

    const turnElement = document.getElementById('turn');
    const statusElement = document.getElementById('status');

    if (gameActive) {
        const suffix = aiThinking ? ' \u96fb\u8166\u601d\u8003\u4e2d...' : '';
        turnElement.textContent = `${colorName(currentPlayer)}\u56de\u5408`;
        statusElement.textContent = `${statusMessage}${suffix}`.trim();
    } else {
        turnElement.textContent = '\u5c0d\u5c40\u7d50\u675f';
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
        renderMoveLog();
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => window.alert(gameState.message), 20);
        }
        return;
    }

    statusMessage = isInCheck(board, currentPlayer)
        ? `${colorName(currentPlayer)}\u88ab\u5c07\u8ecd\u3002`
        : currentPlayer === HUMAN_COLOR
            ? '\u4f60\u57f7\u7d05\u65b9\uff0c\u96fb\u8166\u57f7\u9ed1\u65b9\u3002'
            : '\u9ed1\u65b9\u6b63\u5728\u627e\u6b65\u3002';

    createBoard();
    renderMoveLog();
    updateStatus();

    if (gameActive && currentPlayer === AI_COLOR) {
        aiThinking = true;
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(computerMove, 100);
        }
    }
}

function performMove(move) {
    moveHistory.push(snapshotState());
    appendMoveLog(formatMoveNotation(board, move), currentPlayer);
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

function undoMove() {
    if (aiThinking || moveHistory.length === 0) {
        return;
    }

    let steps = currentPlayer === HUMAN_COLOR ? 2 : 1;
    steps = Math.min(steps, moveHistory.length);

    let snapshot = null;
    while (steps > 0) {
        snapshot = moveHistory.pop();
        steps--;
    }

    if (snapshot) {
        restoreState(snapshot);
    }
}

function resetGame() {
    board = cloneBoard(initialBoard);
    currentPlayer = HUMAN_COLOR;
    selectedCell = null;
    validMoves = [];
    lastMove = null;
    gameActive = true;
    aiThinking = false;
    moveHistory = [];
    moveLog = [];
    statusMessage = '\u4f60\u57f7\u7d05\u65b9\uff0c\u96fb\u8166\u57f7\u9ed1\u65b9\u3002';
    createBoard();
    renderMoveLog();
    updateStatus();
}

if (typeof window !== 'undefined') {
    window.resetGame = resetGame;
    window.undoMove = undoMove;
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
        evaluateBoard,
        findGeneral,
        formatMoveNotation,
        getAllLegalMoves,
        getGameState,
        getLegalMovesForPiece,
        hasCrossedRiver,
        isInCheck,
        otherColor,
        countAttackersOnSquare,
        undoMove
    };
}
