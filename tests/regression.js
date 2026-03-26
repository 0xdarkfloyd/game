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

function assertOneOfMoveKeys(result, expectedKeys, message) {
    assert(result.move, 'expected a move');
    assert(
        expectedKeys.includes(game.getMoveKey(result.move)),
        message || `expected one of ${expectedKeys.join(', ')}, got ${game.getMoveKey(result.move)}`
    );
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

function assertActiveMajorReply(result, message) {
    assert(result.move, 'expected a move');
    assert(
        result.move.captured || result.move.piece === 'bR',
        message || `expected active rook move or tactical capture, got ${game.getMoveKey(result.move)}`
    );
    assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad passive reply: ${result.move.piece}`);
}

const scenarios = [
    {
        name: 'middle cannon opening prefers horse development',
        sequence: ['7,7-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon after one horse should bring rook',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'mirrored middle cannon after one horse should also bring rook',
        sequence: ['7,7-7,4', '0,7-2,6', '9,7-7,6'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'centered cannon with no opposing horse developed should prefer second horse',
        sequence: ['7,1-7,4', '0,1-2,2', '6,6-5,6', '3,2-4,2', '9,0-8,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse development, got ${result.move.piece}`);
        }
    },
    {
        name: 'opening avoids immediate rook shuffle reversal',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6', '0,7-2,6', '6,6-5,6', '0,0-0,1', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '0,1-0,0', `expected non-reversing rook reply, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'opening avoids rook reversal after one intervening move',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6', '0,0-0,1', '6,6-5,6', '3,6-4,6', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '0,1-0,0', `expected non-reversing rook reply, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'horse opening with one rook out avoids early cannon drift',
        sequence: ['9,1-7,2', '0,7-2,6', '7,7-7,8', '0,1-2,2', '9,7-7,6', '0,8-0,7', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,1-4,1', `expected non-cannon drift, got ${game.getMoveKey(result.move)}`);
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon with left horse out should bring rook instead of cannon',
        sequence: ['7,1-7,4', '0,1-2,2', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bR', `expected rook, got ${result.move.piece}`);
            assert.notStrictEqual(game.getMoveKey(result.move), '2,7-2,4', `expected non-cannon centralization, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'after one rook and one horse, centered cannon should avoid quiet cannon drift',
        sequence: ['9,7-7,6', '0,1-2,2', '7,1-7,4', '0,0-0,1', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,1-2,4', `expected non-cannon drift, got ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad passive reply: ${result.move.piece}`);
        }
    },
    {
        name: 'opening avoids cannon-for-horse trade that activates enemy rook',
        sequence: ['7,1-7,4', '0,1-2,2', '9,1-7,2', '0,0-0,1', '9,0-9,1'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,7-9,7', `expected non-cannon horse raid, got ${game.getMoveKey(result.move)}`);
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon opening prefers horse development',
        sequence: ['7,1-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon after one horse should bring rook',
        sequence: ['7,1-7,4', '0,7-2,6', '9,1-7,2'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'middle cannon line avoids passive palace move',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!(result.move.piece === 'bC' && !result.move.captured), `bad quiet cannon reply: ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon with both horses developed prefers rook',
        sequence: ['7,1-7,4', '0,7-2,6', '6,2-5,2', '0,1-2,2', '9,7-7,6', '3,6-4,6', '9,8-8,8'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'horse opening line avoids palace shuffle',
        sequence: ['9,6-7,4', '0,1-2,2', '9,7-8,5', '3,4-4,4', '7,7-7,5', '0,7-2,6', '6,0-5,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad palace move: ${result.move.piece}`);
        }
    },
    {
        name: 'double horse middle cannon should bring rook',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2', '0,7-2,6', '9,1-7,2', '3,6-4,6', '7,2-5,3'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'double horse other side avoids early cannon',
        sequence: ['6,2-5,2', '0,1-2,2', '9,7-7,6', '0,7-2,6', '6,6-5,6'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!(result.move.piece === 'bC' && !result.move.captured), `bad quiet cannon reply: ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'rook already out should stay practical',
        sequence: ['6,6-5,6', '0,7-2,6', '7,1-7,4', '0,1-2,2', '9,8-8,8'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG', 'bS'].includes(result.move.piece), `bad practical reply: ${result.move.piece}`);
        }
    },
    {
        name: 'horse opening after one horse should prefer second horse',
        sequence: ['6,6-5,6', '0,1-2,2', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'mirror horse opening after one horse should prefer second horse',
        sequence: ['6,2-5,2', '0,1-2,2', '9,7-7,6'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'horse opening after both horses and center cannon should bring rook',
        sequence: ['6,6-5,6', '0,1-2,2', '9,1-7,2', '0,7-2,6', '6,2-5,2'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'after rook trade of tempo avoid early cannon follow-up',
        sequence: ['7,1-7,4', '0,0-1,0', '9,0-8,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
            assert.strictEqual(result.move.piece, 'bH', `expected horse development, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon after both horses avoids elephant retreat',
        sequence: ['7,1-7,4', '0,7-2,6', '9,1-7,2', '0,1-2,2', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bC'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon after right rook setup stays practical',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2', '0,7-2,6', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'opening should remove cannon screen before enemy cannon captures rook',
        sequence: [
            '7,1-7,4', '0,7-2,6',
            '9,1-7,2', '0,0-1,0',
            '9,7-7,6', '1,0-2,0',
            '6,6-5,6', '2,0-1,0',
            '6,2-5,2', '1,0-1,3',
            '7,7-7,8', '1,3-8,3',
            '7,6-5,5', '8,3-8,6',
            '9,0-9,1', '8,6-5,6',
            '5,5-3,4', '0,8-0,7',
            '6,4-5,4', '5,6-4,6',
            '7,8-7,7'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,7-2,8', `expected 砲8平9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'middlegame should take the advanced horse instead of drifting the cannon screen',
        sequence: [
            '7,1-7,4', '0,7-2,6',
            '9,7-7,6', '0,1-2,2',
            '9,0-8,0', '0,0-0,1',
            '6,6-5,6', '0,8-1,8',
            '6,2-5,2', '2,1-5,1',
            '9,6-7,8', '2,7-6,7',
            '9,8-8,8', '5,1-5,6',
            '9,1-7,2', '1,8-1,5',
            '8,8-8,5', '1,5-8,5',
            '8,0-8,5', '0,1-4,1',
            '8,5-5,5', '5,6-6,6',
            '5,5-5,6', '6,6-6,5',
            '5,6-3,6', '2,6-1,4',
            '7,6-5,5', '6,7-2,7',
            '7,2-5,3', '6,5-6,0',
            '5,3-3,4', '2,2-3,4',
            '7,4-3,4'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,4-3,3', `expected 馬5進4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'active rook should keep pressing instead of side-shuffling',
        sequence: [
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,7-2,6',
            '6,2-5,2', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,0-8,0', '2,7-3,7',
            '6,6-5,6', '1,0-1,3',
            '9,6-7,4', '2,1-6,1',
            '8,0-8,5', '1,3-6,3',
            '9,5-8,4', '3,7-4,7',
            '7,6-5,5'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,3-8,3', `expected 車4進2, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'exposed advanced rook should step back to safety',
        sequence: [
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,7-2,6',
            '6,2-5,2', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,0-8,0', '2,7-3,7',
            '6,6-5,6', '1,0-1,3',
            '9,6-7,4', '2,1-6,1',
            '8,0-8,5', '1,3-6,3',
            '9,5-8,4', '3,7-4,7',
            '7,6-5,5', '6,3-6,2',
            '9,8-9,7', '0,7-3,7',
            '7,1-9,1', '6,1-7,1',
            '5,5-4,3', '6,2-6,3',
            '4,3-5,1', '6,3-8,3',
            '6,4-5,4', '7,1-7,4',
            '9,4-9,5', '0,5-1,4',
            '9,7-5,7', '7,4-7,6',
            '8,5-7,5', '7,6-7,2',
            '7,5-7,2', '8,3-8,1',
            '5,1-7,0', '0,2-2,4',
            '5,7-6,7', '8,1-5,1',
            '9,2-7,4', '1,4-2,5',
            '7,8-7,6', '0,3-1,4',
            '6,0-5,0'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '5,1-4,1', `expected 車2退1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'middlegame should not ignore a loose horse with a quiet pawn push',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3', '2,1-4,1',
            '4,5-3,7', '1,0-1,7',
            '8,8-8,7', '1,7-1,5',
            '9,4-9,3', '1,5-6,5',
            '6,1-7,1', '5,4-6,6',
            '7,1-6,1', '7,6-8,6',
            '3,7-1,6', '6,5-1,5',
            '8,7-8,6', '1,5-1,6',
            '8,6-6,6', '0,3-1,4',
            '5,3-3,3', '1,6-2,6',
            '6,1-7,1', '4,4-4,5',
            '7,1-7,2', '4,1-5,1',
            '5,6-4,6', '3,6-4,6',
            '6,6-6,1', '4,5-5,5',
            '6,1-7,1', '0,6-2,4',
            '6,0-5,0', '2,6-3,6',
            '5,2-4,2', '5,5-3,5',
            '3,3-4,3', '5,1-5,4',
            '5,0-4,0', '3,0-4,0',
            '7,1-2,1'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,2-0,3', `expected 馬3退4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'recent middlegame should activate the central horse',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '5,4-7,5', `expected 馬5進6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'recent pressure line should retreat the loose horse',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3', '2,1-4,1',
            '4,5-3,7', '1,0-1,7',
            '8,8-8,7', '1,7-1,5',
            '9,4-9,3', '1,5-6,5',
            '6,1-8,1', '5,4-6,6',
            '8,1-7,1', '7,6-8,6',
            '3,7-1,6', '6,5-1,5',
            '8,7-8,6', '1,5-1,6',
            '8,6-6,6', '0,3-1,4',
            '5,3-3,3', '1,6-2,6',
            '7,1-7,2', '4,4-4,5',
            '7,2-3,2', '4,1-5,1',
            '5,6-4,6', '3,6-4,6',
            '6,6-6,1', '4,5-5,5',
            '6,1-7,1', '0,6-2,4',
            '6,0-5,0', '2,6-3,6',
            '5,2-4,2', '5,5-3,5',
            '3,3-4,3', '5,1-5,4',
            '5,0-4,0', '3,0-4,0',
            '7,1-2,1', '3,5-3,2',
            '4,2-3,2'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,2-0,3', `expected 馬3退4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'high-budget defense should avoid the tempting horse jump',
        timeBudgetMs: 2200,
        sequence: [
            '7,7-7,4', '0,1-2,2',
            '9,1-7,2', '0,0-1,0',
            '7,1-7,0', '0,8-1,8',
            '9,0-9,1', '0,7-2,8',
            '9,7-7,6', '2,7-2,6',
            '6,2-5,2', '1,8-1,3',
            '9,1-3,1', '1,3-8,3',
            '9,8-8,8', '8,3-8,8',
            '7,6-8,8', '2,1-2,0',
            '7,2-5,3', '1,0-1,3',
            '5,3-7,2', '2,8-1,6',
            '3,1-3,2', '1,6-2,4',
            '3,2-4,2', '2,0-2,1',
            '6,6-5,6', '0,3-1,4',
            '7,4-7,6', '2,6-2,5',
            '8,8-6,7', '2,1-6,1',
            '6,7-7,5', '6,1-6,8',
            '4,2-4,5', '2,5-7,5',
            '7,0-7,5', '1,3-6,3',
            '5,6-4,6', '6,8-6,6',
            '9,6-7,4', '3,6-4,6',
            '4,5-4,6', '6,3-8,3',
            '4,6-6,6', '0,6-2,8',
            '7,5-1,5', '2,2-4,3',
            '1,5-1,8'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['1,4-0,3', '8,3-8,7'],
                `expected a defensive reply, got ${game.getMoveKey(result.move)}`
            );
        }
    }
];

for (const scenario of scenarios) {
    const state = playSequence(scenario.sequence);
    const budget = scenario.timeBudgetMs || 900;
    const result = compute(state, budget);
    scenario.check(result);
    const elapsedLimit = Math.max(1800, budget + 600);
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

