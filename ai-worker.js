importScripts('game.js');

self.onmessage = event => {
    const data = event.data || {};

    try {
        const boardState = cloneBoard(data.board || initialBoard);
        const color = data.color || BLACK_COLOR;
        const historySequence = cloneMoveSequence(data.historySequence || []);

        humanColor = otherColor(color);
        computerColor = color;
        moveSequence = historySequence;
        positionHistory = clonePositionHistory(data.positionHistory || []);
        transpositionTable.clear();

        const move = chooseComputerMove(boardState, color, historySequence);
        self.postMessage({ id: data.id, move });
    } catch (error) {
        self.postMessage({
            id: data.id,
            error: error && error.message ? error.message : String(error)
        });
    }
};
