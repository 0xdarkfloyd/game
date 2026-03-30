const assert = require('assert');
const game = require('../game.js');

const engine = game.ensureEngineCore();

function createState() {
    const board = game.cloneBoard(game.initialBoard);
    return {
        board,
        side: game.RED_COLOR,
        history: [],
        positionHistory: [game.getBoardKey(board, game.RED_COLOR)]
    };
}

function applyMoveKey(state, key) {
    const legal = game.filterPlayableMoves(
        state.board,
        state.side,
        game.getAllLegalMoves(state.board, state.side),
        state.positionHistory,
        state.history
    );
    const move = legal.find(candidate => game.getMoveKey(candidate) === key);
    assert(move, `move not found: ${key}`);

    state.board = game.applyMoveToBoard(state.board, move);
    state.history.push(key);
    state.side = game.otherColor(state.side);
    state.positionHistory.push(game.getBoardKey(state.board, state.side));
    return move;
}

function playSequence(sequence) {
    const state = createState();
    sequence.forEach(key => applyMoveKey(state, key));
    return state;
}

function applyMoveNotation(state, notation) {
    const legal = game.filterPlayableMoves(
        state.board,
        state.side,
        game.getAllLegalMoves(state.board, state.side),
        state.positionHistory,
        state.history
    );
    const move = legal.find(candidate => game.formatMoveNotation(state.board, candidate) === notation);
    assert(move, `notation not found: ${notation}`);

    state.board = game.applyMoveToBoard(state.board, move);
    state.history.push(game.getMoveKey(move));
    state.side = game.otherColor(state.side);
    state.positionHistory.push(game.getBoardKey(state.board, state.side));
    return move;
}

function playNotationSequence(sequence) {
    const state = createState();
    sequence.forEach(notation => applyMoveNotation(state, notation));
    return state;
}

function compute(state, timeBudgetMs = 900) {
    const startedAt = Date.now();
    const result = engine.computeBestMove({
        board: state.board,
        currentPlayer: state.side,
        history: state.history,
        positionHistory: state.positionHistory,
        timeBudgetMs
    });

    return {
        ...result,
        elapsed: Date.now() - startedAt
    };
}

function createEmptyBoard() {
    return Array.from({ length: 10 }, () => Array(9).fill(''));
}

function computeOnBoard(board, side = game.BLACK_COLOR, timeBudgetMs = 700) {
    return engine.computeBestMove({
        board,
        currentPlayer: side,
        history: [],
        positionHistory: [game.getBoardKey(board, side)],
        timeBudgetMs
    });
}

function getMoveNotation(state, move) {
    return game.formatMoveNotation(state.board, move);
}

function assertNoPassiveMove(result, message) {
    assert(result.move, 'expected a move');
    assert(!['bA', 'bE', 'bG', 'bS'].includes(result.move.piece), message || `unexpected passive move: ${result.move.piece}`);
}

function assertActiveMajorReply(result, message) {
    assert(result.move, 'expected a move');
    assert(
        result.move.captured || ['bR', 'bH', 'bC'].includes(result.move.piece),
        message || `expected active major move or capture, got ${game.getMoveKey(result.move)}`
    );
    assertNoPassiveMove(result, message);
}

function assertMoveNotationIn(state, result, expectedNotations, message) {
    assert(result.move, 'expected a move');
    const notation = getMoveNotation(state, result.move);
    assert(
        expectedNotations.includes(notation),
        message || `expected one of ${expectedNotations.join(', ')}, got ${notation}`
    );
}

