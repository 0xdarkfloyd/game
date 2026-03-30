const assert = require('assert');
const game = require('../game.js');
const debug = game.__debug;

function createEndgameBoard() {
    const board = Array.from({ length: 10 }, () => Array(9).fill(''));
    board[0][4] = 'bG';
    board[0][0] = 'bR';
    board[2][2] = 'bH';
    board[3][4] = 'bS';
    board[9][4] = 'rG';
    board[9][8] = 'rR';
    board[7][6] = 'rH';
    board[6][4] = 'rS';
    return board;
}

const openingBoard = game.cloneBoard(game.initialBoard);
const openingLegal = game.getAllLegalMoves(openingBoard, game.RED_COLOR);

const endgameBoard = createEndgameBoard();
const endgameLegal = game.getAllLegalMoves(endgameBoard, game.RED_COLOR);

game.setAiLevel('beginner');
assert.strictEqual(game.getSearchTimeBudget(openingBoard, openingLegal), 1200);
assert.strictEqual(game.getSearchTimeBudget(endgameBoard, endgameLegal), 1500);
assert.strictEqual(game.getUndoLimit(), Infinity);
assert.deepStrictEqual(game.getPonderBudgets(openingBoard, openingLegal), {
    candidateCount: 1,
    predictTimeBudgetMs: 350,
    replyTimeBudgetMs: 700
});
assert.deepStrictEqual(game.getPonderBudgets(endgameBoard, endgameLegal), {
    candidateCount: 1,
    predictTimeBudgetMs: 420,
    replyTimeBudgetMs: 750
});

game.setAiLevel('intermediate');
assert.strictEqual(game.getSearchTimeBudget(openingBoard, openingLegal), 3600);
assert.strictEqual(game.getSearchTimeBudget(endgameBoard, endgameLegal), 5000);
assert.strictEqual(game.getUndoLimit(), 3);
assert.deepStrictEqual(game.getPonderBudgets(openingBoard, openingLegal), {
    candidateCount: 2,
    predictTimeBudgetMs: 1224,
    replyTimeBudgetMs: 2232
});
assert.deepStrictEqual(game.getPonderBudgets(endgameBoard, endgameLegal), {
    candidateCount: 2,
    predictTimeBudgetMs: 1700,
    replyTimeBudgetMs: 3100
});

game.setAiLevel('advanced');
assert.strictEqual(game.getSearchTimeBudget(openingBoard, openingLegal), 6500);
assert.strictEqual(game.getSearchTimeBudget(endgameBoard, endgameLegal), 10000);
assert.strictEqual(game.getUndoLimit(), 0);
assert.deepStrictEqual(game.getPonderBudgets(openingBoard, openingLegal), {
    candidateCount: 3,
    predictTimeBudgetMs: 2600,
    replyTimeBudgetMs: 5330
});
assert.deepStrictEqual(game.getPonderBudgets(endgameBoard, endgameLegal), {
    candidateCount: 3,
    predictTimeBudgetMs: 4000,
    replyTimeBudgetMs: 8200
});

assert.strictEqual(game.PIECE_LABELS.rR, '俥');
assert.strictEqual(game.shouldLockDifficulty(0, false, true), false);
assert.strictEqual(game.shouldLockDifficulty(1, false, true), true);
assert.strictEqual(game.shouldLockDifficulty(0, true, true), true);
assert.ok(game.drawMarker({ row: 3, col: 2, left: true, right: true }).includes('l -0.08 0'));
assert.ok(game.drawMarker({ row: 3, col: 2, left: true, right: true }).includes('l 0.08 0'));

game.setHumanSide('b');
assert.strictEqual(
    game.getPieceTransform(12, 18),
    'translate3d(calc(-50% + -12px), calc(-50% + -18px), 0) rotate(180deg)'
);
game.setHumanSide('r');

function createSnapshot(board, currentPlayer, remainingUndos, moveSequence, positionHistory) {
    return {
        board: game.cloneBoard(board),
        currentPlayer,
        lastMove: null,
        gameActive: true,
        aiThinking: false,
        remainingUndos,
        statusMessage: '',
        moveLog: [],
        moveSequence: moveSequence.slice(),
        positionHistory: positionHistory.slice()
    };
}

{
    const board0 = game.cloneBoard(game.initialBoard);
    const move1 = game.createMove(board0, 6, 0, 5, 0);
    const board1 = game.applyMoveToBoard(board0, move1);
    const key1 = game.getMoveKey(move1);
    const move2 = game.createMove(board1, 3, 0, 4, 0);
    const board2 = game.applyMoveToBoard(board1, move2);
    const key2 = game.getMoveKey(move2);
    const move3 = game.createMove(board2, 6, 2, 5, 2);
    const board3 = game.applyMoveToBoard(board2, move3);
    const key3 = game.getMoveKey(move3);

    const history0 = [game.getBoardKey(board0, game.RED_COLOR)];
    const history1 = history0.concat(game.getBoardKey(board1, game.BLACK_COLOR));
    const history2 = history1.concat(game.getBoardKey(board2, game.RED_COLOR));
    const history3 = history2.concat(game.getBoardKey(board3, game.BLACK_COLOR));

    game.setGameMode('ai');
    game.setAiLevel('intermediate');
    game.setHumanSide('r');

    debug.setState({
        board: board3,
        currentPlayer: game.BLACK_COLOR,
        humanColor: game.RED_COLOR,
        gameMode: game.GAME_MODES.ai,
        aiLevel: 'intermediate',
        gameActive: true,
        aiThinking: false,
        setupOpen: false,
        remainingUndos: 3,
        moveHistory: [
            createSnapshot(board0, game.RED_COLOR, 3, [], history0),
            createSnapshot(board1, game.BLACK_COLOR, 3, [key1], history1),
            createSnapshot(board2, game.RED_COLOR, 3, [key1, key2], history2)
        ],
        moveSequence: [key1, key2, key3],
        positionHistory: history3
    });

    game.undoMove();
    let state = debug.getState();
    assert.deepStrictEqual(state.board, board2, 'first undo should revert one ply');
    assert.strictEqual(state.currentPlayer, game.RED_COLOR, 'first undo should restore prior side to move');
    assert.strictEqual(state.remainingUndos, 2, 'first undo should consume one chance');
    assert.strictEqual(state.moveHistory.length, 2, 'first undo should remove one snapshot');

    game.undoMove();
    state = debug.getState();
    assert.deepStrictEqual(state.board, board1, 'second undo should revert one more ply');
    assert.strictEqual(state.currentPlayer, game.BLACK_COLOR, 'second undo should restore prior side to move');
    assert.strictEqual(state.remainingUndos, 1, 'second undo should consume one chance');
    assert.strictEqual(state.moveHistory.length, 1, 'second undo should remove one snapshot');

    game.undoMove();
    state = debug.getState();
    assert.deepStrictEqual(state.board, board0, 'third undo should revert one more ply');
    assert.strictEqual(state.currentPlayer, game.RED_COLOR, 'third undo should restore initial side to move');
    assert.strictEqual(state.remainingUndos, 0, 'third undo should consume final chance');
    assert.strictEqual(state.moveHistory.length, 0, 'third undo should remove final snapshot');
    assert.strictEqual(game.canUndoMove(), false, 'fourth undo should be unavailable');

    game.undoMove();
    state = debug.getState();
    assert.deepStrictEqual(state.board, board0, 'extra undo should not change board');
    assert.strictEqual(state.remainingUndos, 0, 'extra undo should not change remaining chances');
}

console.log('difficulty budgets passed');
