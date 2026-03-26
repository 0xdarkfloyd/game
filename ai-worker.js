importScripts('engine-core.js?v=20260326-timelevels1', 'game.js?v=20260326-timelevels1');

self.onmessage = event => {
    const data = event.data || {};

    try {
        const engine = ensureEngineCore();
        if (!engine) {
            throw new Error('engine core unavailable');
        }

        const board = cloneBoard(data.board || initialBoard);
        const currentPlayer = data.currentPlayer || BLACK_COLOR;
        const history = cloneMoveSequence(data.history || []);
        const positionHistory = clonePositionHistory(data.positionHistory || []);

        if (data.kind === 'ponder') {
            const predicted = engine.computeBestMove({
                board,
                currentPlayer,
                history,
                positionHistory,
                timeBudgetMs: data.predictTimeBudgetMs
            });

            let result = {
                predictedMove: predicted.move || null,
                replyMove: null,
                targetBoardKey: null,
                targetHistoryLength: history.length
            };

            if (predicted.move) {
                const predictedBoard = applyMoveToBoard(board, predicted.move);
                const replyPlayer = otherColor(currentPlayer);
                const replyHistory = cloneMoveSequence(history);
                replyHistory.push(getMoveKey(predicted.move));
                const replyPositionHistory = clonePositionHistory(positionHistory);
                replyPositionHistory.push(getBoardKey(predictedBoard, replyPlayer));
                const reply = engine.computeBestMove({
                    board: predictedBoard,
                    currentPlayer: replyPlayer,
                    history: replyHistory,
                    positionHistory: replyPositionHistory,
                    timeBudgetMs: data.replyTimeBudgetMs
                });

                result = {
                    predictedMove: predicted.move,
                    replyMove: reply.move || null,
                    targetBoardKey: getBoardKey(predictedBoard, replyPlayer),
                    targetHistoryLength: replyHistory.length
                };
            }

            self.postMessage({
                requestId: data.requestId,
                kind: 'ponder',
                result
            });
            return;
        }

        const result = engine.computeBestMove({
            board,
            currentPlayer,
            history,
            positionHistory,
            timeBudgetMs: data.timeBudgetMs
        });

        self.postMessage({
            requestId: data.requestId,
            kind: 'bestMove',
            result
        });
    } catch (error) {
        self.postMessage({
            requestId: data.requestId,
            error: error && error.message ? error.message : String(error)
        });
    }
};
