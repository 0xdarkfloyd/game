(function (root, factory) {
    if (typeof module !== 'undefined' && module.exports) {
        module.exports = factory();
        return;
    }

    root.createXiangqiEngineCore = factory().createXiangqiEngineCore;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
    const CONFIG = {
        checkInterval: 4,
        quiescenceDepth: 3,
        phase: {
            opening: { time: 850, maxDepth: 4, rootLimit: 10, branchLimit: 10, quiescenceLimit: 6 },
            middlegame: { time: 950, maxDepth: 5, rootLimit: 12, branchLimit: 12, quiescenceLimit: 8 },
            endgame: { time: 1000, maxDepth: 6, rootLimit: 18, branchLimit: 16, quiescenceLimit: 10 }
        },
        values: {
            R: { opening: 920, middlegame: 930, endgame: 900 },
            H: { opening: 405, middlegame: 435, endgame: 470 },
            E: { opening: 220, middlegame: 215, endgame: 200 },
            A: { opening: 225, middlegame: 215, endgame: 205 },
            C: { opening: 505, middlegame: 465, endgame: 390 },
            S: { opening: 95, middlegame: 125, endgame: 165 },
            G: { opening: 100000, middlegame: 100000, endgame: 100000 }
        },
        mobility: {
            opening: { R: 4, H: 6, E: 0, A: 0, G: 0, C: 5, S: 1 },
            middlegame: { R: 5, H: 7, E: 1, A: 1, G: 0, C: 5, S: 2 },
            endgame: { R: 4, H: 7, E: 0, A: 0, G: 0, C: 3, S: 4 }
        }
    };

    function createXiangqiEngineCore(deps) {
        const {
            RED_COLOR,
            BLACK_COLOR,
            MATE_SCORE,
            OPENING_BOOK,
            cloneBoard,
            cloneMoveSequence,
            clonePositionHistory,
            otherColor,
            countPieces,
            findGeneral,
            applyMoveToBoard,
            getBoardKey,
            getMoveKey,
            getOpeningBookKey,
            parseMoveKey,
            mirrorMoveKey,
            mirrorMoveDescriptor,
            getAllLegalMoves,
            getPseudoMoves,
            getAttackerValues,
            isInCheck,
            isSquareAttacked,
            hasCrossedRiver,
            filterPlayableMoves,
            sameMove
        } = deps;

        const homeRow = color => color === RED_COLOR ? 9 : 0;
        const naturalHorseRow = color => color === RED_COLOR ? 7 : 2;
        const cannonRow = color => color === RED_COLOR ? 7 : 2;
        const soldierRow = color => color === RED_COLOR ? 6 : 3;

        function getPhase(board, history) {
            const pieceCount = countPieces(board);
            if (pieceCount >= 28 || history.length < 10) {
                return 'opening';
            }
            if (pieceCount >= 16) {
                return 'middlegame';
            }
            return 'endgame';
        }

        function getPhaseConfig(board, history, overrideTimeBudgetMs) {
            const phase = getPhase(board, history);
            return {
                phase,
                ...CONFIG.phase[phase],
                time: overrideTimeBudgetMs || CONFIG.phase[phase].time
            };
        }

        function countPieceType(board, color, type) {
            let count = 0;
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] === `${color}${type}`) {
                        count++;
                    }
                }
            }
            return count;
        }

        function countUndevelopedRooks(board, color) {
            const row = homeRow(color);
            let count = 0;
            if (board[row][0] === `${color}R`) {
                count++;
            }
            if (board[row][8] === `${color}R`) {
                count++;
            }
            return count;
        }

        function countUndevelopedHorses(board, color) {
            const row = homeRow(color);
            let count = 0;
            if (board[row][1] === `${color}H`) {
                count++;
            }
            if (board[row][7] === `${color}H`) {
                count++;
            }
            return count;
        }

        function countDevelopedHorses(board, color) {
            return 2 - countUndevelopedHorses(board, color);
        }

        function countUndevelopedMajors(board, color) {
            return countUndevelopedRooks(board, color) + countUndevelopedHorses(board, color);
        }

        function hasCenteredCannon(board, color) {
            return board[cannonRow(color)][4] === `${color}C`;
        }

        function hasHomeRookDevelopment(board, color) {
            const row = homeRow(color);
            for (const rookCol of [0, 8]) {
                if (board[row][rookCol] !== `${color}R`) {
                    continue;
                }
                const rookMoves = getAllLegalMoves(board, color)
                    .filter(move => move.piece === `${color}R` && move.fromRow === row && move.fromCol === rookCol && !move.captured);
                if (rookMoves.length > 0) {
                    return true;
                }
            }
            return false;
        }

        function countPiecesBetweenOnFile(board, col, startRow, endRow) {
            let blockers = 0;
            const step = startRow < endRow ? 1 : -1;
            for (let row = startRow + step; row !== endRow; row += step) {
                if (board[row][col]) {
                    blockers++;
                }
            }
            return blockers;
        }

        function pieceValue(type, phase) {
            return CONFIG.values[type][phase];
        }

        function pieceSquareBonus(piece, row, col, phase) {
            const color = piece[0];
            const type = piece[1];
            const centerDistance = Math.abs(4 - col);

            if (type === 'S') {
                const progress = color === RED_COLOR ? 9 - row : row;
                let score = progress * (phase === 'opening' ? 5 : phase === 'middlegame' ? 8 : 10);
                if (hasCrossedRiver(color, row)) {
                    score += phase === 'opening' ? 8 : phase === 'middlegame' ? 20 : 28;
                }
                return score + Math.max(0, 8 - centerDistance * 2);
            }

            if (type === 'H') {
                let score = Math.max(0, 20 - centerDistance * 4);
                if ((col === 0 || col === 8) && row !== homeRow(color)) {
                    score -= 20;
                }
                return score;
            }

            if (type === 'C') {
                let score = Math.max(0, 18 - centerDistance * 3);
                if (phase === 'opening' && Math.abs(col - 4) >= 3) {
                    score -= 12;
                }
                return score;
            }

            if (type === 'R') {
                let score = Math.max(0, 12 - centerDistance * 2);
                if (phase !== 'opening' && row !== homeRow(color)) {
                    score += 10;
                }
                return score;
            }

            if (type === 'E' || type === 'A') {
                return phase === 'opening'
                    ? 14 - Math.abs(row - homeRow(color)) * 5 - centerDistance * 2
                    : 6 - centerDistance;
            }

            if (type === 'G') {
                return (col === 4 ? 16 : 0) - (phase === 'opening' && row !== homeRow(color) ? 18 : 0);
            }

            return 0;
        }

        function evaluateKingSafety(board, color, phase) {
            const general = findGeneral(board, color);
            if (!general) {
                return -2000;
            }

            const opponent = otherColor(color);
            const row0 = homeRow(color);
            const forward = color === RED_COLOR ? -1 : 1;
            const advisors = countPieceType(board, color, 'A');
            const elephants = countPieceType(board, color, 'E');
            let score = advisors * (phase === 'opening' ? 20 : 12) + elephants * (phase === 'opening' ? 18 : 10);

            if (general.row !== row0) {
                score -= phase === 'opening' ? 40 : 24;
            }
            if (general.col !== 4) {
                score -= 12;
            }

            const frontRow = general.row + forward;
            if (frontRow >= 0 && frontRow < 10 && !board[frontRow][general.col]) {
                score -= phase === 'opening' ? 14 : 18;
            }

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== opponent) {
                        continue;
                    }

                    if (col === general.col) {
                        const blockers = countPiecesBetweenOnFile(board, col, row, general.row);
                        if (piece[1] === 'R' && blockers === 0) {
                            score -= 68;
                        }
                        if (piece[1] === 'C' && blockers === 1) {
                            score -= 62;
                        }
                    }

                    if (piece[1] === 'H' && Math.abs(row - general.row) <= 3 && Math.abs(col - general.col) <= 2) {
                        score -= 18;
                    }

                    if ((piece[1] === 'R' || piece[1] === 'C') && Math.abs(col - general.col) <= 1) {
                        const advanced = opponent === RED_COLOR ? row <= 5 : row >= 4;
                        if (advanced) {
                            score -= piece[1] === 'R' ? 18 : 12;
                        }
                    }
                }
            }

            return score;
        }

        function evaluateRookPressure(board, color) {
            const enemyGeneral = findGeneral(board, otherColor(color));
            if (!enemyGeneral) {
                return 0;
            }

            let score = 0;
            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color) {
                        continue;
                    }

                    if (piece[1] !== 'R' && piece[1] !== 'C') {
                        continue;
                    }

                    if (col === enemyGeneral.col) {
                        const blockers = countPiecesBetweenOnFile(board, col, row, enemyGeneral.row);
                        if (piece[1] === 'R' && blockers === 0) {
                            score += 24;
                        }
                        if (piece[1] === 'C' && blockers === 1) {
                            score += 22;
                        }
                    }

                    if (Math.abs(col - enemyGeneral.col) <= 1 && Math.abs(row - enemyGeneral.row) <= 4) {
                        score += piece[1] === 'R' ? 12 : 8;
                    }
                }
            }

            return score;
        }

        function evaluateDevelopment(board, color, phase) {
            if (phase !== 'opening') {
                return 0;
            }

            const row0 = homeRow(color);
            const undevelopedMajors = countUndevelopedMajors(board, color);
            const undevelopedRooks = countUndevelopedRooks(board, color);
            const undevelopedHorses = countUndevelopedHorses(board, color);
            const developedHorses = countDevelopedHorses(board, color);
            const centralCannonPressure = hasCenteredCannon(board, color) || hasCenteredCannon(board, otherColor(color));
            let score = -undevelopedMajors * 10;

            if (undevelopedRooks === 2 && developedHorses === 2) {
                score -= 42;
            }

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color) {
                        continue;
                    }

                    if (piece[1] === 'R' && !(row === row0 && (col === 0 || col === 8))) {
                        score += row === row0 ? 34 : 48;
                        score += Math.max(0, 12 - Math.abs(4 - col) * 3);
                        if (undevelopedHorses === 1 && !centralCannonPressure) {
                            score -= row === row0 ? 32 : 48;
                        }
                    }

                    if (piece[1] === 'H') {
                        if (row === naturalHorseRow(color) && (col === 2 || col === 6)) {
                            score += 20;
                            if (undevelopedHorses === 1 && !centralCannonPressure) {
                                score += 28;
                            }
                        } else if (row !== row0) {
                            score += 4;
                        }

                        if ((col === 0 || col === 8) && row !== row0) {
                            score -= 20;
                        }
                        if (Math.abs(col - 4) <= 1 && Math.abs(row - row0) === 1) {
                            score -= 44;
                        }
                    }

                    if (piece[1] === 'C') {
                        if (row === cannonRow(color) && col === 4) {
                            score += 16;
                        }

                        const edgeDistance = Math.abs(col - 4);
                        if (undevelopedRooks >= 1 && edgeDistance >= 3) {
                            score -= 18 + edgeDistance * 4;
                        }
                        const deepRaid = color === RED_COLOR ? row <= 4 : row >= 5;
                        if (deepRaid && undevelopedMajors >= 2) {
                            score -= 48;
                        }
                    }

                    if ((piece[1] === 'A' || piece[1] === 'E') && undevelopedMajors >= 2 && row !== row0) {
                        score -= 30;
                    }

                    if (piece[1] === 'S' && row !== soldierRow(color)) {
                        const advance = Math.abs(row - soldierRow(color));
                        if (col === 4) {
                            score += advance === 1 ? 2 : -6;
                        } else {
                            score -= 10 + advance * 6;
                        }

                        if ((col === 0 || col === 8) && undevelopedMajors >= 2) {
                            score -= 12;
                        }
                    }
                }
            }

            if (undevelopedRooks >= 1 && developedHorses === 2 && hasHomeRookDevelopment(board, color)) {
                score -= 26;
            }

            return score;
        }

        function evaluateSoldiers(board, color, phase) {
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] !== `${color}S`) {
                        continue;
                    }

                    if (hasCrossedRiver(color, row)) {
                        score += phase === 'opening' ? 4 : phase === 'middlegame' ? 14 : 22;
                    }

                    for (const nextCol of [col - 1, col + 1]) {
                        if (nextCol < 0 || nextCol > 8) {
                            continue;
                        }
                        if (board[row][nextCol] === `${color}S`) {
                            score += phase === 'endgame' ? 10 : 4;
                        }
                    }
                }
            }

            return score;
        }

        function evaluateExchangeSafety(board, color, phase) {
            const opponent = otherColor(color);
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color || !['R', 'H', 'C'].includes(piece[1])) {
                        continue;
                    }
                    if (!isSquareAttacked(board, row, col, opponent)) {
                        continue;
                    }

                    const attackers = getAttackerValues(board, row, col, opponent);
                    const defenders = getAttackerValues(board, row, col, color);
                    const value = pieceValue(piece[1], phase);

                    if (attackers.length === 0) {
                        continue;
                    }
                    if (defenders.length === 0) {
                        score -= Math.round(value * 0.1);
                        continue;
                    }

                    if (attackers[0] < value && attackers[0] <= defenders[0]) {
                        score -= Math.round((value - attackers[0]) * 0.15);
                    } else if (attackers.length > defenders.length) {
                        score -= 12 * Math.min(2, attackers.length - defenders.length);
                    }
                }
            }

            return score;
        }

        function evaluateSide(board, color, phase) {
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color) {
                        continue;
                    }

                    const type = piece[1];
                    score += pieceValue(type, phase);
                    score += pieceSquareBonus(piece, row, col, phase);
                    score += getPseudoMoves(board, row, col).length * CONFIG.mobility[phase][type];
                }
            }

            score += evaluateDevelopment(board, color, phase);
            score += evaluateKingSafety(board, color, phase);
            score += evaluateSoldiers(board, color, phase);
            score += evaluateRookPressure(board, color);
            return score;
        }

        function evaluateBoardForColor(board, color, history) {
            const phase = getPhase(board, history);
            let score = evaluateSide(board, RED_COLOR, phase) - evaluateSide(board, BLACK_COLOR, phase);

            if (isInCheck(board, BLACK_COLOR)) {
                score += phase === 'opening' ? 24 : 36;
            }
            if (isInCheck(board, RED_COLOR)) {
                score -= phase === 'opening' ? 24 : 36;
            }

            return color === RED_COLOR ? score : -score;
        }

        function getSideHistoryMoves(history, color) {
            return history
                .filter((_, index) => (index % 2 === 0) === (color === RED_COLOR))
                .map(parseMoveKey);
        }

        function isExactReverseMove(left, right) {
            return Boolean(left) && Boolean(right) &&
                left.fromRow === right.toRow &&
                left.fromCol === right.toCol &&
                left.toRow === right.fromRow &&
                left.toCol === right.fromCol;
        }

        function getOpeningSuggestionMap(board, color, history, legalMoves) {
            const suggestions = new Map();
            if (!OPENING_BOOK || history.length >= 6) {
                return suggestions;
            }

            const legalByKey = new Map(legalMoves.map(move => [getMoveKey(move), move]));
            const direct = OPENING_BOOK[getOpeningBookKey(color, history)] || [];
            for (let index = 0; index < direct.length; index++) {
                const key = getMoveKey(direct[index]);
                if (legalByKey.has(key)) {
                    suggestions.set(key, Math.max(suggestions.get(key) || 0, 40 - index * 8));
                }
            }

            const mirroredHistory = history.map(mirrorMoveKey);
            const mirrored = OPENING_BOOK[getOpeningBookKey(color, mirroredHistory)] || [];
            for (let index = 0; index < mirrored.length; index++) {
                const mirroredMove = mirrorMoveDescriptor(mirrored[index]);
                const key = getMoveKey(mirroredMove);
                if (legalByKey.has(key)) {
                    suggestions.set(key, Math.max(suggestions.get(key) || 0, 40 - index * 8));
                }
            }

            return suggestions;
        }

        function getPracticalOpeningBias(board, move, color, history, openingContext) {
            if (getPhase(board, history) !== 'opening') {
                return 0;
            }

            const undevelopedMajors = openingContext.undevelopedMajors;
            const undevelopedRooks = openingContext.undevelopedRooks;
            const undevelopedHorses = openingContext.undevelopedHorses;
            const developedHorses = openingContext.developedHorses;
            const rookMovesAvailable = openingContext.rookMovesAvailable;
            const lastOwnMove = openingContext.lastOwnMove;
            const previousOwnMove = openingContext.previousOwnMove;
            const ownCenteredCannon = openingContext.ownCenteredCannon;
            const opponentCenteredCannon = openingContext.opponentCenteredCannon;
            const centralCannonPressure = ownCenteredCannon || opponentCenteredCannon;
            let score = 0;

            if (move.piece[1] === 'R' && move.fromRow === homeRow(color)) {
                score += 72 + (move.toRow === move.fromRow ? 12 - Math.abs(4 - move.toCol) * 2 : 24);
                if (undevelopedHorses === 2) {
                    score -= move.toRow === move.fromRow ? 18 : 58;
                } else if (undevelopedHorses === 1 && move.toRow !== move.fromRow) {
                    score -= 20;
                }
                if (undevelopedHorses === 1 && !centralCannonPressure) {
                    score -= move.toRow === move.fromRow ? 34 : 76;
                } else if (opponentCenteredCannon && move.toRow !== move.fromRow) {
                    score += 18;
                }
            }
            if (!move.captured && move.piece[1] === 'R' && move.fromRow !== homeRow(color) && undevelopedMajors >= 1) {
                score -= undevelopedMajors >= 3 ? 34 : undevelopedMajors === 2 ? 24 : 14;
                if (undevelopedHorses === 1 && !centralCannonPressure) {
                    score -= 34;
                }
            }

            if (move.piece[1] === 'H' && move.fromRow === homeRow(color)) {
                score += 18;
                if (undevelopedHorses >= 1) {
                    score += 14;
                }
                if (undevelopedHorses === 2) {
                    score += 18;
                } else if (!centralCannonPressure) {
                    score += 42;
                }
            }
            if (!move.captured && move.piece[1] === 'H') {
                const forward = color === RED_COLOR ? move.toRow < move.fromRow : move.toRow > move.fromRow;
                if (!forward && move.fromRow !== homeRow(color)) {
                    score -= undevelopedMajors >= 2 ? 48 : 24;
                }
                if (move.fromRow === naturalHorseRow(color) && (move.fromCol === 2 || move.fromCol === 6)) {
                    score -= undevelopedRooks >= 1 ? 38 : 18;
                }
                if ((move.toCol === 0 || move.toCol === 8) && move.toRow !== homeRow(color)) {
                    score -= undevelopedRooks >= 1 ? 42 : 16;
                }
            }

            if (!move.captured && move.piece[1] === 'C') {
                if (move.fromRow === cannonRow(color) && move.toRow === cannonRow(color) && move.toCol === 4) {
                    score += 24;
                } else if (move.fromRow === cannonRow(color) && move.toRow === cannonRow(color)) {
                    score -= 16 + Math.abs(4 - move.toCol) * 4;
                } else {
                    const deepRaid = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
                    if (deepRaid && undevelopedMajors >= 2) {
                        score -= move.captured ? 46 : 64;
                    } else if (undevelopedRooks >= 1 && move.toCol !== 4) {
                        score -= 22;
                    }
                }

                if (undevelopedHorses >= 1 && move.toCol !== 4) {
                    score -= undevelopedHorses === 2 ? 46 : 28;
                }
                if (undevelopedHorses === 2 && move.toRow !== cannonRow(color)) {
                    score -= 22;
                }
                if (move.fromRow !== cannonRow(color) && undevelopedMajors >= 1) {
                    score -= undevelopedMajors >= 3 ? 28 : undevelopedMajors === 2 ? 20 : 12;
                }
                if (undevelopedHorses === 1 && !centralCannonPressure) {
                    score -= move.toCol === 4 ? 44 : 26;
                }
            }

            if (!move.captured && move.piece[1] === 'S') {
                if (move.fromRow !== soldierRow(color)) {
                    score -= move.fromCol === 4 ? 14 : 30;
                } else if (move.fromCol === 4) {
                    score += undevelopedMajors >= 3 ? 0 : 6;
                } else {
                    score -= undevelopedMajors >= 2 ? 24 : 12;
                }
            }

            if (!move.captured && (move.piece[1] === 'A' || move.piece[1] === 'E')) {
                score -= undevelopedMajors >= 2 ? 54 : 24;
            }
            if (move.piece[1] === 'G') {
                score -= 120;
            }

            if (rookMovesAvailable && !move.captured) {
                if (move.piece[1] === 'R' && move.fromRow === homeRow(color)) {
                    score += undevelopedRooks === 2 ? 36 : 18;
                    if (undevelopedHorses === 1 && !centralCannonPressure) {
                        score -= 30;
                    }
                } else if (developedHorses === 2) {
                    score -= move.piece[1] === 'S' ? 36 : 48;
                } else if (move.piece[1] === 'C' || move.piece[1] === 'A' || move.piece[1] === 'E') {
                    score -= 26;
                }
            }

            if (undevelopedHorses >= 1 && !move.captured) {
                if (move.piece[1] === 'C') {
                    score -= undevelopedHorses === 2 ? 24 : 10;
                } else if (move.piece[1] === 'H' && move.fromRow === homeRow(color)) {
                    score += undevelopedHorses === 2 ? 10 : 6;
                } else if (move.piece[1] === 'R' && move.fromRow === homeRow(color) && move.toRow !== move.fromRow) {
                    score -= undevelopedHorses === 2 ? 22 : 8;
                }
            }

            if (lastOwnMove && lastOwnMove.toRow === move.fromRow && lastOwnMove.toCol === move.fromCol && !move.captured) {
                score -= move.piece[1] === 'R' ? 12 : 36;
                if (isExactReverseMove(lastOwnMove, move)) {
                    score -= move.piece[1] === 'R' ? 22 : 58;
                }
            }
            if (previousOwnMove &&
                previousOwnMove.toRow === move.fromRow &&
                previousOwnMove.toCol === move.fromCol &&
                !move.captured) {
                score -= 12;
            }

            return score;
        }

        function getExposurePenalty(nextBoard, move, color, history) {
            const phase = getPhase(nextBoard, history);
            const opponent = otherColor(color);
            if (move.piece[1] === 'G' || !isSquareAttacked(nextBoard, move.toRow, move.toCol, opponent)) {
                return 0;
            }

            const attackers = getAttackerValues(nextBoard, move.toRow, move.toCol, opponent);
            const defenders = getAttackerValues(nextBoard, move.toRow, move.toCol, color);
            const movedValue = pieceValue(move.piece[1], phase);
            const capturedValue = move.captured ? pieceValue(move.captured[1], phase) : 0;
            let penalty = 0;

            if (defenders.length === 0) {
                penalty += Math.round(movedValue * (move.captured ? 0.24 : 0.34));
            } else {
                if (attackers[0] < movedValue && attackers[0] <= defenders[0]) {
                    penalty += Math.round((movedValue - attackers[0]) * 0.55);
                }
                if (attackers.length > defenders.length) {
                    penalty += 12 * Math.min(3, attackers.length - defenders.length);
                }
            }

            if (move.captured && capturedValue < attackers[0]) {
                penalty += Math.round((attackers[0] - capturedValue) * 0.35);
            }

            if (move.piece[1] === 'R' || move.piece[1] === 'C') {
                penalty += 10;
            } else if (move.piece[1] === 'H') {
                penalty += 6;
            }

            return penalty;
        }

        function getTacticalBias(board, nextBoard, move, color, history) {
            const phase = getPhase(board, history);
            const capturedValue = move.captured ? pieceValue(move.captured[1], phase) : 0;
            const moverValue = pieceValue(move.piece[1], phase);
            let score = move.captured ? capturedValue * 0.18 : 0;

            if (move.captured) {
                score += capturedValue - moverValue * 0.06;
            }
            if (isInCheck(nextBoard, otherColor(color))) {
                score += phase === 'opening' ? 26 : 40;
            }

            score -= getExposurePenalty(nextBoard, move, color, history);
            return Math.round(score);
        }

        function buildRootEntries(board, color, history, positionHistory, searchConfig, legalMoves) {
            const suggestions = getOpeningSuggestionMap(board, color, history, legalMoves);
            const sameSideMoves = getSideHistoryMoves(history, color);
            const openingContext = {
                undevelopedMajors: countUndevelopedMajors(board, color),
                undevelopedRooks: countUndevelopedRooks(board, color),
                undevelopedHorses: countUndevelopedHorses(board, color),
                developedHorses: countDevelopedHorses(board, color),
                rookMovesAvailable: countUndevelopedRooks(board, color) >= 1 && hasHomeRookDevelopment(board, color),
                ownCenteredCannon: hasCenteredCannon(board, color),
                opponentCenteredCannon: hasCenteredCannon(board, otherColor(color)),
                lastOwnMove: sameSideMoves[sameSideMoves.length - 1] || null,
                previousOwnMove: sameSideMoves.length > 1 ? sameSideMoves[sameSideMoves.length - 2] : null
            };
            const quickEntries = legalMoves.map(move => {
                const bookBias = suggestions.get(getMoveKey(move)) || 0;
                const practicalBias = getPracticalOpeningBias(board, move, color, history, openingContext);
                const quietCenter = move.captured ? 0 : Math.max(0, 4 - Math.abs(4 - move.toCol)) * 3;
                return {
                    move,
                    quickScore: bookBias + practicalBias + quietCenter,
                    policyBias: bookBias + practicalBias
                };
            }).sort((left, right) => right.quickScore - left.quickScore);

            const shortlist = quickEntries.slice(0, Math.min(legalMoves.length, Math.max(searchConfig.rootLimit * 2, 12)));
            const entries = shortlist.map(entry => ({
                move: entry.move,
                nextBoard: applyMoveToBoard(board, entry.move),
                sortScore: entry.quickScore,
                policyBias: entry.policyBias
            })).sort((left, right) => right.sortScore - left.sortScore);

            const bestScore = entries[0] ? entries[0].sortScore : 0;
            const filtered = [];
            const minimumKeep = Math.min(8, entries.length);

            for (const entry of entries) {
                const slowOpeningMove = searchConfig.phase === 'opening' &&
                    !entry.move.captured &&
                    entry.policyBias < -70 &&
                    entry.sortScore < bestScore - 70;

                if (filtered.length < minimumKeep || !slowOpeningMove) {
                    filtered.push(entry);
                }
            }

            return filtered.slice(0, Math.min(searchConfig.rootLimit, filtered.length));
        }

        function scoreMoveForOrdering(board, move, phase, ttMove) {
            if (sameMove(move, ttMove)) {
                return 10000000;
            }

            const capturedValue = move.captured ? pieceValue(move.captured[1], phase) : 0;
            const moverValue = pieceValue(move.piece[1], phase);
            let score = capturedValue * 10 - moverValue * 0.2;

            if (move.captured && move.captured[1] === 'G') {
                score += MATE_SCORE;
            }
            if (move.piece[1] === 'R') {
                score += 10;
            }
            if (move.piece[1] === 'C') {
                score += phase === 'opening' ? 4 : 6;
            }
            if (move.piece[1] === 'S') {
                score += phase === 'endgame' ? 10 : 2;
            }

            return score + Math.max(0, 4 - Math.abs(4 - move.toCol)) * 5;
        }

        function orderMoves(board, moves, phase, ttMove, limit) {
            const ordered = moves
                .slice()
                .sort((left, right) => scoreMoveForOrdering(board, right, phase, ttMove) - scoreMoveForOrdering(board, left, phase, ttMove));
            return typeof limit === 'number' ? ordered.slice(0, limit) : ordered;
        }

        function shouldAbort(context) {
            if (context.timedOut) {
                return true;
            }

            context.nodes += 1;
            if (context.nodes % CONFIG.checkInterval !== 0) {
                return false;
            }

            if (Date.now() >= context.deadline) {
                context.timedOut = true;
                return true;
            }

            return false;
        }

        function quiescence(board, color, alpha, beta, context, history, depth) {
            const standPat = evaluateBoardForColor(board, color, history);
            if (shouldAbort(context)) {
                return { score: standPat, aborted: true, pv: [] };
            }
            if (standPat >= beta || depth === 0) {
                return { score: standPat, pv: [] };
            }
            if (standPat > alpha) {
                alpha = standPat;
            }

            const phase = getPhase(board, history);
            const tacticalMoves = orderMoves(
                board,
                getAllLegalMoves(board, color).filter(move => isInCheck(board, color) || move.captured),
                phase,
                null,
                context.quiescenceLimit
            );

            let bestScore = standPat;
            let bestPv = [];
            for (const move of tacticalMoves) {
                const nextBoard = applyMoveToBoard(board, move);
                const result = quiescence(nextBoard, otherColor(color), -beta, -alpha, context, history.concat(getMoveKey(move)), depth - 1);
                const score = -result.score;

                if (score > bestScore) {
                    bestScore = score;
                    bestPv = [move].concat(result.pv || []);
                }
                if (score > alpha) {
                    alpha = score;
                }
                if (alpha >= beta || result.aborted) {
                    return { score: bestScore, aborted: result.aborted, pv: bestPv };
                }
            }

            return { score: bestScore, pv: bestPv };
        }

        function negamax(board, color, depth, alpha, beta, context, history) {
            const originalAlpha = alpha;
            const ttKey = `${getBoardKey(board, color)}|${depth}`;
            const cached = context.tt.get(ttKey);
            if (cached) {
                if (cached.flag === 'exact') {
                    return { score: cached.score, bestMove: cached.bestMove, pv: cached.pv || [] };
                }
                if (cached.flag === 'lower') {
                    alpha = Math.max(alpha, cached.score);
                } else if (cached.flag === 'upper') {
                    beta = Math.min(beta, cached.score);
                }
                if (alpha >= beta) {
                    return { score: cached.score, bestMove: cached.bestMove, pv: cached.pv || [] };
                }
            }

            if (shouldAbort(context)) {
                return { score: evaluateBoardForColor(board, color, history), aborted: true, pv: [] };
            }

            const redGeneral = findGeneral(board, RED_COLOR);
            const blackGeneral = findGeneral(board, BLACK_COLOR);
            if (!redGeneral) {
                return { score: color === BLACK_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth, pv: [] };
            }
            if (!blackGeneral) {
                return { score: color === RED_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth, pv: [] };
            }

            if (depth === 0) {
                return quiescence(board, color, alpha, beta, context, history, context.quiescenceDepth);
            }

            const phase = getPhase(board, history);
            const legalMoves = getAllLegalMoves(board, color);
            if (legalMoves.length === 0) {
                return { score: isInCheck(board, color) ? -MATE_SCORE - depth : -3000 - depth, pv: [] };
            }

            const orderedMoves = orderMoves(board, legalMoves, phase, cached && cached.bestMove, context.branchLimit);
            let bestScore = -Infinity;
            let bestMove = orderedMoves[0];
            let bestPv = [];

            for (const move of orderedMoves) {
                const nextBoard = applyMoveToBoard(board, move);
                const result = negamax(nextBoard, otherColor(color), depth - 1, -beta, -alpha, context, history.concat(getMoveKey(move)));
                const score = -result.score;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                    bestPv = [move].concat(result.pv || []);
                }
                if (score > alpha) {
                    alpha = score;
                }
                if (alpha >= beta || result.aborted) {
                    break;
                }
            }

            let flag = 'exact';
            if (bestScore <= originalAlpha) {
                flag = 'upper';
            } else if (bestScore >= beta) {
                flag = 'lower';
            }
            context.tt.set(ttKey, { flag, score: bestScore, bestMove, pv: bestPv });

            return { score: bestScore, bestMove, pv: bestPv };
        }

        function pickFallbackMove(board, color, history, positionHistory) {
            const legalMoves = filterPlayableMoves(board, color, getAllLegalMoves(board, color), positionHistory, history);
            if (legalMoves.length === 0) {
                return null;
            }

            const config = getPhaseConfig(board, history);
            const rootEntries = buildRootEntries(board, color, history, positionHistory, config, legalMoves);
            return (rootEntries[0] || { move: legalMoves[0] }).move;
        }

        function computeBestMove(options) {
            const board = cloneBoard(options.board);
            const color = options.currentPlayer;
            const history = cloneMoveSequence(options.history || []);
            const positionHistory = clonePositionHistory(options.positionHistory || []);
            const legalMoves = filterPlayableMoves(board, color, getAllLegalMoves(board, color), positionHistory, history);

            if (legalMoves.length === 0) {
                return { move: null, score: -MATE_SCORE, pv: [], completedDepth: 0, timedOut: false };
            }

            const searchConfig = getPhaseConfig(board, history, options.timeBudgetMs);
            const rootEntries = buildRootEntries(board, color, history, positionHistory, searchConfig, legalMoves);
            const context = {
                deadline: Date.now() + searchConfig.time,
                timedOut: false,
                nodes: 0,
                tt: new Map(),
                branchLimit: searchConfig.branchLimit,
                quiescenceLimit: searchConfig.quiescenceLimit,
                quiescenceDepth: CONFIG.quiescenceDepth
            };

            let bestMove = rootEntries[0].move;
            let bestScore = -Infinity;
            let bestPv = [bestMove];
            let completedDepth = 0;

            for (let depth = 1; depth <= searchConfig.maxDepth; depth++) {
                let depthBestMove = bestMove;
                let depthBestScore = -Infinity;
                let depthBestPv = bestPv;

                for (const entry of rootEntries) {
                    const result = negamax(entry.nextBoard, otherColor(color), depth - 1, -Infinity, Infinity, context, history.concat(getMoveKey(entry.move)));
                    const score = -result.score + entry.policyBias;

                    if (score > depthBestScore) {
                        depthBestScore = score;
                        depthBestMove = entry.move;
                        depthBestPv = [entry.move].concat(result.pv || []);
                    }
                    if (result.aborted) {
                        break;
                    }
                }

                if (context.timedOut) {
                    break;
                }

                bestMove = depthBestMove;
                bestScore = depthBestScore;
                bestPv = depthBestPv;
                completedDepth = depth;
            }

            return {
                move: bestMove || pickFallbackMove(board, color, history, positionHistory),
                score: bestScore === -Infinity ? 0 : Math.round(bestScore),
                pv: bestPv.map(getMoveKey),
                completedDepth,
                timedOut: context.timedOut
            };
        }

        return {
            computeBestMove,
            evaluateBoardForColor,
            pickFallbackMove
        };
    }

    return {
        createXiangqiEngineCore
    };
}));
