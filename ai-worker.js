importScripts('engine-core.js?v=20260327-multiponder1', 'game.js?v=20260327-multiponder1');

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
            const candidateCount = Math.max(1, Math.min(3, data.candidateCount || 1));
            const weightedShares = candidateCount === 1
                ? [1]
                : candidateCount === 2
                    ? [0.65, 0.35]
                    : [0.5, 0.3, 0.2];
            const rootEntries = engine.debugRootEntries({
                board,
                currentPlayer,
                history,
                positionHistory,
                timeBudgetMs: data.predictTimeBudgetMs
            });
            const predictedMoves = [];
            const seenMoveKeys = new Set();

            for (const entry of rootEntries) {
                if (!entry || !entry.move) {
                    continue;
                }

                const moveKey = getMoveKey(entry.move);
                if (seenMoveKeys.has(moveKey)) {
                    continue;
                }

                predictedMoves.push(entry.move);
                seenMoveKeys.add(moveKey);
                if (predictedMoves.length >= candidateCount) {
                    break;
                }
            }

            if (predictedMoves.length === 0) {
                const predicted = engine.computeBestMove({
                    board,
                    currentPlayer,
                    history,
                    positionHistory,
                    timeBudgetMs: data.predictTimeBudgetMs
                });
                if (predicted.move) {
                    predictedMoves.push(predicted.move);
                }
            }

            const lines = [];
            for (let index = 0; index < predictedMoves.length; index++) {
                const predictedMove = predictedMoves[index];
                const predictedBoard = applyMoveToBoard(board, predictedMove);
                const replyPlayer = otherColor(currentPlayer);
                const replyHistory = cloneMoveSequence(history);
                replyHistory.push(getMoveKey(predictedMove));
                const replyPositionHistory = clonePositionHistory(positionHistory);
                replyPositionHistory.push(getBoardKey(predictedBoard, replyPlayer));
                const replyTimeBudgetMs = Math.max(350, Math.round(data.replyTimeBudgetMs * weightedShares[index]));
                const reply = engine.computeBestMove({
                    board: predictedBoard,
                    currentPlayer: replyPlayer,
                    history: replyHistory,
                    positionHistory: replyPositionHistory,
                    timeBudgetMs: replyTimeBudgetMs
                });

                lines.push({
                    predictedMove,
                    replyMove: reply.move || null,
                    targetBoardKey: getBoardKey(predictedBoard, replyPlayer),
                    targetHistoryLength: replyHistory.length
                });
            }

            self.postMessage({
                requestId: data.requestId,
                kind: 'ponder',
                result: { lines }
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
