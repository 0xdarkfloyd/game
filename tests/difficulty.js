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

console.log('difficulty budgets passed');
