self.importScripts('game.js');

self.onmessage = event => {
    const { requestId, board, color, historySequence, positionKeys } = event.data || {};

    try {
        const move = chooseComputerMove(board, color, historySequence, positionKeys);
        self.postMessage({ requestId, move });
    } catch (error) {
        self.postMessage({
            requestId,
            move: null,
            error: error instanceof Error ? error.message : String(error)
        });
    }
};
