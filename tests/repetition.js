const assert = require('assert');
const game = require('../game.js');

function createEmptyBoard() {
    return Array.from({ length: 10 }, () => Array(9).fill(''));
}

{
    const history = ['p0', 'p1', 'p2', 'p3', 'p4'];
    assert.strictEqual(game.repeatsRecentCyclePosition('p1', history), true);
    assert.strictEqual(game.repeatsRecentCyclePosition('p0', history), false);
    assert.strictEqual(game.repeatsRecentCyclePosition('p4', history), false);
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[1][0] = 'rR';
    const move = game.createMove(board, 1, 0, 1, 4);
    const nextBoard = game.applyMoveToBoard(board, move);
    const nextKey = game.getBoardKey(nextBoard, game.BLACK_COLOR);

    assert.strictEqual(
        game.isPerpetualCheckViolation(board, move, game.RED_COLOR, ['old0', nextKey, 'old2', 'old3', 'current']),
        true
    );
    assert.strictEqual(
        game.isPerpetualCheckViolation(board, move, game.RED_COLOR, [nextKey, 'old1', 'old2', 'old3', 'old4', 'current']),
        false
    );
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[5][3] = 'rR';
    board[5][7] = 'bH';
    const move = game.createMove(board, 5, 3, 5, 4);
    const nextBoard = game.applyMoveToBoard(board, move);
    const nextKey = game.getBoardKey(nextBoard, game.BLACK_COLOR);

    assert.strictEqual(
        game.isPerpetualChaseViolation(
            board,
            move,
            game.RED_COLOR,
            ['h0', nextKey, 'h2', 'h3', 'current'],
            ['0,0-0,1', '0,0-0,1', '5,4-5,3', '0,0-0,1']
        ),
        true
    );
    assert.strictEqual(
        game.isPerpetualChaseViolation(
            board,
            move,
            game.RED_COLOR,
            [nextKey, 'h1', 'h2', 'h3', 'h4', 'current'],
            ['0,0-0,1', '0,0-0,1', '5,4-5,3', '0,0-0,1']
        ),
        false
    );
}

console.log('repetition rules passed');
