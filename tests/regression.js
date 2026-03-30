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

function debugEntries(state, timeBudgetMs = 900) {
    return engine.debugRootEntries({
        board: state.board,
        currentPlayer: state.side,
        history: state.history,
        positionHistory: state.positionHistory,
        timeBudgetMs
    });
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

function assertActiveOrPracticalOpeningReply(result, message) {
    assert(result.move, 'expected a move');
    const practicalSoldierPush =
        result.move.piece === 'bS' &&
        result.move.toCol === result.move.fromCol &&
        [2, 4, 6].includes(result.move.fromCol);
    assert(
        practicalSoldierPush ||
        result.move.captured ||
        ['bR', 'bH', 'bC'].includes(result.move.piece),
        message || `expected active major move or practical soldier push, got ${game.getMoveKey(result.move)}`
    );
    if (!practicalSoldierPush) {
        assertNoPassiveMove(result, message);
    }
}

function assertMoveNotationIn(state, result, expectedNotations, message) {
    assert(result.move, 'expected a move');
    const notation = getMoveNotation(state, result.move);
    assert(
        expectedNotations.includes(notation),
        message || `expected one of ${expectedNotations.join(', ')}, got ${notation}`
    );
}

function assertMoveNotationNotIn(state, result, forbiddenNotations, message) {
    assert(result.move, 'expected a move');
    const notation = getMoveNotation(state, result.move);
    assert(
        !forbiddenNotations.includes(notation),
        message || `unexpected move ${notation}`
    );
}

function assertTopEntryNotPassive(entries, message) {
    assert(entries.length > 0, 'expected root entries');
    assert(!['bA', 'bE', 'bG'].includes(entries[0].move.piece), message || `unexpected passive top move: ${entries[0].move.piece}`);
}

function assertTopEntriesContain(entries, predicate, topN, message) {
    const window = entries.slice(0, topN);
    assert(window.some(entry => predicate(entry.move)), message || `expected matching move in top ${topN}`);
}

function assertMoveKeyRanksAhead(entries, preferredKey, slowerKey, topN, message) {
    const window = entries.slice(0, topN);
    const preferredIndex = window.findIndex(entry => game.getMoveKey(entry.move) === preferredKey);
    const slowerIndex = window.findIndex(entry => game.getMoveKey(entry.move) === slowerKey);
    assert(preferredIndex !== -1, message || `expected ${preferredKey} in top ${topN}`);
    if (slowerIndex !== -1) {
        assert(preferredIndex < slowerIndex, message || `expected ${preferredKey} ahead of ${slowerKey}`);
    }
}

const pressureLineKeys = `
6,6-5,6 0,7-2,6 7,1-7,4 0,1-2,2 7,4-7,2 0,0-0,1 9,1-7,0 2,1-2,0
6,2-5,2 2,0-6,0 9,0-9,1 0,1-9,1 7,0-9,1 6,0-5,0 9,7-7,6 0,8-1,8
7,7-7,8 1,8-1,1 9,8-9,7 2,7-2,8 9,7-2,7 2,2-1,4 9,1-7,0 2,8-1,8
7,2-3,2 1,1-1,2 7,0-5,1 1,2-1,1 5,1-7,2 1,1-1,2 5,2-4,2 1,8-1,6
7,6-5,7 5,0-5,5 5,7-7,6 5,5-2,5 2,7-1,7 1,4-3,3 7,6-5,5 2,5-2,4
7,8-7,6 1,2-1,5 9,6-7,4 2,4-1,4 5,5-4,3 1,5-7,5 9,5-8,4 1,4-1,7
8,4-7,5 3,3-1,4 7,2-5,3 1,7-5,7 5,3-6,5 5,7-0,7 6,8-5,8 1,4-3,3
9,3-8,4 3,3-1,4 3,2-3,1 1,4-1,3 5,6-4,6 3,3-1,2 4,3-3,5 1,6-1,5
3,1-6,1 2,6-1,4 3,5-1,6 1,2-2,4 4,0-3,2 2,2-0,1 9,2-7,0 0,1-2,0
1,7-1,8 2,4-3,2 4,2-4,3 0,1-1,3 6,3-7,3 3,0-4,0 6,3-3,6 1,5-3,5
3,6-1,6 3,5-5,5 1,6-1,7 3,5-5,5 1,7-1,8 3,2-1,1 1,8-0,6 5,0-5,1
6,6-5,6 3,3-2,1 6,5-6,6 2,1-3,3 7,7-7,1 3,3-2,1 8,7-7,6 2,1-2,0
6,6-5,6 2,0-2,2 5,0-4,0 0,0-2,2 7,7-7,1 2,2-0,1 7,1-7,2 0,1-2,2
8,8-7,6 2,2-1,0 9,7-7,8 0,1-2,0 7,8-5,7 2,0-0,1 7,0-6,0 0,1-2,2
7,0-7,1 2,2-0,1 2,7-1,7 0,7-1,7 6,4-5,4 2,2-3,3 6,4-6,5 3,3-5,5
7,1-7,4 5,5-5,3 6,4-5,4 5,3-4,1 5,4-4,4 1,7-4,7 4,4-4,5 6,3-7,5
4,5-4,4 1,5-1,6 4,4-4,5 1,6-1,7 4,5-4,4 1,7-1,6 4,4-4,5 1,6-1,7
4,5-4,4 1,7-1,6
`.trim().split(/\s+/);

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
            assertActiveOrPracticalOpeningReply(result, `expected active development, got ${getMoveNotation(state, result.move)}`);
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
        name: 'opening semi-central rook shift outranks flat center rook drift',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進一', '馬8進7',
            '兵三進一', '車1進1',
            '炮二平三', '車9平8',
            '仕四進五'
        ],
        timeBudgetMs: 1800,
        check(state, result) {
            const entries = debugEntries(state, 1800);
            assertMoveKeyRanksAhead(
                entries,
                '1,0-1,3',
                '1,0-1,4',
                6,
                'opening should prefer a more practical semi-central rook file over a flat center drift'
            );
        }
    },
    {
        name: 'opening practical flank soldier push outranks palace drift',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進一', '馬8進7',
            '兵三進一', '車1進1',
            '炮二平三', '車9平8',
            '仕四進五', '車1平5',
            '傌八進七', '砲8進5',
            '相七進五', '車5平4',
            '兵一進一', '砲2退1',
            '仕五退四', '砲2平3',
            '傌七進八', '車4進4',
            '仕六進五'
        ],
        timeBudgetMs: 2200,
        check(state, result) {
            const entries = debugEntries(state, 2200);
            assertTopEntriesContain(
                entries,
                move => game.getMoveKey(move) === '3,2-4,2',
                6,
                'opening should keep practical 卒3進1 in the front shortlist'
            );
            assertMoveKeyRanksAhead(
                entries,
                '3,2-4,2',
                '0,5-1,4',
                8,
                'opening practical soldier push should outrank quiet advisor development'
            );
        }
    },
    {
        name: 'opening practical flank soldier push outranks idle second rook lift',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進一', '馬8進7',
            '兵三進一', '車1進1',
            '炮二平三', '車9平8',
            '仕四進五', '車1平5',
            '傌八進七', '砲8進5',
            '相七進五', '車5平4',
            '兵一進一', '砲2退1',
            '仕五退四', '砲2平3',
            '傌七進八', '車4進4',
            '仕六進五', '士6進5',
            '俥一平二'
        ],
        timeBudgetMs: 2200,
        check(state, result) {
            const entries = debugEntries(state, 2200);
            assertTopEntriesContain(
                entries,
                move => game.getMoveKey(move) === '3,2-4,2',
                6,
                'opening should still keep practical 卒3進1 ahead after the palace move'
            );
            assertMoveKeyRanksAhead(
                entries,
                '3,2-4,2',
                '0,7-1,7',
                8,
                'opening practical soldier push should outrank an idle home-rook lift'
            );
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
    },
    {
        name: 'pressure ladder prefers active reply over palace drift',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進三', '馬8進7',
            '傌八進七', '車1進1',
            '傌七進六', '車1平5',
            '俥一進一', '車9進1',
            '兵三進一', '卒5進1',
            '炮八平五', '車5平3',
            '兵七進一', '卒3進1',
            '俥一平四', '車9平4',
            '俥九平八', '砲2平1',
            '炮二進二', '卒3進1',
            '傌六進四', '馬7進5',
            '炮五進三', '士4進5',
            '炮二平七'
        ],
        timeBudgetMs: 2000,
        check(state, result) {
            assertActiveMajorReply(result, `expected active reply under repeated pressure, got ${getMoveNotation(state, result.move)}`);
            assertMoveNotationNotIn(state, result, ['士5進4', '象3進5'], 'should not drift into quiet palace move');
        }
    },
    {
        name: 'counterpressure should continue after opponent retreats',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進三', '馬8進7',
            '傌八進七', '車1進1',
            '傌七進六', '車1平5',
            '俥一進一', '車9進1',
            '兵三進一', '卒5進1',
            '炮八平五', '車5平3',
            '兵七進一', '卒3進1',
            '俥一平四', '車9平4',
            '俥九平八', '砲2平1',
            '炮二進二', '卒3進1',
            '傌六進四', '馬7進5',
            '炮五進三', '士4進5',
            '炮二平七', '馬3進4',
            '相七進九', '砲1進4',
            '俥四平六', '砲1退1',
            '兵三進一'
        ],
        timeBudgetMs: 2200,
        check(state, result) {
            assertActiveMajorReply(result, `expected counterpressure continuation, got ${getMoveNotation(state, result.move)}`);
            assertMoveNotationNotIn(state, result, ['士5進4', '士6進5'], 'should not switch to passive palace move');
        }
    },
    {
        name: 'opened attack lane prefers pressure maintenance over quiet reroute',
        notationSequence: [
            '兵七進一', '馬2進3',
            '傌二進三', '馬8進7',
            '傌八進七', '車1進1',
            '傌七進六', '車1平5',
            '俥一進一', '車9進1',
            '兵三進一', '卒5進1',
            '炮八平五', '車5平3',
            '兵七進一', '卒3進1',
            '俥一平四', '車9平4',
            '俥九平八', '砲2平1',
            '炮二進二', '卒3進1',
            '傌六進四', '馬7進5',
            '炮五進三', '士4進5',
            '炮二平七', '馬3進4',
            '相七進九', '砲1進4',
            '俥四平六', '砲1退1',
            '兵三進一', '卒7進1',
            '相三進五', '砲8退1',
            '俥八進七'
        ],
        timeBudgetMs: 2200,
        check(state, result) {
            assertActiveMajorReply(result, `expected pressure-maintaining reply, got ${getMoveNotation(state, result.move)}`);
            assertMoveNotationNotIn(state, result, ['士5退6', '象3進1'], 'should keep the opened lane active');
        }
    },
    {
        name: 'late defense prefers rook or soldier block over king drift',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[2][4] = 'bR';
            board[3][4] = 'bS';
            board[2][7] = 'bC';
            board[9][4] = 'rG';
            board[7][4] = 'rR';
            board[6][5] = 'rC';
            board[6][3] = 'rH';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 2600,
        check(state, result) {
            const entries = debugEntries(state, 2600);
            assert(result.move, 'expected a move');
            assert(['bR', 'bS', 'bC'].includes(result.move.piece), `expected practical defense, got ${game.getMoveKey(result.move)}`);
            assertTopEntryNotPassive(entries, 'late defense should not start with a king/advisor drift');
        }
    },
    {
        name: 'opened file keeps same-lane pressure in advanced search',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[3][4] = 'bR';
            board[2][2] = 'bC';
            board[4][6] = 'bH';
            board[9][4] = 'rG';
            board[8][3] = 'rA';
            board[8][5] = 'rA';
            board[7][4] = 'rR';
            board[7][2] = 'rC';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 3000,
        check(state, result) {
            const entries = debugEntries(state, 3000);
            assertActiveMajorReply(result, `expected continued pressure, got ${game.getMoveKey(result.move)}`);
            assertTopEntriesContain(
                entries,
                move => ['bR', 'bC', 'bH'].includes(move.piece) || move.captured,
                4,
                'advanced shortlist should keep same-lane pressure candidates near the top'
            );
        }
    },
    {
        name: 'advanced replay keeps central soldier pressure candidate near the top',
        sequence: pressureLineKeys.slice(0, 41),
        timeBudgetMs: 3200,
        check(state, result) {
            const entries = debugEntries(state, 3200);
            assertActiveMajorReply(result, `expected active continuation, got ${game.getMoveKey(result.move)}`);
            assertTopEntriesContain(
                entries,
                move => game.getMoveKey(move) === '3,4-4,4',
                8,
                'advanced shortlist should keep central soldier pressure push near the top'
            );
        }
    },
    {
        name: 'advanced replay keeps strategic cannon redeploy near the top',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[5][5] = 'bC';
            board[3][4] = 'bS';
            board[9][4] = 'rG';
            board[8][3] = 'rA';
            board[8][5] = 'rA';
            board[7][5] = 'rR';
            board[7][8] = 'rR';
            board[6][8] = 'rS';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 3600,
        check(state, result) {
            const entries = debugEntries(state, 3600);
            assert(result.move, 'expected a move');
            assertTopEntriesContain(
                entries,
                move => game.getMoveKey(move) === '5,5-5,8',
                15,
                'advanced shortlist should keep strategic cannon redeploy near the top'
            );
        }
    },
    {
        name: 'advanced replay again prefers practical center soldier push',
        customState() {
            const board = createEmptyBoard();
            board[0][4] = 'bG';
            board[0][3] = 'bA';
            board[0][5] = 'bA';
            board[2][4] = 'bR';
            board[2][7] = 'bC';
            board[3][4] = 'bS';
            board[3][6] = 'bS';
            board[2][2] = 'bH';
            board[9][4] = 'rG';
            board[8][3] = 'rA';
            board[8][5] = 'rA';
            board[7][4] = 'rR';
            board[7][7] = 'rC';
            board[6][5] = 'rH';
            board[6][4] = 'rS';
            return {
                board,
                side: game.BLACK_COLOR,
                history: [],
                positionHistory: [game.getBoardKey(board, game.BLACK_COLOR)]
            };
        },
        timeBudgetMs: 3200,
        check(state, result) {
            const entries = debugEntries(state, 3200);
            assert(result.move, 'expected a move');
            assertTopEntriesContain(
                entries,
                move => game.getMoveKey(move) === '3,4-4,4',
                6,
                'advanced shortlist should revisit the center soldier push in late pressure positions'
            );
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
