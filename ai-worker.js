importScripts('engine-core.js?v=20260326-advancedfix1', 'game.js?v=20260326-advancedfix1');

self.onmessage = event => {
    const data = event.data || {};

    try {
        const engine = ensureEngineCore();
        if (!engine) {
            throw new Error('engine core unavailable');
        }

        const result = engine.computeBestMove({
            board: cloneBoard(data.board || initialBoard),
            currentPlayer: data.currentPlayer || BLACK_COLOR,
            history: cloneMoveSequence(data.history || []),
            positionHistory: clonePositionHistory(data.positionHistory || []),
            timeBudgetMs: data.timeBudgetMs
        });

        self.postMessage({
            requestId: data.requestId,
            result
        });
    } catch (error) {
        self.postMessage({
            requestId: data.requestId,
            error: error && error.message ? error.message : String(error)
        });
    }
};
