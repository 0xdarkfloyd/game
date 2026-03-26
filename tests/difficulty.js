const assert = require('assert');
const game = require('../game.js');

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
assert.ok(game.drawMarker({ row: 3, col: 2, left: true, right: true }).includes('l -0.22 0'));
assert.ok(game.drawMarker({ row: 3, col: 2, left: true, right: true }).includes('l 0.22 0'));

game.setHumanSide('b');
assert.strictEqual(
    game.getPieceTransform(12, 18),
    'translate3d(calc(-50% + -12px), calc(-50% + -18px), 0) rotate(180deg)'
);
game.setHumanSide('r');

console.log('difficulty budgets passed');
