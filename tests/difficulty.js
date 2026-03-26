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

game.setAiLevel('intermediate');
assert.strictEqual(game.getSearchTimeBudget(openingBoard, openingLegal), 2200);
assert.strictEqual(game.getSearchTimeBudget(endgameBoard, endgameLegal), 3000);

game.setAiLevel('advanced');
assert.strictEqual(game.getSearchTimeBudget(openingBoard, openingLegal), 3600);
assert.strictEqual(game.getSearchTimeBudget(endgameBoard, endgameLegal), 5000);
assert.deepStrictEqual(game.getPonderBudgets(openingBoard, openingLegal), {
    predictTimeBudgetMs: 1440,
    replyTimeBudgetMs: 2952
});
assert.deepStrictEqual(game.getPonderBudgets(endgameBoard, endgameLegal), {
    predictTimeBudgetMs: 2000,
    replyTimeBudgetMs: 4100
});

assert.strictEqual(game.PIECE_LABELS.rR, '俥');
assert.strictEqual(game.shouldLockDifficulty(0, false, true), false);
assert.strictEqual(game.shouldLockDifficulty(1, false, true), true);
assert.strictEqual(game.shouldLockDifficulty(0, true, true), true);

game.setHumanSide('b');
assert.strictEqual(
    game.getPieceTransform(12, 18),
    'translate3d(calc(-50% + -12px), calc(-50% + -18px), 0) rotate(180deg)'
);
game.setHumanSide('r');

console.log('difficulty budgets passed');
