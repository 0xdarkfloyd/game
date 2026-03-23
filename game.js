const RED_COLOR = 'r';
const BLACK_COLOR = 'b';
const MATE_SCORE = 900000;
const SEARCH_ABORT = Symbol('search-abort');
const QUIESCENCE_DEPTH = 3;
const AI_THINK_DELAY_MS = 260;
const MOVE_ANIMATION_MS = 220;
const NODE_CHECK_INTERVAL = 1;
const MAIN_THREAD_FALLBACK_CANDIDATES = 10;
const MAIN_THREAD_FALLBACK_REPLIES = 8;
const RED_NUMERALS = ['', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u4e03', '\u516b', '\u4e5d'];
const BLACK_NUMERALS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const OPENING_BOOK = {
    [`${RED_COLOR}|`]: [
        { fromRow: 7, fromCol: 7, toRow: 7, toCol: 4, name: '\u4e2d\u70ae' },
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u8d77\u99ac\u5c40' },
        { fromRow: 9, fromCol: 6, toRow: 7, toCol: 4, name: '\u98db\u76f8\u5c40' }
    ],
    [`${BLACK_COLOR}|6,2-5,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u99ac8\u90327' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u99ac2\u90323' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|6,6-5,6`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u99ac2\u90323' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u99ac8\u90327' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u5c4f\u98a8\u99ac' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u5c4f\u98a8\u99ac' },
        { fromRow: 2, fromCol: 1, toRow: 2, toCol: 4, name: '\u9806\u70ae' }
    ],
    [`${BLACK_COLOR}|7,1-7,4`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' }
    ],
    [`${RED_COLOR}|7,1-7,4/0,1-2,2`]: [
        { fromRow: 9, fromCol: 1, toRow: 7, toCol: 2, name: '\u99ac\u516b\u9032\u4e03' },
        { fromRow: 9, fromCol: 0, toRow: 9, toCol: 1, name: '\u8eca\u4e5d\u5e73\u516b' },
        { fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, name: '\u5175\u4e03\u9032\u4e00' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,1-2,2/9,1-7,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,1-2,2/6,2-5,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,1-2,2/6,6-5,6`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,1-2,2/6,4-5,4`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,1-2,2/9,8-9,7`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${RED_COLOR}|7,7-7,4/0,1-2,2`]: [
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u99ac\u4e8c\u9032\u4e09' },
        { fromRow: 6, fromCol: 6, toRow: 5, toCol: 6, name: '\u5175\u4e03\u9032\u4e00' },
        { fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, name: '\u5175\u4e03\u9032\u4e00' },
        { fromRow: 9, fromCol: 8, toRow: 9, toCol: 7, name: '\u8eca\u4e00\u5e73\u4e8c' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,7-7,6`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,6-5,6`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,4-5,4`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,8-9,7`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${RED_COLOR}|7,7-7,4/0,7-2,6`]: [
        { fromRow: 9, fromCol: 1, toRow: 7, toCol: 2, name: '\u99ac\u516b\u9032\u4e03' },
        { fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, name: '\u5175\u4e03\u9032\u4e00' },
        { fromRow: 6, fromCol: 6, toRow: 5, toCol: 6, name: '\u5175\u4e03\u9032\u4e00' },
        { fromRow: 9, fromCol: 0, toRow: 9, toCol: 1, name: '\u8eca\u4e5d\u5e73\u516b' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/9,1-7,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/6,2-5,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/6,6-5,6`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/6,4-5,4`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/9,0-9,1`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|9,7-7,6`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u8d77\u99ac\u5c0d\u5c4f\u98a8\u99ac' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u8d77\u99ac\u5c0d\u8d77\u99ac' }
    ],
    [`${BLACK_COLOR}|9,6-7,4`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u98db\u76f8\u5c0d\u5c4f\u98a8\u99ac' },
        { fromRow: 2, fromCol: 7, toRow: 2, toCol: 4, name: '\u5217\u70ae' }
    ],
    [`${RED_COLOR}|9,7-7,6/0,1-2,2`]: [
        { fromRow: 7, fromCol: 7, toRow: 7, toCol: 4, name: '\u8d77\u99ac\u5f8c\u8f49\u4e2d\u70ae' },
        { fromRow: 9, fromCol: 1, toRow: 7, toCol: 2, name: '\u96d9\u99ac' }
    ]
};

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

const PHASED_PIECE_VALUES = {
    R: { opening: 940, endgame: 900 },
    H: { opening: 410, endgame: 470 },
    E: { opening: 230, endgame: 200 },
    A: { opening: 230, endgame: 205 },
    C: { opening: 500, endgame: 390 },
    S: { opening: 100, endgame: 150 }
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
let humanColor = RED_COLOR;
let computerColor = BLACK_COLOR;
let currentPlayer = RED_COLOR;
let selectedCell = null;
let validMoves = [];
let lastMove = null;
let gameActive = true;
let aiThinking = false;
let statusMessage = '';
let moveHistory = [];
let moveLog = [];
let moveSequence = [];
let positionHistory = [];
let pendingAnimatedMove = null;
let audioContext = null;
const transpositionTable = new Map();
let searchDeadline = Infinity;
let searchNodeCounter = 0;
let aiWorker = null;
let aiTurnToken = 0;
let aiWorkerRequestId = 0;

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

function cloneMoveSequence(entries) {
    return entries.slice();
}

function clonePositionHistory(entries) {
    return entries.slice();
}

function getFileNumber(col) {
    return 9 - col;
}

function formatNumber(color, value) {
    return (color === RED_COLOR ? RED_NUMERALS : BLACK_NUMERALS)[value];
}

function getOpeningBookKey(color, historySequence) {
    return `${color}|${historySequence.join('/')}`;
}

function getMoveKey(move) {
    return `${move.fromRow},${move.fromCol}-${move.toRow},${move.toCol}`;
}

function mirrorCol(col) {
    return 8 - col;
}

function mirrorMoveDescriptor(move) {
    return {
        ...move,
        fromCol: mirrorCol(move.fromCol),
        toCol: mirrorCol(move.toCol)
    };
}

function mirrorMoveKey(moveKey) {
    return getMoveKey(mirrorMoveDescriptor(parseMoveKey(moveKey)));
}

function parseMoveKey(moveKey) {
    const [fromPart, toPart] = moveKey.split('-');
    const [fromRow, fromCol] = fromPart.split(',').map(Number);
    const [toRow, toCol] = toPart.split(',').map(Number);
    return { fromRow, fromCol, toRow, toCol };
}

function getStartStatusMessage() {
    return `${humanColor === RED_COLOR ? '\u4f60\u57f7\u7d05\u65b9\uff08\u5148\u624b\uff09' : '\u4f60\u57f7\u9ed1\u65b9\uff08\u5f8c\u624b\uff09'}\uff0c${computerColor === RED_COLOR ? '\u96fb\u8166\u57f7\u7d05\u65b9' : '\u96fb\u8166\u57f7\u9ed1\u65b9'}\u3002`;
}

function updateSideButtons() {
    if (typeof document === 'undefined') {
        return;
    }

    const redButton = document.getElementById('side-red');
    const blackButton = document.getElementById('side-black');
    if (!redButton || !blackButton) {
        return;
    }

    redButton.classList.toggle('active', humanColor === RED_COLOR);
    blackButton.classList.toggle('active', humanColor === BLACK_COLOR);
}

function getNow() {
    return typeof performance !== 'undefined' ? performance.now() : Date.now();
}

function shouldAbortSearch() {
    searchNodeCounter++;
    return searchNodeCounter % NODE_CHECK_INTERVAL === 0 && getNow() >= searchDeadline;
}

function getSearchTimeLimit(activeBoard, legalMoves) {
    const pieceCount = countPieces(activeBoard);

    if (legalMoves.length >= 36 || pieceCount >= 28) {
        return 120;
    }

    if (pieceCount >= 20) {
        return 180;
    }

    return 260;
}

function getBoardKey(activeBoard, color) {
    return `${color}|${activeBoard.map(row => row.map(cell => cell || '__').join('')).join('/')}`;
}

function stopAiWorker() {
    if (!aiWorker) {
        return;
    }

    aiWorker.terminate();
    aiWorker = null;
}

function getAiWorker() {
    if (typeof Worker === 'undefined') {
        return null;
    }

    if (!aiWorker) {
        try {
            aiWorker = new Worker('ai-worker.js');
        } catch (error) {
            aiWorker = null;
        }
    }

    return aiWorker;
}

function requestComputerMove(activeBoard, color, historySequence, positionKeys) {
    const worker = getAiWorker();
    const fallbackMove = findOpeningBookMove(activeBoard, color, historySequence)
        || filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionKeys)[0]
        || null;
    const runMainThreadFallback = () => {
        try {
            return chooseComputerMoveLite(
                activeBoard,
                color,
                historySequence,
                positionKeys
            ) || fallbackMove;
        } catch (error) {
            return fallbackMove;
        }
    };

    if (!worker) {
        return new Promise(resolve => {
            window.setTimeout(() => resolve(runMainThreadFallback()), 0);
        });
    }

    const requestId = ++aiWorkerRequestId;

    return new Promise(resolve => {
        let settled = false;
        let timeoutId = null;

        const cleanup = () => {
            if (timeoutId) {
                window.clearTimeout(timeoutId);
            }
            worker.removeEventListener('message', onMessage);
            worker.removeEventListener('error', onError);
        };

        const finish = move => {
            if (settled) {
                return;
            }
            settled = true;
            cleanup();
            resolve(move || fallbackMove);
        };

        const onMessage = event => {
            if (!event.data || event.data.requestId !== requestId) {
                return;
            }
            finish(event.data.move || null);
        };

        const onError = () => {
            stopAiWorker();
            finish(runMainThreadFallback());
        };

        worker.addEventListener('message', onMessage);
        worker.addEventListener('error', onError);
        timeoutId = window.setTimeout(() => {
            stopAiWorker();
            finish(runMainThreadFallback());
        }, 1000);

        try {
            worker.postMessage({
                requestId,
                board: activeBoard,
                color,
                historySequence,
                positionKeys
            });
        } catch (error) {
            stopAiWorker();
            finish(runMainThreadFallback());
        }
    });
}

function getPieceTransform(shiftX = 0, shiftY = 0) {
    const translate = `translate(calc(-50% + ${shiftX}px), calc(-50% + ${shiftY}px))`;
    return humanColor === BLACK_COLOR ? `${translate} rotate(180deg)` : translate;
}

function ensureAudioContext() {
    if (typeof window === 'undefined') {
        return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioCtor();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }

    return audioContext;
}

function playTone(frequency, duration, type, gainValue, startAt = 0) {
    const context = ensureAudioContext();
    if (!context) {
        return;
    }

    const now = context.currentTime + startAt;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
}

function playMoveSound(move) {
    if (move.captured) {
        playTone(196, 0.14, 'triangle', 0.07);
        playTone(156, 0.18, 'square', 0.035, 0.03);
        return;
    }

    playTone(330, 0.08, 'triangle', 0.05);
    playTone(440, 0.06, 'sine', 0.02, 0.04);
}

function playCheckSound() {
    playTone(587, 0.12, 'sawtooth', 0.045);
    playTone(784, 0.18, 'triangle', 0.03, 0.05);
}

function playWinSound() {
    playTone(523, 0.12, 'triangle', 0.04);
    playTone(659, 0.14, 'triangle', 0.04, 0.08);
    playTone(784, 0.22, 'triangle', 0.05, 0.16);
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

function isPerpetualCheckViolation(activeBoard, move, color, history = positionHistory) {
    if (!history || history.length < 4) {
        return false;
    }

    const nextBoard = applyMoveToBoard(activeBoard, move);
    const opponent = otherColor(color);
    if (!isInCheck(nextBoard, opponent)) {
        return false;
    }

    const nextKey = getBoardKey(nextBoard, opponent);
    let occurrences = 0;
    for (const key of history) {
        if (key === nextKey) {
            occurrences++;
            if (occurrences >= 2) {
                return true;
            }
        }
    }

    return false;
}

function filterPlayableMoves(activeBoard, color, moves, history = positionHistory) {
    return moves.filter(move => !isPerpetualCheckViolation(activeBoard, move, color, history));
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
        let bonus = progress * 10;
        if (hasCrossedRiver(color, row)) {
            bonus += 18;
        }
        bonus += Math.max(0, 8 - centerDistance * 2);
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

function buildPieceCounts(activeBoard) {
    const counts = {
        r: { R: 0, H: 0, E: 0, A: 0, G: 0, C: 0, S: 0 },
        b: { R: 0, H: 0, E: 0, A: 0, G: 0, C: 0, S: 0 }
    };

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (piece) {
                counts[piece[0]][piece[1]]++;
            }
        }
    }

    return counts;
}

function getOpeningPhase(counts) {
    const force =
        (counts.r.R + counts.b.R) * 4 +
        (counts.r.H + counts.b.H + counts.r.C + counts.b.C) * 2 +
        (counts.r.S + counts.b.S);

    return Math.max(0, Math.min(1, force / 26));
}

function getPieceValueByPhase(type, openingPhase) {
    if (type === 'G') {
        return PIECE_VALUES.G;
    }

    const phased = PHASED_PIECE_VALUES[type];
    if (!phased) {
        return PIECE_VALUES[type];
    }

    const value = phased.endgame + (phased.opening - phased.endgame) * openingPhase;
    return Math.round(value);
}

function evaluateGeneralSafety(activeBoard, color, counts, openingPhase) {
    const general = findGeneral(activeBoard, color);
    if (!general) {
        return -MATE_SCORE;
    }

    const guards = counts[color].A;
    const elephants = counts[color].E;
    const attackers = countAttackersOnSquare(activeBoard, general.row, general.col, otherColor(color));
    const forward = color === RED_COLOR ? -1 : 1;
    const frontRow = general.row + forward;
    let score = Math.round((guards * 20 + elephants * 16 + (general.col === 4 ? 10 : 0)) * (0.45 + openingPhase * 0.8));

    if (isInsideBoard(frontRow, general.col) && !activeBoard[frontRow][general.col]) {
        score -= Math.round(8 + openingPhase * 18);
    }

    score -= attackers.count * Math.round(18 + openingPhase * 24);
    return score;
}

function evaluateLinePressure(activeBoard, color) {
    const enemyGeneral = findGeneral(activeBoard, otherColor(color));
    if (!enemyGeneral) {
        return 0;
    }

    let score = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece || piece[0] !== color) {
                continue;
            }

            if (piece[1] !== 'R' && piece[1] !== 'C') {
                continue;
            }

            if (col === enemyGeneral.col) {
                const between = countPiecesBetween(activeBoard, row, col, enemyGeneral.row, enemyGeneral.col);
                if (piece[1] === 'R' && between === 0) {
                    score += 28;
                } else if (piece[1] === 'C' && between === 1) {
                    score += 24;
                }
            } else if (row === enemyGeneral.row) {
                const between = countPiecesBetween(activeBoard, row, col, enemyGeneral.row, enemyGeneral.col);
                if (piece[1] === 'R' && between === 0) {
                    score += 12;
                } else if (piece[1] === 'C' && between === 1) {
                    score += 10;
                }
            }
        }
    }

    return score;
}

function evaluateSoldierStructure(activeBoard, color, counts, openingPhase) {
    let score = 0;
    const endgameFactor = 1 - openingPhase;
    const enemyDefense = counts[otherColor(color)].A + counts[otherColor(color)].E;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col] !== `${color}S`) {
                continue;
            }

            if (hasCrossedRiver(color, row)) {
                score += Math.round(8 + endgameFactor * 14);
            }

            const deepAdvance = color === RED_COLOR ? row <= 3 : row >= 6;
            if (deepAdvance) {
                score += Math.round(6 + endgameFactor * (14 + (4 - enemyDefense) * 3));
            }

            const left = col > 0 && activeBoard[row][col - 1] === `${color}S`;
            const right = col < 8 && activeBoard[row][col + 1] === `${color}S`;
            if (left || right) {
                score += Math.round(4 + endgameFactor * 6);
            }
        }
    }

    return score;
}

function evaluateDevelopment(activeBoard, color, openingPhase) {
    if (openingPhase <= 0.2) {
        return 0;
    }

    const homeRow = color === RED_COLOR ? 9 : 0;
    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    let score = -Math.round(undevelopedMajors * (8 + openingPhase * 10));

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece || piece[0] !== color) {
                continue;
            }

            if (piece[1] === 'H' && row !== homeRow) {
                score += Math.round(14 + openingPhase * 10);
            }

            if (piece[1] === 'R' && (row !== homeRow || col !== 0 && col !== 8)) {
                score += Math.round(10 + openingPhase * 8);
            }

            if (piece[1] === 'C') {
                const deepRaid = color === RED_COLOR ? row <= 3 : row >= 6;
                const crossedRiver = color === RED_COLOR ? row <= 4 : row >= 5;
                const enemyHomeRow = color === RED_COLOR ? 0 : 9;
                const wingRaid = col <= 1 || col >= 7;

                if (crossedRiver) {
                    score -= Math.round(6 + openingPhase * 8);
                }

                if (deepRaid) {
                    score -= Math.round(20 + openingPhase * 18 + undevelopedMajors * 8);
                }

                if (wingRaid && deepRaid) {
                    score -= Math.round(10 + openingPhase * 14 + undevelopedMajors * 6);
                }

                if (row === enemyHomeRow && wingRaid) {
                    score -= Math.round(18 + openingPhase * 18 + undevelopedMajors * 10);
                }

                if (openingPhase > 0.35 && (deepRaid || row === enemyHomeRow)) {
                    const attackers = countAttackersOnSquare(activeBoard, row, col, otherColor(color));
                    const defenders = countAttackersOnSquare(activeBoard, row, col, color);

                    if (attackers.count > defenders.count) {
                        score -= Math.round(70 + openingPhase * 80 + undevelopedMajors * 14);
                    } else if (attackers.count > 0 && defenders.count === 0) {
                        score -= Math.round(48 + openingPhase * 60 + undevelopedMajors * 10);
                    }
                }

                if (undevelopedMajors >= 2 && row !== (color === RED_COLOR ? 7 : 2) && col !== 4) {
                    score -= Math.round(10 + openingPhase * 10);
                }
            }
        }
    }

    return score;
}

function evaluateBoard(activeBoard) {
    let score = 0;
    const counts = buildPieceCounts(activeBoard);
    const openingPhase = getOpeningPhase(counts);

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece) {
                continue;
            }

            const baseScore = getPieceValueByPhase(piece[1], openingPhase) + getPositionBonus(piece, row, col);
            const mobility = getPseudoMoves(activeBoard, row, col).length * MOBILITY_WEIGHTS[piece[1]];
            const sign = piece[0] === computerColor ? 1 : -1;

            score += sign * (baseScore + mobility);
        }
    }

    score += evaluateLinePressure(activeBoard, computerColor);
    score -= evaluateLinePressure(activeBoard, humanColor);
    score += evaluateGeneralSafety(activeBoard, computerColor, counts, openingPhase);
    score -= evaluateGeneralSafety(activeBoard, humanColor, counts, openingPhase);
    score += evaluateSoldierStructure(activeBoard, computerColor, counts, openingPhase);
    score -= evaluateSoldierStructure(activeBoard, humanColor, counts, openingPhase);
    score += evaluateDevelopment(activeBoard, computerColor, openingPhase);
    score -= evaluateDevelopment(activeBoard, humanColor, openingPhase);

    if (isInCheck(activeBoard, humanColor)) {
        score += 55;
    }
    if (isInCheck(activeBoard, computerColor)) {
        score -= 55;
    }

    return score;
}

function evaluateForColor(activeBoard, color) {
    const score = evaluateBoard(activeBoard);
    return color === computerColor ? score : -score;
}

function getSearchMoveLimit(pieceCount, depth, tacticalOnly = false) {
    if (tacticalOnly) {
        return pieceCount >= 24 ? 10 : 14;
    }

    if (pieceCount >= 28) {
        return depth >= 3 ? 12 : 16;
    }

    if (pieceCount >= 22) {
        return depth >= 4 ? 14 : 18;
    }

    if (pieceCount >= 16) {
        return depth >= 4 ? 16 : 22;
    }

    return 28;
}

function getOpeningMoveBonus(move) {
    if (moveSequence.length >= 10) {
        return 0;
    }

    const color = move.piece[0];
    const homeRow = color === RED_COLOR ? 9 : 0;
    const cannonRow = color === RED_COLOR ? 7 : 2;
    const deepRaid = color === RED_COLOR ? move.toRow <= 2 : move.toRow >= 7;
    let bonus = 0;

    if (move.piece[1] === 'H' && move.fromRow === homeRow) {
        bonus += 30;
    }

    if (move.piece[1] === 'R' && move.fromRow === homeRow && move.fromRow === move.toRow) {
        bonus += 28;
    }

    if (move.piece[1] === 'C' && move.fromRow === cannonRow && move.fromRow === move.toRow) {
        if (move.toCol === 4) {
            bonus += 20;
        }
    }

    if ((move.piece[1] === 'A' || move.piece[1] === 'E') && moveSequence.length <= 4) {
        bonus -= 24;
    }

    if (move.piece[1] === 'C' && move.captured && deepRaid && moveSequence.length <= 6) {
        bonus -= 140;
    }

    return bonus;
}

function getRecentMovePenalty(historySequence, move, color) {
    if (!historySequence || historySequence.length < 2) {
        return 0;
    }

    const isRedTurn = color === RED_COLOR;
    const sideMoves = historySequence.filter((_, index) => (index % 2 === 0) === isRedTurn);
    if (sideMoves.length === 0) {
        return 0;
    }

    const moveKey = getMoveKey(move);
    const reverseKey = `${move.toRow},${move.toCol}-${move.fromRow},${move.fromCol}`;
    let penalty = 0;
    const lastSideMove = sideMoves[sideMoves.length - 1];
    const previousSideMove = sideMoves[sideMoves.length - 2];

    if (lastSideMove === reverseKey) {
        penalty += 120;
    }

    if (previousSideMove === moveKey) {
        penalty += 45;
    }

    if (sideMoves.slice(-4).includes(moveKey)) {
        penalty += 28;
    }

    return penalty;
}

function getHorseRetreatPenalty(move) {
    if (move.piece[1] !== 'H' || move.captured) {
        return 0;
    }

    const retreating = move.piece[0] === RED_COLOR
        ? move.toRow > move.fromRow
        : move.toRow < move.fromRow;

    if (!retreating) {
        return 0;
    }

    let penalty = 34;
    const homeBand = move.piece[0] === RED_COLOR ? move.toRow >= 7 : move.toRow <= 2;
    if (homeBand) {
        penalty += 18;
    }

    return penalty;
}

function getCannonTempoPenalty(activeBoard, historySequence, move, color) {
    if (move.piece[1] !== 'C' || move.captured) {
        return 0;
    }

    const plyCount = historySequence?.length || moveSequence.length;
    if (plyCount > 18) {
        return 0;
    }

    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    const baseRow = color === RED_COLOR ? 7 : 2;
    const retreating = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
    let penalty = 0;

    if (move.fromRow === baseRow && move.toRow !== baseRow) {
        penalty += 18 + undevelopedMajors * 8;
    }

    if (move.toRow === baseRow && move.fromRow !== baseRow) {
        penalty += 26 + undevelopedMajors * 10;
    }

    if (move.fromRow === move.toRow && move.toCol !== 4) {
        penalty += 12 + undevelopedMajors * 6;
    }

    if (retreating) {
        penalty += 18;
    }

    return penalty;
}

function getPrematureCannonRaidPenalty(activeBoard, historySequence, move, color) {
    if (move.piece[1] !== 'C' || !move.captured) {
        return 0;
    }

    const plyCount = historySequence?.length || moveSequence.length;
    if (plyCount > 16) {
        return 0;
    }

    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    const enemyColor = otherColor(color);
    const enemyHomeRow = enemyColor === RED_COLOR ? 9 : 0;
    const deepRaid = color === RED_COLOR ? move.toRow <= 3 : move.toRow >= 6;
    const wingRaid = move.toCol <= 1 || move.toCol >= 7;
    const capturedValue = PIECE_VALUES[move.captured[1]];
    let penalty = 0;

    if (deepRaid) {
        penalty += 90 + undevelopedMajors * 24;
    }

    if (wingRaid) {
        penalty += 70 + undevelopedMajors * 18;
    }

    if (move.captured[1] === 'H') {
        penalty += 110 + undevelopedMajors * 20;
    }

    if (move.toRow === enemyHomeRow && wingRaid) {
        penalty += 160;

        const cornerCol = move.toCol <= 1 ? 0 : 8;
        if (activeBoard[enemyHomeRow][cornerCol] === `${enemyColor}R`) {
            penalty += 180;
        }
    }

    if (deepRaid && wingRaid) {
        penalty += Math.round(capturedValue * 4.5);
    }

    if (move.captured[1] === 'H' && move.toRow === enemyHomeRow && wingRaid && undevelopedMajors >= 2) {
        penalty += capturedValue * 8;
    }

    const enemySupporters = countAttackersOnSquare(activeBoard, move.toRow, move.toCol, enemyColor);
    const localSupport = countAttackersOnSquare(activeBoard, move.fromRow, move.fromCol, color);

    if (enemySupporters.count >= 2 && localSupport.count === 0) {
        penalty += 220 + undevelopedMajors * 28 + capturedValue;
    } else if (enemySupporters.count > 0 && localSupport.count === 0) {
        penalty += 120 + undevelopedMajors * 16;
    }

    return penalty;
}

function countUndevelopedMajors(activeBoard, color) {
    const homeRow = color === RED_COLOR ? 9 : 0;
    let count = 0;

    if (activeBoard[homeRow][1] === `${color}H`) {
        count++;
    }
    if (activeBoard[homeRow][7] === `${color}H`) {
        count++;
    }
    if (activeBoard[homeRow][0] === `${color}R`) {
        count++;
    }
    if (activeBoard[homeRow][8] === `${color}R`) {
        count++;
    }

    return count;
}

function getOpeningTempoPenalty(activeBoard, historySequence, move, color) {
    const plyCount = historySequence?.length || moveSequence.length;
    if (plyCount > 16 || move.captured) {
        return 0;
    }

    if (move.piece[1] === 'C' && move.fromRow === move.toRow) {
        let penalty = 18;
        const undevelopedMajors = countUndevelopedMajors(activeBoard, color);

        if (move.toCol !== 4) {
            penalty += 18;
        }

        if (Math.abs(move.toCol - move.fromCol) <= 1) {
            penalty += 10;
        }

        if (move.fromCol === 4 && move.toCol !== 4) {
            penalty += 28;
        }

        penalty += undevelopedMajors * 8;
        return penalty;
    }

    return 0;
}

function getRepeatedPieceTempoPenalty(activeBoard, historySequence, move, color) {
    const plyCount = historySequence?.length || moveSequence.length;
    if (plyCount > 20 || move.captured) {
        return 0;
    }

    const isRedTurn = color === RED_COLOR;
    const sideMoves = historySequence?.filter((_, index) => (index % 2 === 0) === isRedTurn) || [];
    if (sideMoves.length === 0) {
        return 0;
    }

    const recentMatches = sideMoves
        .slice(-3)
        .map(parseMoveKey)
        .filter(lastMove => lastMove.toRow === move.fromRow && lastMove.toCol === move.fromCol);

    if (recentMatches.length === 0) {
        return 0;
    }

    let penalty = 18 + recentMatches.length * 10;
    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    penalty += undevelopedMajors * 10;

    if (move.piece[1] === 'R' || move.piece[1] === 'H' || move.piece[1] === 'C') {
        penalty += 18;
    }

    if (move.fromRow === move.toRow || move.fromCol === move.toCol) {
        penalty += 8;
    }

    const retreating = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
    if (retreating) {
        penalty += 14;
    }

    return penalty;
}

function getCannonShufflePenalty(historySequence, move, color) {
    if (move.piece[1] !== 'C' || move.captured || move.fromRow !== move.toRow) {
        return 0;
    }

    const openingPenalty = (historySequence?.length || moveSequence.length) <= 14 ? 24 : 10;
    if (!historySequence || historySequence.length < 2) {
        return openingPenalty;
    }

    const isRedTurn = color === RED_COLOR;
    const sideMoves = historySequence.filter((_, index) => (index % 2 === 0) === isRedTurn);
    if (sideMoves.length === 0) {
        return openingPenalty;
    }

    const lastSideMove = parseMoveKey(sideMoves[sideMoves.length - 1]);
    if (lastSideMove.toRow === move.fromRow && lastSideMove.toCol === move.fromCol) {
        return openingPenalty + 28;
    }

    return openingPenalty;
}

function getCaptureUrgencyBonus(move) {
    if (!move.captured) {
        return 0;
    }

    const capturedValue = PIECE_VALUES[move.captured[1]];
    const moverValue = PIECE_VALUES[move.piece[1]];
    let bonus = Math.round(capturedValue * 0.35);

    if (capturedValue >= moverValue) {
        bonus += 26;
    }

    if (move.captured[1] === 'S') {
        bonus += 12;
    }

    return bonus;
}

function scoreMove(activeBoard, move, ttMove, historySequence = moveSequence) {
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
        score += 6;
    }
    score += Math.max(0, 5 - Math.abs(4 - move.toCol)) * 6;
    score += getOpeningMoveBonus(move);
    score += getCaptureUrgencyBonus(move);
    score -= getRecentMovePenalty(historySequence, move, move.piece[0]);
    score -= getHorseRetreatPenalty(move);
    score -= getCannonTempoPenalty(activeBoard, historySequence, move, move.piece[0]);
    score -= getPrematureCannonRaidPenalty(activeBoard, historySequence, move, move.piece[0]);
    score -= getOpeningTempoPenalty(activeBoard, historySequence, move, move.piece[0]);
    score -= getRepeatedPieceTempoPenalty(activeBoard, historySequence, move, move.piece[0]);
    score -= getCannonShufflePenalty(historySequence, move, move.piece[0]);
    return score;
}

function orderMoves(activeBoard, moves, ttMove, historySequence = moveSequence) {
    return moves
        .slice()
        .sort((left, right) => scoreMove(activeBoard, right, ttMove, historySequence) - scoreMove(activeBoard, left, ttMove, historySequence));
}

function findOpeningBookMove(activeBoard, color, historySequence) {
    const legalMoves = getAllLegalMoves(activeBoard, color);
    const legalByKey = new Map(legalMoves.map(move => [getMoveKey(move), move]));
    const directCandidates = OPENING_BOOK[getOpeningBookKey(color, historySequence)] || [];

    for (const candidate of directCandidates) {
        const key = getMoveKey(candidate);
        if (legalByKey.has(key)) {
            return legalByKey.get(key);
        }
    }

    const mirroredSequence = historySequence.map(mirrorMoveKey);
    const mirroredCandidates = OPENING_BOOK[getOpeningBookKey(color, mirroredSequence)] || [];

    for (const candidate of mirroredCandidates) {
        const mirroredCandidate = mirrorMoveDescriptor(candidate);
        const key = getMoveKey(mirroredCandidate);
        if (legalByKey.has(key)) {
            return legalByKey.get(key);
        }
    }

    return null;
}

function quiescence(activeBoard, color, alpha, beta, depth) {
    if (shouldAbortSearch()) {
        throw SEARCH_ABORT;
    }

    const standPat = evaluateForColor(activeBoard, color);
    if (standPat >= beta || depth === 0) {
        return { score: standPat };
    }

    if (standPat > alpha) {
        alpha = standPat;
    }

    const inCheck = isInCheck(activeBoard, color);
    const tacticalMoves = orderMoves(
        activeBoard,
        getAllLegalMoves(activeBoard, color).filter(move => inCheck || move.captured)
    ).slice(0, getSearchMoveLimit(countPieces(activeBoard), depth, true));

    if (tacticalMoves.length === 0) {
        return {
            score: inCheck ? -MATE_SCORE - depth : standPat
        };
    }

    let bestScore = standPat;

    for (const move of tacticalMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        const result = quiescence(nextBoard, otherColor(color), -beta, -alpha, depth - 1);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
        }
        if (score > alpha) {
            alpha = score;
        }
        if (alpha >= beta) {
            break;
        }
    }

    return { score: bestScore };
}

function shouldExtendSearch(activeBoard, nextBoard, move, color, depth, pieceCount, extensionBudget) {
    if (extensionBudget <= 0 || depth <= 0) {
        return 0;
    }

    if (isInCheck(nextBoard, otherColor(color)) && (pieceCount <= 18 || depth <= 1)) {
        return 1;
    }

    if (pieceCount <= 14 && move.captured && PIECE_VALUES[move.captured[1]] >= PIECE_VALUES.H) {
        return 1;
    }

    return 0;
}

function evaluateRootMoveAdjustment(activeBoard, nextBoard, move, color, historySequence) {
    let adjustment = 0;
    const enemyColor = otherColor(color);
    const movedPieceValue = PIECE_VALUES[move.piece[1]];
    const attackers = countAttackersOnSquare(nextBoard, move.toRow, move.toCol, enemyColor);
    const defenders = countAttackersOnSquare(nextBoard, move.toRow, move.toCol, color);
    const captureSwing = move.captured ? PIECE_VALUES[move.captured[1]] : 0;

    adjustment -= getRecentMovePenalty(historySequence, move, color);

    if (attackers.count > 0) {
        if (defenders.count === 0) {
            adjustment -= Math.round((movedPieceValue - captureSwing) * 0.34);
        } else if (attackers.leastValue < movedPieceValue && !move.captured) {
            adjustment -= Math.round((movedPieceValue - attackers.leastValue) * 0.2);
        }
    }

    const enemyReplies = orderMoves(nextBoard, getAllLegalMoves(nextBoard, enemyColor)).slice(0, 10);
    let worstThreat = 0;

    for (const reply of enemyReplies) {
        if (!reply.captured) {
            continue;
        }

        const capturedValue = PIECE_VALUES[reply.captured[1]];
        const replyValue = PIECE_VALUES[reply.piece[1]];
        const ourDefenders = countAttackersOnSquare(nextBoard, reply.toRow, reply.toCol, color);
        let threat = capturedValue - Math.round(replyValue * 0.45);

        if (ourDefenders.count === 0) {
            threat += Math.round(capturedValue * 0.18);
        }

        if (threat > worstThreat) {
            worstThreat = threat;
        }
    }

    adjustment -= worstThreat;
    return adjustment;
}

function chooseVerifiedRootMove(activeBoard, color, historySequence, orderedMoves, depth, baseBestMove, extensionBudget) {
    const pieceCount = countPieces(activeBoard);
    const verifyDepth = Math.max(1, depth - 2);
    const verifyLimit = Math.min(orderedMoves.length, pieceCount <= 18 ? 8 : 6);
    let bestMove = baseBestMove;
    let bestScore = -Infinity;

    for (const move of orderedMoves.slice(0, verifyLimit)) {
        if (getNow() >= searchDeadline) {
            break;
        }

        const nextBoard = applyMoveToBoard(activeBoard, move);
        const extension = shouldExtendSearch(activeBoard, nextBoard, move, color, verifyDepth, pieceCount, 1);
        const result = negamax(
            nextBoard,
            otherColor(color),
            verifyDepth + extension,
            -Infinity,
            Infinity,
            1,
            Math.min(extensionBudget, 1) - extension
        );
        let score = -result.score + evaluateRootMoveAdjustment(activeBoard, nextBoard, move, color, historySequence);

        if (sameMove(move, baseBestMove)) {
            score += 24;
        }

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function negamax(activeBoard, color, depth, alpha, beta, ply = 0, extensionBudget = 1) {
    if (shouldAbortSearch()) {
        throw SEARCH_ABORT;
    }

    const originalAlpha = alpha;
    const redGeneral = findGeneral(activeBoard, RED_COLOR);
    const blackGeneral = findGeneral(activeBoard, BLACK_COLOR);
    if (!redGeneral) {
        return { score: color === BLACK_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }
    if (!blackGeneral) {
        return { score: color === RED_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }

    const ttKey = getBoardKey(activeBoard, color);
    const cached = transpositionTable.get(ttKey);
    if (cached && cached.depth >= depth) {
        if (cached.flag === 'exact') {
            return { score: cached.score, bestMove: cached.bestMove };
        }
        if (cached.flag === 'lower') {
            alpha = Math.max(alpha, cached.score);
        } else if (cached.flag === 'upper') {
            beta = Math.min(beta, cached.score);
        }
        if (alpha >= beta) {
            return { score: cached.score, bestMove: cached.bestMove };
        }
    }

    if (depth === 0) {
        return quiescence(activeBoard, color, alpha, beta, QUIESCENCE_DEPTH);
    }

    const legalMoves = orderMoves(activeBoard, getAllLegalMoves(activeBoard, color), cached?.bestMove);
    if (legalMoves.length === 0) {
        return { score: isInCheck(activeBoard, color) ? -MATE_SCORE - depth : -3000 - depth };
    }

    const pieceCount = countPieces(activeBoard);
    const baseMoveLimit = getSearchMoveLimit(pieceCount, depth);
    const moveLimit = ply === 0
        ? (pieceCount <= 16 ? legalMoves.length : Math.min(legalMoves.length, baseMoveLimit + 8))
        : baseMoveLimit;
    const candidateMoves = legalMoves.slice(0, moveLimit);
    let bestMove = candidateMoves[0];
    let bestScore = -Infinity;

    for (const move of candidateMoves) {
        if (getNow() >= searchDeadline) {
            throw SEARCH_ABORT;
        }

        const nextBoard = applyMoveToBoard(activeBoard, move);
        const extension = shouldExtendSearch(activeBoard, nextBoard, move, color, depth - 1, pieceCount, extensionBudget);
        const result = negamax(
            nextBoard,
            otherColor(color),
            depth - 1 + extension,
            -beta,
            -alpha,
            ply + 1,
            extensionBudget - extension
        );
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

    let flag = 'exact';
    if (bestScore <= originalAlpha) {
        flag = 'upper';
    } else if (bestScore >= beta) {
        flag = 'lower';
    }

    transpositionTable.set(ttKey, {
        depth,
        score: bestScore,
        bestMove,
        flag
    });

    return { score: bestScore, bestMove };
}

function chooseSearchDepth(activeBoard, legalMoves) {
    const pieceCount = countPieces(activeBoard);

    if (pieceCount >= 28 || legalMoves.length >= 34) {
        return 3;
    }

    if (pieceCount >= 18) {
        return 4;
    }

    return 5;
}

function scoreLiteMove(move) {
    const capturedValue = move.captured ? PIECE_VALUES[move.captured[1]] : 0;
    const moverValue = PIECE_VALUES[move.piece[1]];
    let score = capturedValue * 12 - moverValue;

    if (move.captured && move.captured[1] === 'G') {
        score += MATE_SCORE;
    }

    if (move.piece[1] === 'H' || move.piece[1] === 'R') {
        score += 14;
    }

    if (move.piece[1] === 'C' && !move.captured && move.fromRow === move.toRow && move.toCol !== 4) {
        score -= 28;
    }

    score += Math.max(0, 5 - Math.abs(4 - move.toCol)) * 5;
    return score;
}

function chooseComputerMoveLite(activeBoard, color = computerColor, historySequence = moveSequence, positionKeys = positionHistory) {
    const bookMove = findOpeningBookMove(activeBoard, color, historySequence);
    if (bookMove && !isPerpetualCheckViolation(activeBoard, bookMove, color, positionKeys)) {
        return bookMove;
    }

    const legalMoves = filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionKeys);
    if (legalMoves.length === 0) {
        return null;
    }

    const orderedMoves = legalMoves
        .slice()
        .sort((left, right) => scoreLiteMove(right) - scoreLiteMove(left))
        .slice(0, MAIN_THREAD_FALLBACK_CANDIDATES);

    let bestMove = orderedMoves[0];
    let bestScore = -Infinity;

    for (const move of orderedMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        let score = evaluateForColor(nextBoard, color);

        if (isInCheck(nextBoard, otherColor(color))) {
            score += 42;
        }

        const enemyMoves = getAllLegalMoves(nextBoard, otherColor(color));
        if (enemyMoves.length === 0) {
            return move;
        }

        const replyCandidates = enemyMoves
            .slice()
            .sort((left, right) => scoreLiteMove(right) - scoreLiteMove(left))
            .slice(0, MAIN_THREAD_FALLBACK_REPLIES);

        let worstReply = Infinity;

        for (const reply of replyCandidates) {
            const replyBoard = applyMoveToBoard(nextBoard, reply);
            let replyScore = evaluateForColor(replyBoard, color);

            if (isInCheck(replyBoard, color)) {
                replyScore -= 48;
            }

            if (replyScore < worstReply) {
                worstReply = replyScore;
            }
        }

        score = Math.min(score, worstReply);

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
    }

    return bestMove;
}

function chooseComputerMove(activeBoard, color = computerColor, historySequence = moveSequence, positionKeys = positionHistory, options = {}) {
    const bookMove = findOpeningBookMove(activeBoard, color, historySequence);
    if (bookMove && !isPerpetualCheckViolation(activeBoard, bookMove, color, positionKeys)) {
        return bookMove;
    }

    const legalMoves = filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionKeys);
    if (legalMoves.length === 0) {
        return null;
    }

    if (transpositionTable.size > 25000) {
        transpositionTable.clear();
    }

    const depthCap = options.depthCap ?? Infinity;
    const depth = Math.min(chooseSearchDepth(activeBoard, legalMoves), depthCap);
    const pieceCount = countPieces(activeBoard);
    const extensionBudget = pieceCount <= 18 ? 2 : 1;
    const maxTime = options.maxTime ?? Infinity;
    const timeLimit = Math.min(getSearchTimeLimit(activeBoard, legalMoves), maxTime);
    const fallbackMove = orderMoves(activeBoard, legalMoves, null, historySequence)[0];
    let bestMove = fallbackMove;
    let bestResult = null;

    searchDeadline = getNow() + timeLimit;
    searchNodeCounter = 0;

    for (let currentDepth = Math.min(2, depth); currentDepth <= depth; currentDepth++) {
        try {
            const result = negamax(activeBoard, color, currentDepth, -Infinity, Infinity, 0, extensionBudget);
            if (result.bestMove) {
                bestMove = result.bestMove;
                bestResult = result;
            }
        } catch (error) {
            if (error !== SEARCH_ABORT) {
                throw error;
            }
            break;
        }

        if (getNow() >= searchDeadline) {
            break;
        }
    }

    const orderedMoves = orderMoves(activeBoard, legalMoves, bestResult?.bestMove || bestMove, historySequence);
    return bestMove || orderedMoves[0];
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
    if (color === RED_COLOR) {
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
    const redGeneral = findGeneral(activeBoard, RED_COLOR);
    const blackGeneral = findGeneral(activeBoard, BLACK_COLOR);

    if (!redGeneral) {
        return { winner: BLACK_COLOR, message: '\u9ed1\u65b9\u52dd\uff1a\u7d05\u5e25\u88ab\u5403\u3002' };
    }
    if (!blackGeneral) {
        return { winner: RED_COLOR, message: '\u7d05\u65b9\u52dd\uff1a\u9ed1\u5c07\u88ab\u5403\u3002' };
    }

    const rawLegalMoves = getAllLegalMoves(activeBoard, sideToMove);
    const legalMoves = filterPlayableMoves(activeBoard, sideToMove, rawLegalMoves, positionHistory);
    if (legalMoves.length > 0) {
        return null;
    }

    if (rawLegalMoves.length > 0) {
        return {
            winner: otherColor(sideToMove),
            message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u9577\u5c07\u7981\u624b\u3002`
        };
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
    boardElement.classList.toggle('flipped', humanColor === BLACK_COLOR);
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

    animatePendingMove(boardElement);
}

function animatePendingMove(boardElement) {
    if (typeof window === 'undefined' || !pendingAnimatedMove) {
        return;
    }

    const move = pendingAnimatedMove;
    pendingAnimatedMove = null;

    const fromCell = boardElement.querySelector(`.cell[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
    const toCell = boardElement.querySelector(`.cell[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
    const pieceElement = toCell ? toCell.querySelector('.piece') : null;
    if (!fromCell || !toCell || !pieceElement) {
        playMoveSound(move);
        return;
    }

    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const shiftX = fromRect.left - toRect.left;
    const shiftY = fromRect.top - toRect.top;

    pieceElement.style.transition = 'none';
    pieceElement.style.transform = getPieceTransform(shiftX, shiftY);
    pieceElement.style.zIndex = '4';

    window.requestAnimationFrame(() => {
        pieceElement.style.transition = `transform ${MOVE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        pieceElement.style.transform = getPieceTransform();
    });

    playMoveSound(move);

    window.setTimeout(() => {
        pieceElement.style.transition = '';
        pieceElement.style.transform = '';
        pieceElement.style.zIndex = '';
    }, MOVE_ANIMATION_MS + 40);
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
    validMoves = filterPlayableMoves(board, board[row][col][0], getLegalMovesForPiece(board, row, col), positionHistory);
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
        moveLog: cloneMoveLog(moveLog),
        moveSequence: cloneMoveSequence(moveSequence),
        positionHistory: clonePositionHistory(positionHistory)
    };
}

function restoreState(snapshot) {
    aiTurnToken++;
    stopAiWorker();
    board = cloneBoard(snapshot.board);
    currentPlayer = snapshot.currentPlayer;
    lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    gameActive = snapshot.gameActive;
    aiThinking = snapshot.aiThinking;
    statusMessage = snapshot.statusMessage;
    moveLog = cloneMoveLog(snapshot.moveLog || []);
    moveSequence = cloneMoveSequence(snapshot.moveSequence || []);
    positionHistory = clonePositionHistory(snapshot.positionHistory || []);
    pendingAnimatedMove = null;
    clearSelection();
    createBoard();
    renderMoveLog();
    updateSideButtons();
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
        playWinSound();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => window.alert(gameState.message), 20);
        }
        return;
    }

    statusMessage = isInCheck(board, currentPlayer)
        ? `${colorName(currentPlayer)}\u88ab\u5c07\u8ecd\u3002`
        : currentPlayer === humanColor
            ? getStartStatusMessage()
            : `${colorName(computerColor)}\u6b63\u5728\u627e\u6b65\u3002`;

    createBoard();
    renderMoveLog();
    updateStatus();

    if (isInCheck(board, currentPlayer)) {
        playCheckSound();
    }

    if (gameActive && currentPlayer === computerColor) {
        aiThinking = true;
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(computerMove, AI_THINK_DELAY_MS);
        }
    }
}

function performMove(move) {
    moveHistory.push(snapshotState());
    appendMoveLog(formatMoveNotation(board, move), currentPlayer);
    moveSequence.push(getMoveKey(move));
    pendingAnimatedMove = { ...move };
    board = applyMoveToBoard(board, move);
    lastMove = move;
    currentPlayer = otherColor(currentPlayer);
    positionHistory.push(getBoardKey(board, currentPlayer));
    clearSelection();
    finalizeMove();
}

function handleCellClick(row, col) {
    if (!gameActive || aiThinking || currentPlayer !== humanColor) {
        return;
    }

    const piece = board[row][col];
    if (!selectedCell) {
        if (piece && piece[0] === humanColor) {
            selectPiece(row, col);
        }
        return;
    }

    const chosenMove = validMoves.find(move => move.toRow === row && move.toCol === col);
    if (chosenMove) {
        performMove(chosenMove);
        return;
    }

    if (piece && piece[0] === humanColor) {
        selectPiece(row, col);
        return;
    }

    clearSelection();
    createBoard();
}

function computerMove() {
    if (!gameActive || currentPlayer !== computerColor) {
        aiThinking = false;
        updateStatus();
        return;
    }

    const turnToken = ++aiTurnToken;
    requestComputerMove(cloneBoard(board), computerColor, cloneMoveSequence(moveSequence), clonePositionHistory(positionHistory))
        .then(move => {
            if (turnToken !== aiTurnToken) {
                return;
            }

            aiThinking = false;

            if (!gameActive || currentPlayer !== computerColor) {
                updateStatus();
                return;
            }

            if (!move) {
                finalizeMove();
                return;
            }

            performMove(move);
        })
        .catch(() => {
            if (turnToken !== aiTurnToken) {
                return;
            }

            aiThinking = false;
            updateStatus();
        });
}

function undoMove() {
    if (aiThinking || moveHistory.length === 0) {
        return;
    }

    let steps = currentPlayer === humanColor ? 2 : 1;
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

function setHumanSide(color) {
    if (color !== RED_COLOR && color !== BLACK_COLOR) {
        return;
    }

    humanColor = color;
    computerColor = otherColor(color);
    resetGame();
}

function resetGame() {
    aiTurnToken++;
    stopAiWorker();
    board = cloneBoard(initialBoard);
    currentPlayer = RED_COLOR;
    selectedCell = null;
    validMoves = [];
    lastMove = null;
    gameActive = true;
    aiThinking = false;
    moveHistory = [];
    moveLog = [];
    moveSequence = [];
    positionHistory = [getBoardKey(board, currentPlayer)];
    pendingAnimatedMove = null;
    transpositionTable.clear();
    statusMessage = getStartStatusMessage();
    createBoard();
    renderMoveLog();
    updateSideButtons();
    updateStatus();

    if (currentPlayer === computerColor && typeof window !== 'undefined') {
        aiThinking = true;
        updateStatus();
        window.setTimeout(computerMove, AI_THINK_DELAY_MS);
    }
}

if (typeof window !== 'undefined') {
    window.resetGame = resetGame;
    window.undoMove = undoMove;
    window.setHumanSide = setHumanSide;
    resetGame();
}

if (typeof module !== 'undefined') {
    module.exports = {
        BLACK_COLOR,
        RED_COLOR,
        initialBoard,
        applyMoveToBoard,
        chooseComputerMove,
        cloneBoard,
        createMove,
        evaluateBoard,
        findGeneral,
        findOpeningBookMove,
        formatMoveNotation,
        getMoveKey,
        getAllLegalMoves,
        getGameState,
        getLegalMovesForPiece,
        hasCrossedRiver,
        isInCheck,
        otherColor,
        countAttackersOnSquare,
        setHumanSide,
        undoMove
    };
}
