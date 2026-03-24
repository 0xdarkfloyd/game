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

const scenarios = [
    {
        name: 'middle cannon opening avoids early cannon',
        sequence: ['7,7-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bC', 'bA', 'bE', 'bG'].includes(result.move.piece), `bad opening piece: ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon opening avoids early cannon',
        sequence: ['7,1-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bC', 'bA', 'bE', 'bG'].includes(result.move.piece), `bad opening piece: ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon line avoids passive palace move',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bC', 'bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon with both horses developed prefers rook',
        sequence: ['7,1-7,4', '0,7-2,6', '6,2-5,2', '0,1-2,2', '9,7-7,6', '3,6-4,6', '9,8-8,8'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bR', `expected rook, got ${result.move.piece}`);
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
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bR', `expected rook, got ${result.move.piece}`);
        }
    },
    {
        name: 'double horse other side avoids early cannon',
        sequence: ['6,2-5,2', '0,1-2,2', '9,7-7,6', '0,7-2,6', '6,6-5,6'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bC', 'bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'rook already out should still develop black rook',
        sequence: ['6,6-5,6', '0,7-2,6', '7,1-7,4', '0,1-2,2', '9,8-8,8'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bR', `expected rook, got ${result.move.piece}`);
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
    }
];

for (const scenario of scenarios) {
    const state = playSequence(scenario.sequence);
    const result = compute(state);
    scenario.check(result);
    assert(result.elapsed < 1800, `${scenario.name} exceeded budget: ${result.elapsed}ms`);
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

console.log(`regression scenarios passed: ${scenarios.length}`);
