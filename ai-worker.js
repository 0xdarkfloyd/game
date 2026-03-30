importScripts('engine-core.js?v=20260330-search2', 'game.js?v=20260330-search2');

function getPonderMoveKey(move) {
    return move ? getMoveKey(move) : '';
}

function getPonderPieceType(move) {
    return move && move.piece ? move.piece[1] : '';
}

function getPonderOriginKey(move) {
    return move ? `${move.fromRow},${move.fromCol}` : '';
}

function pushUniquePonderMove(target, move, seenMoves, seenPieceTypes, seenOrigins) {
    if (!move) {
        return false;
    }

    const moveKey = getPonderMoveKey(move);
    if (seenMoves.has(moveKey)) {
        return false;
    }

    target.push(move);
    seenMoves.add(moveKey);
    seenPieceTypes.add(getPonderPieceType(move));
    seenOrigins.add(getPonderOriginKey(move));
    return true;
}

function selectPonderMoves(rootEntries, candidateCount) {
    if (!Array.isArray(rootEntries) || rootEntries.length === 0) {
        return [];
    }

    const windowSize = Math.max(candidateCount * 6, 12);
    const candidates = rootEntries
        .filter(entry => entry && entry.move)
        .slice(0, windowSize);

    if (candidates.length === 0) {
        return [];
    }

    const selected = [];
    const seenMoves = new Set();
    const seenPieceTypes = new Set();
    const seenOrigins = new Set();

    pushUniquePonderMove(selected, candidates[0].move, seenMoves, seenPieceTypes, seenOrigins);

    for (const entry of candidates) {
        if (selected.length >= candidateCount) {
            break;
        }

        const move = entry.move;
        const pieceType = getPonderPieceType(move);
        const originKey = getPonderOriginKey(move);
        if (seenPieceTypes.has(pieceType) || seenOrigins.has(originKey)) {
            continue;
        }

        pushUniquePonderMove(selected, move, seenMoves, seenPieceTypes, seenOrigins);
    }

    for (const entry of candidates) {
        if (selected.length >= candidateCount) {
            break;
        }

        const move = entry.move;
        const originKey = getPonderOriginKey(move);
        if (seenOrigins.has(originKey)) {
            continue;
        }

        pushUniquePonderMove(selected, move, seenMoves, seenPieceTypes, seenOrigins);
    }

    for (const entry of candidates) {
        if (selected.length >= candidateCount) {
            break;
        }

        pushUniquePonderMove(selected, entry.move, seenMoves, seenPieceTypes, seenOrigins);
    }

    return selected;
}

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
            const predictedMoves = selectPonderMoves(rootEntries, candidateCount);

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
