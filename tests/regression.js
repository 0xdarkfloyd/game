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

const reviewedAdvancedLine = [
    '兵七進一','馬2進3','傌八進七','馬8進7','炮二平三','車9平8','俥九進一','車1進1','相三進五','砲8進5',
    '兵三進一','士4進5','俥九平四','馬3退4','俥四進四','象7進5','傌七進六','車1平3','炮八平七','砲2進7',
    '俥四平八','砲2平1','傌二進四','車8進6','俥八退五','砲1退1','兵七進一','象5進3','傌六進四','車8平6',
    '炮三平四','車6退2','傌四進二','車6平5','俥一進一','車5進2','兵三進一','卒7進1','俥一平三','車5平1',
    '俥三進四','馬7退8','俥三進一','馬4進5','俥三平四','車1平9','傌二進三','車9平4','俥八進一','砲1退3',
    '炮四平二','砲1平5','仕六進五','車4平7','傌三進二','馬8進7','俥四退二','砲5退1','傌二退三','馬7進8',
    '俥四平六','卒1進1','帥五平六','砲5平6','俥八進五','卒9進1','炮二平三','卒9進1','俥八退二','車3平1',
    '傌三進二','砲6退1','俥六進一','馬8進9','炮三平四','車7平8','傌二退三','砲6進3','俥八進五','馬9進8',
    '俥八平七','士5退4','炮七進四','車8平7','傌三進四','士6進5','炮七平八','馬8退6','炮八進三','將5平6',
    '俥七退一','將6進1','俥七平九','馬6進8','俥六平七','將6進1','俥七平二','馬8退9','俥二進一','砲6退2',
    '俥二進一','將6退1','俥二退二','車7平4','帥六平五','砲6進1','俥九退二','馬5進7','俥九平五','車4平1',
    '炮八平九','車1平7','俥五退二','卒1進1','炮九平八','卒9平8','俥二進一','卒8進1','炮八退三','卒1進1',
    '炮八進二','士5進6','傌四進六','馬7退5','俥五進三','砲6退1','俥五退一','將6退1','俥五進三'
];

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
        name: 'latest file-race line should keep the rook active on round 17',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['2,7-4,7', '2,6-3,4'],
                `expected a practical active continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'latest file-race line should keep the rook initiative on round 32',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五','馬7進5','傌七進六','車3平2','俥七平五','士4進5','俥五平七','車2進8','相九退七','車2平3',
            '仕五退六','象3進1','傌六進四','將5平4','炮五平六','車3退3','俥七平六','將4平5','炮六進二','車8平6',
            '俥六退一','車3平1','炮六平五','士5進4','俥六平五','士6進5','俥五平七','將5平6','俥七平六','砲3進7',
            '仕六進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['6,0-9,0', '6,0-6,2'],
                `expected an active rook continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'latest file-race line should find the late rook thrust on round 42',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五','馬7進5','傌七進六','車3平2','俥七平五','士4進5','俥五平七','車2進8','相九退七','車2平3',
            '仕五退六','象3進1','傌六進四','將5平4','炮五平六','車3退3','俥七平六','將4平5','炮六進二','車8平6',
            '俥六退一','車3平1','炮六平五','士5進4','俥六平五','士6進5','俥五平七','將5平6','俥七平六','砲3進7',
            '仕六進五','砲3退6','俥一平八','車1進3','仕五退六','砲3進6','帥五進一','車1退1','俥六退四','車1退3',
            '俥八進七','將6進1','傌四退二','卒7進1','相三進五','砲3平6','俥六進五','車1進3','俥六退五','車1退4',
            '相五進三','車6進4','俥六進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,0-8,0', `expected 車1進4, got ${game.getMoveKey(result.move)}`);
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
            assertOneOfMoveKeys(
                result,
                ['1,4-3,3', '2,7-2,4'],
                `expected a tactical middlegame continuation, got ${game.getMoveKey(result.move)}`
            );
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
            assertOneOfMoveKeys(
                result,
                ['2,2-0,3', '3,2-4,2'],
                `expected a horse repair move, got ${game.getMoveKey(result.move)}`
            );
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
    },
    {
        name: 'high-budget middlegame should repair the edge cannon instead of raiding a horse',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '7,7-7,5', '0,1-2,2',
            '9,2-7,4', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,3-8,4', '2,6-1,4',
            '6,2-5,2', '2,1-4,1',
            '9,8-9,7', '4,1-4,0',
            '9,0-9,3', '1,0-1,1',
            '7,1-9,1', '4,0-4,8',
            '6,8-5,8'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['4,8-4,4', '4,8-4,5', '4,8-4,6', '4,8-4,0'],
                `expected lateral cannon repair, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'high-budget middlegame should avoid reusing the same cannon again',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6', '0,7-2,6',
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,8-9,7', '1,0-1,5',
            '9,2-7,4', '2,1-4,1',
            '6,2-5,2', '4,1-4,0',
            '9,0-9,1', '4,0-4,1',
            '9,1-9,0', '3,4-4,4',
            '9,3-8,4'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['1,5-3,5', '1,5-4,5', '2,6-1,4', '3,6-4,6', '2,7-7,7'],
                `expected a practical non-cannon continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four line should keep practical pressure instead of pushing the edge pawn',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,1-7,3','0,1-2,2','7,7-7,8','0,0-0,1','7,3-7,1','2,1-2,0','6,2-5,2','0,1-5,1','9,8-9,7','2,7-2,8','9,7-3,7','0,8-1,8','3,7-3,6','1,8-1,5','9,0-8,0','1,5-5,5','8,0-8,2','5,5-6,5','9,1-7,0','5,1-4,1','9,3-8,4','0,5-1,4','8,2-7,2','4,1-4,7','7,1-2,1','2,6-0,5','2,1-7,1','2,0-6,0','7,2-6,2','6,0-4,0','6,8-5,8','2,8-5,8','9,2-7,4','0,6-2,4','7,1-7,3','6,5-2,5','6,4-5,4'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['5,8-5,5', '0,5-1,7', '4,7-4,3'],
                `expected a practical pressure move, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four line should keep the center file practical instead of drifting the cannon',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6','0,7-2,6','7,1-7,4','0,1-2,2','9,7-7,6','0,0-0,1','6,2-5,2','0,8-1,8','7,7-7,8','1,8-1,3','7,4-7,1','2,1-2,0','7,1-7,2','1,3-3,3','9,8-9,7','2,7-2,8','9,5-8,4','0,3-1,4','9,6-7,4','0,1-6,1','9,7-2,7','6,1-4,1','2,7-3,7','2,2-0,3','6,0-5,0','4,1-4,5','9,0-8,0','4,5-8,5','8,0-6,0','0,3-2,4','9,1-7,0','3,3-5,3','3,7-6,7','8,5-4,5','6,4-5,4','5,3-5,4','6,0-6,3','2,0-5,0','5,2-4,2','4,5-4,2','7,2-7,1'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['3,6-4,6', '2,4-1,2', '5,4-4,4'],
                `expected a practical center-file continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four late middlegame should keep the bishop flexible',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6','0,7-2,6','7,1-7,4','0,1-2,2','9,7-7,6','0,0-0,1','6,2-5,2','0,8-1,8','7,7-7,8','1,8-1,3','7,4-7,1','2,1-2,0','7,1-7,2','1,3-3,3','9,8-9,7','2,7-2,8','9,5-8,4','0,3-1,4','9,6-7,4','0,1-6,1','9,7-2,7','6,1-4,1','2,7-3,7','2,2-0,3','6,0-5,0','4,1-4,5','9,0-8,0','4,5-8,5','8,0-6,0','0,3-2,4','9,1-7,0','3,3-5,3','3,7-6,7','8,5-4,5','6,4-5,4','5,3-5,4','6,0-6,3','2,0-5,0','5,2-4,2','4,5-4,2','7,2-7,1','2,4-1,2','7,1-0,1','0,2-2,4','6,7-2,7','1,2-2,0','0,1-6,1','5,0-5,6','6,1-2,1','4,2-4,1','7,4-5,6','4,1-2,1','2,7-2,6','3,6-4,6','7,0-6,2','3,2-4,2','7,6-9,5','4,2-5,2','6,2-8,3','5,2-5,3','6,3-6,7','4,6-5,6','8,3-6,2','5,4-5,5','9,5-7,4','5,5-8,5','7,8-7,6','5,3-5,2','6,2-5,4','2,1-3,1','2,6-5,6','3,1-9,1','9,2-7,0','2,0-3,2','5,6-2,6','8,5-8,8','5,4-3,3','8,8-9,8','8,4-9,5','5,2-5,3','6,7-6,2','3,2-5,1','7,4-5,3','5,1-7,0','6,2-0,2','1,4-0,3','7,6-0,6'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,4-0,6', `expected 象5退7, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'latest level-five probe should drive the edge cannon forward',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,7-7,8','0,1-2,2','6,2-5,2','0,8-0,7','9,8-9,7','0,6-2,8','9,7-5,7','0,7-1,7','9,2-7,4','3,6-4,6','9,1-7,0','2,1-2,0','7,8-7,7'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,0-6,0', `expected 砲1進4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'latest level-five probe should retreat the loose horse before it hangs',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,7-7,8','0,1-2,2','6,2-5,2','0,8-0,7','9,8-9,7','0,6-2,8','9,7-5,7','0,7-1,7','9,2-7,4','3,6-4,6','9,1-7,0','2,1-2,0','7,8-7,7','2,0-6,0','7,0-9,1','6,0-6,6','9,1-7,2','2,7-4,7','9,0-9,1','1,7-0,7','5,7-5,4','4,7-4,8','7,7-7,8','4,8-4,7','7,2-5,3','3,4-4,4','5,4-5,5','0,7-3,7','7,1-7,2','0,5-1,4','9,1-3,1','3,7-3,6','5,5-5,7','4,7-3,7','5,2-4,2','4,6-5,6','7,4-5,6','6,6-9,6','9,5-8,4'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['2,2-1,0', '2,2-3,4'],
                `expected a practical horse continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'reviewed advanced line should centralize the rook on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,2-1,3', `expected 車3平4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should jump the horse on round 28',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 55),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,7-2,8', `expected 馬8進9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should stabilize the rook file on round 29',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 57),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,6-6,7', `expected 車7平8, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should find the rook sidestep on round 40',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 79),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,0-1,2', `expected 車1平3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should retreat the rook on round 42',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 83),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,7-1,7', `expected 車8退5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should repair the left rook on round 44',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 87),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,0-1,1', `expected 車1平2, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should find the late rook fallback on round 47',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 93),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,6-2,6', `expected 車7退4, got ${game.getMoveKey(result.move)}`);
        }
    }
];

for (const scenario of scenarios) {
    const state = scenario.notationSequence
        ? playNotationSequence(scenario.notationSequence)
        : playSequence(scenario.sequence);
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