const scenarios = [
    {
        name: 'middle cannon opening prefers horse development',
        sequence: ['7,7-7,4'],
        check(state, result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse development, got ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon after one horse should develop actively',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6'],
        check(state, result) {
            assertActiveMajorReply(result, `expected active development, got ${getMoveNotation(state, result.move)}`);
        }
    },
    {
        name: 'horse opening after one horse prefers second horse',
        sequence: ['6,6-5,6', '0,1-2,2', '9,1-7,2'],
        check(state, result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected second horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'opening avoids delayed rook reversal',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6', '0,0-0,1', '6,6-5,6', '3,6-4,6', '6,2-5,2'],
        check(state, result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '0,1-0,0', `expected non-reversing rook move, got ${getMoveNotation(state, result.move)}`);
        }
    },
    {
        name: 'opening avoids cannon for horse raid that frees rook',
        sequence: ['7,1-7,4', '0,1-2,2', '9,1-7,2', '0,0-0,1', '9,0-9,1'],
        check(state, result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${getMoveNotation(state, result.move)}`);
        }
    },
    {
        name: 'loose cannon middlegame prefers active repair or counterplay',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[2][4] = 'bR';
            board[3][6] = 'bH';
            board[2][7] = 'bC';
            board[9][4] = 'rG';
            board[7][6] = 'rR';
            board[7][2] = 'rC';
            board[6][4] = 'rH';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 1800,
        check(state, result) {
            assertActiveMajorReply(result, `expected active repair or counterplay, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'opened file pressure prefers heavy-piece continuation',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[1][4] = 'bR';
            board[2][2] = 'bC';
            board[3][6] = 'bH';
            board[9][4] = 'rG';
            board[7][4] = 'rR';
            board[6][3] = 'rA';
            board[6][5] = 'rA';
            board[7][2] = 'rC';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 1800,
        check(state, result) {
            assertActiveMajorReply(result, `expected pressure-maintaining move, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'hanging major should prefer repair or forcing counterstrike',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[2][4] = 'bR';
            board[2][7] = 'bC';
            board[4][5] = 'bH';
            board[9][4] = 'rG';
            board[7][4] = 'rR';
            board[6][7] = 'rR';
            board[6][3] = 'rC';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 1800,
        check(state, result) {
            assertActiveMajorReply(result, `expected repair or counterstrike, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'king zone danger prefers forcing defense over quiet drift',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[1][4] = 'bR';
            board[2][3] = 'bC';
            board[3][6] = 'bH';
            board[9][4] = 'rG';
            board[7][4] = 'rR';
            board[6][4] = 'rC';
            board[7][6] = 'rH';
            board[8][3] = 'rA';
            board[8][5] = 'rA';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 2200,
        check(state, result) {
            assertActiveMajorReply(result, `expected forcing defensive continuation, got ${game.getMoveKey(result.move)}`);
        }
    }
];

for (const scenario of scenarios) {
    const state = scenario.customState
        ? scenario.customState()
        : scenario.notationSequence
        ? playNotationSequence(scenario.notationSequence)
        : playSequence(scenario.sequence);
    const budget = scenario.timeBudgetMs || 900;
    const result = compute(state, budget);
    scenario.check(state, result);
    const elapsedLimit = Math.max(1800, budget + (budget >= 2000 ? 1200 : 600));
    assert(result.elapsed < elapsedLimit, `${scenario.name} exceeded budget: ${result.elapsed}ms`);
}

{
    const state = createState();
    for (let ply = 0; ply < 12; ply++) {
        const legal = game.filterPlayableMoves(
            state.board,
            state.side,
            game.getAllLegalMoves(state.board, state.side),
            state.positionHistory,
            state.history
        );
        if (legal.length === 0) {
            break;
        }

        const result = compute(state, 450);
        assert(result.move, `self-play missing move at ply ${ply + 1}`);
        assert(legal.some(candidate => game.getMoveKey(candidate) === game.getMoveKey(result.move)), `illegal self-play move at ply ${ply + 1}`);
        assert(result.elapsed < 1500, `self-play exceeded budget at ply ${ply + 1}: ${result.elapsed}ms`);
        applyMoveKey(state, game.getMoveKey(result.move));
    }
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[2][4] = 'bR';
    board[5][4] = 'rS';

    const result = computeOnBoard(board);
    assert(result.move, 'expected safe-capture move');
    assert.strictEqual(game.getMoveKey(result.move), '2,4-5,4', `expected safe rook capture, got ${game.getMoveKey(result.move)}`);
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[2][4] = 'bR';
    board[5][4] = 'rS';
    board[6][4] = 'rR';

    const result = computeOnBoard(board);
    assert(result.move, 'expected non-hanging move');
    assert.notStrictEqual(game.getMoveKey(result.move), '2,4-5,4', 'should avoid hanging rook capture');
}

{
    assert.strictEqual(game.PIECE_LABELS.rH, '\u508c', 'red horse should render as 傌');
    assert.strictEqual(game.PIECE_LABELS.bH, '\u99ac', 'black horse should render as 馬');
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bR', fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, captured: '' }),
        '\u8eca1\u5e732',
        'black left rook notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bR', fromRow: 0, fromCol: 8, toRow: 1, toCol: 8, captured: '' }),
        '\u8eca9\u90321',
        'black right rook vertical notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bH', fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, captured: '' }),
        '\u99ac2\u90323',
        'black left horse notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bH', fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, captured: '' }),
        '\u99ac8\u90327',
        'black right horse notation should count from black side'
    );
}

console.log(`regression scenarios passed: ${scenarios.length} + 2 tactical`);
