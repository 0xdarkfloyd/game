const assert = require('assert');
const game = require('../game.js');

function createEmptyBoard() {
    return Array.from({ length: 10 }, () => Array(9).fill(''));
}

{
    const history = ['h0', 'p1', 'h2', 'h3', 'h4', 'p1', 'h6', 'h7', 'h8', 'p1', 'h10', 'h11', 'current'];
    assert.strictEqual(game.countRecentCycleRepetitions('p1', history), 3);
    assert.strictEqual(game.repeatsRecentCyclePosition('p1', history), true);
    assert.strictEqual(game.repeatsRecentCyclePosition('h0', history), false);
    assert.strictEqual(game.countRecentCycleRepetitions('h8', history), 0);
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
        game.isPerpetualCheckViolation(
            board,
            move,
            game.RED_COLOR,
            ['old0', nextKey, 'old2', 'old3', 'old4', nextKey, 'old6', 'old7', 'old8', 'old9', 'old10', 'old11', 'current']
        ),
        false
    );
    assert.strictEqual(
        game.isPerpetualCheckViolation(
            board,
            move,
            game.RED_COLOR,
            ['old0', nextKey, 'old2', 'old3', 'old4', nextKey, 'old6', 'old7', 'old8', nextKey, 'old10', 'old11', 'current']
        ),
        true
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
            ['h0', nextKey, 'h2', 'h3', 'h4', nextKey, 'h6', 'h7', 'h8', 'h9', 'h10', 'h11', 'current'],
            ['5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7']
        ),
        false
    );
    assert.strictEqual(
        game.isPerpetualChaseViolation(
            board,
            move,
            game.RED_COLOR,
            ['h0', nextKey, 'h2', 'h3', 'h4', nextKey, 'h6', 'h7', 'h8', nextKey, 'h10', 'h11', 'current'],
            ['5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '0,0-0,1', '5,4-5,3', '0,1-0,0']
        ),
        false
    );
    assert.strictEqual(
        game.isPerpetualChaseViolation(
            board,
            move,
            game.RED_COLOR,
            ['h0', nextKey, 'h2', 'h3', 'h4', nextKey, 'h6', 'h7', 'h8', nextKey, 'h10', 'h11', 'current'],
            ['5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7']
        ),
        true
    );
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[5][3] = 'rR';
    board[5][7] = 'bH';
    board[5][8] = 'bR';
    const move = game.createMove(board, 5, 3, 5, 4);
    const nextBoard = game.applyMoveToBoard(board, move);
    const nextKey = game.getBoardKey(nextBoard, game.BLACK_COLOR);

    assert.deepStrictEqual(game.getThreatenedUnguardedTargetKeys(nextBoard, 5, 4), []);
    assert.strictEqual(
        game.isPerpetualChaseViolation(
            board,
            move,
            game.RED_COLOR,
            ['h0', nextKey, 'h2', 'h3', 'h4', nextKey, 'h6', 'h7', 'h8', nextKey, 'h10', 'h11', 'current'],
            ['5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7', '5,4-5,3', '5,7-5,6', '5,4-5,3', '5,6-5,7']
        ),
        false
    );
}

console.log('repetition rules passed');
