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
            opening: { time: 1000, maxDepth: 5, rootLimit: 10, branchLimit: 10, quiescenceLimit: 6 },
            middlegame: { time: 1100, maxDepth: 5, rootLimit: 12, branchLimit: 12, quiescenceLimit: 8 },
            endgame: { time: 1200, maxDepth: 6, rootLimit: 18, branchLimit: 16, quiescenceLimit: 10 }
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
        const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

        function getStageProfile(board, history) {
            const pieceCount = countPieces(board);
            const moveCount = history.length;
            const openingHint = clamp((pieceCount - 20) / 12, 0, 1) * clamp((18 - moveCount) / 18, 0.25, 1);
            const endgameHint = clamp((18 - pieceCount) / 10, 0, 1);
            const middlegameHint = Math.max(0.2, 1 - openingHint * 0.7 - endgameHint * 0.75);
            const total = openingHint + middlegameHint + endgameHint || 1;

            return {
                opening: openingHint / total,
                middlegame: middlegameHint / total,
                endgame: endgameHint / total
            };
        }

        function stageWeight(stage, opening, middlegame, endgame) {
            return stage.opening * opening + stage.middlegame * middlegame + stage.endgame * endgame;
        }

        function getPhase(board, history) {
            const stage = getStageProfile(board, history);
            if (stage.opening >= 0.48) {
                return 'opening';
            }
            if (stage.endgame >= 0.42) {
                return 'endgame';
            }
            return 'middlegame';
        }

        function getPhaseConfig(board, history, overrideTimeBudgetMs) {
            const phase = getPhase(board, history);
            const stage = getStageProfile(board, history);
            return {
                phase,
                stage,
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

        function hasHomeHorizontalRookDevelopment(board, color) {
            const row = homeRow(color);
            const rookMoves = getAllLegalMoves(board, color);
            return rookMoves.some(move => move.piece === `${color}R` && move.fromRow === row && move.toRow === row && !move.captured);
        }

        function isHomeHorizontalRookMove(move, color) {
            return move.piece === `${color}R` &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                !move.captured;
        }

        function isHomeVerticalRookMove(move, color) {
            return move.piece === `${color}R` &&
                move.fromRow === homeRow(color) &&
                move.toRow !== move.fromRow &&
                !move.captured;
        }

        function isHomeCornerRookRetreat(move, color) {
            return move.piece === `${color}R` &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                (move.toCol === 0 || move.toCol === 8) &&
                move.fromCol !== move.toCol &&
                !move.captured;
        }

        function isNaturalHorseDevelopment(move, color) {
            return move.piece === `${color}H` &&
                move.fromRow === homeRow(color) &&
                move.toRow === naturalHorseRow(color) &&
                (move.toCol === 2 || move.toCol === 6) &&
                !move.captured;
        }

        function getOpeningPlanMode(openingContext) {
            const centralCannonPressure = openingContext.ownCenteredCannon || openingContext.opponentCenteredCannon;

            if (openingContext.undevelopedRooks === 2 &&
                openingContext.undevelopedHorses === 1 &&
                openingContext.opponentCenteredCannon &&
                !openingContext.ownCenteredCannon &&
                openingContext.opponentDevelopedHorses === 0) {
                return 'second-horse';
            }

            if (openingContext.undevelopedRooks >= 1 && openingContext.horizontalRookMovesAvailable) {
                if (openingContext.developedHorses === 2) {
                    return 'horizontal-rook';
                }
                if (openingContext.undevelopedHorses === 1 && openingContext.opponentCenteredCannon) {
                    return 'horizontal-rook';
                }
            }

            if (openingContext.undevelopedHorses >= 1) {
                if (!centralCannonPressure || openingContext.undevelopedRooks === 2) {
                    return 'second-horse';
                }
            }

            return 'balanced';
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

        function countPiecesBetweenOnRow(board, row, startCol, endCol) {
            let blockers = 0;
            const step = startCol < endCol ? 1 : -1;
            for (let col = startCol + step; col !== endCol; col += step) {
                if (board[row][col]) {
                    blockers++;
                }
            }
            return blockers;
        }

        function hasImmediateRookCapture(board, row, col, color) {
            const rook = `${color}R`;

            for (let scanRow = 0; scanRow < 10; scanRow++) {
                for (let scanCol = 0; scanCol < 9; scanCol++) {
                    if (board[scanRow][scanCol] !== rook) {
                        continue;
                    }

                    if (scanRow === row && scanCol !== col && countPiecesBetweenOnRow(board, row, scanCol, col) === 0) {
                        return true;
                    }

                    if (scanCol === col && scanRow !== row && countPiecesBetweenOnFile(board, col, scanRow, row) === 0) {
                        return true;
                    }
                }
            }

            return false;
        }

        function pieceValue(type, stageOrPhase) {
            if (typeof stageOrPhase === 'string') {
                return CONFIG.values[type][stageOrPhase];
            }

            return Math.round(stageWeight(
                stageOrPhase,
                CONFIG.values[type].opening,
                CONFIG.values[type].middlegame,
                CONFIG.values[type].endgame
            ));
        }

        function mobilityValue(type, stage) {
            return stageWeight(
                stage,
                CONFIG.mobility.opening[type],
                CONFIG.mobility.middlegame[type],
                CONFIG.mobility.endgame[type]
            );
        }

        function pieceSquareBonus(piece, row, col, stage) {
            const color = piece[0];
            const type = piece[1];
            const centerDistance = Math.abs(4 - col);
            const opening = stage.opening;
            const middlegame = stage.middlegame;
            const endgame = stage.endgame;

            if (type === 'S') {
                const progress = color === RED_COLOR ? 9 - row : row;
                let score = progress * stageWeight(stage, 5, 8, 10);
                if (hasCrossedRiver(color, row)) {
                    score += stageWeight(stage, 8, 20, 28);
                }
                return Math.round(score + Math.max(0, 8 - centerDistance * 2));
            }

            if (type === 'H') {
                let score = Math.max(0, 20 - centerDistance * 4);
                if ((col === 0 || col === 8) && row !== homeRow(color)) {
                    score -= 20;
                }
                return Math.round(score + endgame * 8);
            }

            if (type === 'C') {
                let score = Math.max(0, 18 - centerDistance * 3);
                score -= opening * (Math.abs(col - 4) >= 3 ? 12 : 0);
                score -= endgame * (row !== cannonRow(color) ? 6 : 0);
                return Math.round(score);
            }

            if (type === 'R') {
                let score = Math.max(0, 12 - centerDistance * 2);
                score += (middlegame + endgame) * (row !== homeRow(color) ? 10 : 0);
                return Math.round(score);
            }

            if (type === 'E' || type === 'A') {
                const openingScore = 14 - Math.abs(row - homeRow(color)) * 5 - centerDistance * 2;
                const laterScore = 6 - centerDistance;
                return Math.round(opening * openingScore + (middlegame + endgame) * laterScore);
            }

            if (type === 'G') {
                return Math.round((col === 4 ? 16 : 0) - opening * (row !== homeRow(color) ? 18 : 0));
            }

            return 0;
        }

        function evaluateKingSafety(board, color, stage) {
            const general = findGeneral(board, color);
            if (!general) {
                return -2000;
            }

            const opponent = otherColor(color);
            const row0 = homeRow(color);
            const forward = color === RED_COLOR ? -1 : 1;
            const advisors = countPieceType(board, color, 'A');
            const elephants = countPieceType(board, color, 'E');
            let score = advisors * stageWeight(stage, 20, 14, 12) + elephants * stageWeight(stage, 18, 12, 10);

            if (general.row !== row0) {
                score -= stageWeight(stage, 40, 28, 24);
            }
            if (general.col !== 4) {
                score -= 12;
            }

            const frontRow = general.row + forward;
            if (frontRow >= 0 && frontRow < 10 && !board[frontRow][general.col]) {
                score -= stageWeight(stage, 14, 18, 18);
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

            return Math.round(score);
        }

        function evaluateRookPressure(board, color, stage) {
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
                            score += stageWeight(stage, 18, 24, 20);
                        }
                        if (piece[1] === 'C' && blockers === 1) {
                            score += stageWeight(stage, 20, 22, 16);
                        }
                    }

                    if (Math.abs(col - enemyGeneral.col) <= 1 && Math.abs(row - enemyGeneral.row) <= 4) {
                        score += piece[1] === 'R'
                            ? stageWeight(stage, 10, 12, 8)
                            : stageWeight(stage, 8, 8, 4);
                    }
                }
            }

            return Math.round(score);
        }

        function evaluateInitiative(board, color, stage) {
            if (stage.middlegame < 0.12 && stage.endgame < 0.18) {
                return 0;
            }

            const row0 = homeRow(color);
            const developedHorses = countDevelopedHorses(board, color);
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color) {
                        continue;
                    }

                    const centerDistance = Math.abs(4 - col);
                    const forwardProgress = color === RED_COLOR ? row0 - row : row - row0;

                    if (piece[1] === 'R') {
                        score += forwardProgress * stageWeight(stage, 1, 4, 2);
                        score += Math.max(0, 10 - centerDistance * 2) * stageWeight(stage, 0.2, 1.1, 0.4);
                        if (row === row0 && developedHorses === 2) {
                            score -= stageWeight(stage, 0, 16, 4);
                        }
                    } else if (piece[1] === 'C') {
                        if (row !== cannonRow(color)) {
                            score += stageWeight(stage, 0, 8, 3);
                        }
                        score += Math.max(0, 8 - centerDistance * 2) * stageWeight(stage, 0.4, 1, 0.3);
                    } else if (piece[1] === 'H') {
                        if (row !== row0) {
                            score += stageWeight(stage, 2, 8, 10);
                        }
                        if (centerDistance <= 2) {
                            score += stageWeight(stage, 2, 6, 4);
                        }
                    }
                }
            }

            return Math.round(score);
        }

        function evaluateDevelopment(board, color, stage) {
            if (stage.opening < 0.14) {
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
                        score += row === row0 ? 52 : 26;
                        score += row === row0
                            ? Math.max(0, 18 - Math.abs(4 - col) * 3)
                            : Math.max(0, 8 - Math.abs(4 - col) * 2);
                        if (centralCannonPressure && row === row0) {
                            score += 12;
                        }
                        if (undevelopedHorses === 1 && !centralCannonPressure) {
                            score -= row === row0 ? 18 : 58;
                        }
                        if (row !== row0 && !centralCannonPressure) {
                            score -= 26;
                        } else if (row !== row0 && centralCannonPressure) {
                            score -= 16;
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
                        } else if (deepRaid && undevelopedRooks >= 1) {
                            score -= 38;
                        }
                        if (undevelopedHorses === 1 && !centralCannonPressure && row !== cannonRow(color)) {
                            score -= 18;
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

            return Math.round(score * (stage.opening + stage.middlegame * 0.35));
        }

        function evaluateSoldiers(board, color, stage) {
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] !== `${color}S`) {
                        continue;
                    }

                    if (hasCrossedRiver(color, row)) {
                        score += stageWeight(stage, 4, 14, 22);
                    }

                    for (const nextCol of [col - 1, col + 1]) {
                        if (nextCol < 0 || nextCol > 8) {
                            continue;
                        }
                        if (board[row][nextCol] === `${color}S`) {
                            score += stageWeight(stage, 4, 4, 10);
                        }
                    }
                }
            }

            return Math.round(score);
        }

        function evaluateExchangeSafety(board, color, stage) {
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
                    const value = pieceValue(piece[1], stage);

                    if (attackers.length === 0) {
                        continue;
                    }
                    if (defenders.length === 0) {
                        score -= Math.round(value * stageWeight(stage, 0.08, 0.12, 0.1));
                        continue;
                    }

                    if (attackers[0] < value && attackers[0] <= defenders[0]) {
                        score -= Math.round((value - attackers[0]) * stageWeight(stage, 0.12, 0.18, 0.14));
                    } else if (attackers.length > defenders.length) {
                        score -= 12 * Math.min(2, attackers.length - defenders.length);
                    }
                }
            }

            return score;
        }

        function evaluateSide(board, color, stage) {
            let score = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== color) {
                        continue;
                    }

                    const type = piece[1];
                    score += pieceValue(type, stage);
                    score += pieceSquareBonus(piece, row, col, stage);
                    score += getPseudoMoves(board, row, col).length * mobilityValue(type, stage);
                }
            }

            score += evaluateDevelopment(board, color, stage);
            score += evaluateKingSafety(board, color, stage);
            score += evaluateSoldiers(board, color, stage);
            score += evaluateRookPressure(board, color, stage);
            score += evaluateInitiative(board, color, stage);
            return score;
        }

        function evaluateBoardForColor(board, color, history) {
            const stage = getStageProfile(board, history);
            let score = evaluateSide(board, RED_COLOR, stage) - evaluateSide(board, BLACK_COLOR, stage);

            if (isInCheck(board, BLACK_COLOR)) {
                score += stageWeight(stage, 24, 34, 36);
            }
            if (isInCheck(board, RED_COLOR)) {
                score -= stageWeight(stage, 24, 34, 36);
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
                    suggestions.set(key, Math.max(suggestions.get(key) || 0, 80 - index * 14));
                }
            }

            const mirroredHistory = history.map(mirrorMoveKey);
            const mirrored = OPENING_BOOK[getOpeningBookKey(color, mirroredHistory)] || [];
            for (let index = 0; index < mirrored.length; index++) {
                const mirroredMove = mirrorMoveDescriptor(mirrored[index]);
                const key = getMoveKey(mirroredMove);
                if (legalByKey.has(key)) {
                    suggestions.set(key, Math.max(suggestions.get(key) || 0, 80 - index * 14));
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
            const horizontalRookMovesAvailable = openingContext.horizontalRookMovesAvailable;
            const lastOwnMove = openingContext.lastOwnMove;
            const previousOwnMove = openingContext.previousOwnMove;
            const ownCenteredCannon = openingContext.ownCenteredCannon;
            const opponentCenteredCannon = openingContext.opponentCenteredCannon;
            const centralCannonPressure = ownCenteredCannon || opponentCenteredCannon;
            const openingPlanMode = getOpeningPlanMode(openingContext);
            let score = 0;

            if (!move.captured) {
                if (openingPlanMode === 'horizontal-rook') {
                    if (isHomeHorizontalRookMove(move, color)) {
                        score += 136 - Math.abs(4 - move.toCol) * 6;
                    } else if (isHomeVerticalRookMove(move, color)) {
                        score -= 128;
                    } else if (move.piece[1] === 'H') {
                        score -= isNaturalHorseDevelopment(move, color)
                            ? openingContext.undevelopedHorses === 1 ? 112 : 42
                            : 86;
                    } else if (move.piece[1] === 'C') {
                        score -= move.toCol === 4 ? 92 : 126;
                    } else if (move.piece[1] === 'S') {
                        score -= move.toCol === 4 ? 34 : 78;
                    } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                        score -= 92;
                    }
                } else if (openingPlanMode === 'second-horse') {
                    if (isNaturalHorseDevelopment(move, color)) {
                        score += 96;
                    } else if (isHomeHorizontalRookMove(move, color)) {
                        score += 18;
                    } else if (isHomeVerticalRookMove(move, color)) {
                        score -= 54;
                    } else if (move.piece[1] === 'C') {
                        score -= move.toCol === 4 ? 26 : 56;
                    } else if (move.piece[1] === 'S') {
                        score -= move.toCol === 4 ? 8 : 34;
                    } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                        score -= 56;
                    }
                }
            }

            if (move.piece[1] === 'R' && move.fromRow === homeRow(color)) {
                const horizontalDeployment = move.toRow === move.fromRow;
                score += horizontalDeployment
                    ? 58 - Math.abs(4 - move.toCol) * 4
                    : 18;
                if (undevelopedHorses === 2) {
                    score -= horizontalDeployment ? 8 : 68;
                } else if (undevelopedHorses === 1 && move.toRow !== move.fromRow) {
                    score -= 20;
                }
                if (undevelopedHorses === 1 && !centralCannonPressure) {
                    score -= horizontalDeployment ? 8 : 88;
                }
                if (opponentCenteredCannon && horizontalDeployment) {
                    score += 26;
                }
                if (horizontalDeployment &&
                    undevelopedRooks === 2 &&
                    undevelopedHorses === 1 &&
                    opponentCenteredCannon &&
                    !ownCenteredCannon &&
                    openingContext.opponentDevelopedHorses === 0) {
                    score -= 74;
                }
                if (!horizontalDeployment && !opponentCenteredCannon) {
                    score -= 24;
                } else if (!horizontalDeployment && opponentCenteredCannon) {
                    score -= 18;
                }
                if (!move.captured && !horizontalDeployment && horizontalRookMovesAvailable && opponentCenteredCannon) {
                    score -= 72;
                }
            }
            if (isHomeCornerRookRetreat(move, color)) {
                score -= undevelopedMajors >= 2 ? 112 : undevelopedMajors === 1 ? 72 : 28;
                if (openingPlanMode === 'horizontal-rook') {
                    score -= 96;
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
                if (undevelopedHorses === 1 && horizontalRookMovesAvailable && opponentCenteredCannon) {
                    score -= 42;
                }
                if (undevelopedRooks === 2 &&
                    undevelopedHorses === 1 &&
                    opponentCenteredCannon &&
                    !ownCenteredCannon &&
                    openingContext.opponentDevelopedHorses === 0) {
                    score += 52;
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
                if (Math.abs(4 - move.toCol) <= 1 && move.toRow !== homeRow(color)) {
                    score += 18;
                }
            }

            if (!move.captured && move.piece[1] === 'C') {
                const deepRaid = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
                if (move.fromRow === cannonRow(color) && move.toRow === cannonRow(color) && move.toCol === 4) {
                    score += 24;
                } else if (move.fromRow === cannonRow(color) && move.toRow === cannonRow(color)) {
                    score -= 16 + Math.abs(4 - move.toCol) * 4;
                } else {
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
                if (undevelopedRooks === 1 && undevelopedHorses === 1 && opponentCenteredCannon && !ownCenteredCannon && !move.captured) {
                    score -= move.fromRow === cannonRow(color) && move.toCol === 4 ? 112 : 86;
                }
                if (deepRaid && undevelopedRooks >= 1) {
                    score -= move.captured ? 72 : 96;
                }
                if (undevelopedRooks >= 1 && developedHorses === 2 && !centralCannonPressure) {
                    if (move.fromRow === cannonRow(color) && move.toRow !== cannonRow(color)) {
                        score -= horizontalRookMovesAvailable ? 92 : 64;
                    }
                    if (move.fromRow !== cannonRow(color)) {
                        score -= move.toCol === 4 ? 54 : 72;
                    }
                }
            }

            if (move.captured && move.piece[1] === 'C') {
                const deepRaid = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
                if (deepRaid && undevelopedMajors >= 2 && move.captured[1] !== 'R') {
                    score -= move.captured[1] === 'H' ? 34 : 18;
                }
                if (move.captured[1] === 'H' && undevelopedRooks >= 1 && undevelopedHorses >= 1 && !centralCannonPressure) {
                    score -= 18;
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
            if (!move.captured &&
                move.piece[1] === 'R' &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                lastOwnMove &&
                lastOwnMove.toRow === move.fromRow &&
                lastOwnMove.toCol === move.fromCol) {
                score -= undevelopedMajors >= 2 ? 68 : 32;
                if (isExactReverseMove(lastOwnMove, move)) {
                    score -= undevelopedMajors >= 2 ? 102 : 54;
                }
            }
            if (!move.captured &&
                move.piece[1] === 'R' &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                previousOwnMove &&
                previousOwnMove.toRow === move.fromRow &&
                previousOwnMove.toCol === move.fromCol) {
                score -= undevelopedMajors >= 2 ? 44 : 20;
                if (isExactReverseMove(previousOwnMove, move)) {
                    score -= undevelopedMajors >= 2 ? 84 : 40;
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
            const stage = getStageProfile(board, history);
            const capturedValue = move.captured ? pieceValue(move.captured[1], stage) : 0;
            const moverValue = pieceValue(move.piece[1], stage);
            let score = move.captured ? capturedValue * 0.18 : 0;

            if (move.captured) {
                score += capturedValue - moverValue * 0.06;
            }
            if (isInCheck(nextBoard, otherColor(color))) {
                score += stageWeight(stage, 26, 40, 34);
            }

            if (move.piece[1] !== 'G' && isSquareAttacked(nextBoard, move.toRow, move.toCol, otherColor(color))) {
                const defended = isSquareAttacked(nextBoard, move.toRow, move.toCol, color);
                if (!defended) {
                    score -= Math.round(moverValue * (move.captured ? 0.28 : 0.36));
                } else if (move.captured && capturedValue < moverValue) {
                    score -= Math.round((moverValue - capturedValue) * 0.2);
                } else {
                    score -= Math.round(moverValue * 0.08);
                }
            }

            return Math.round(score);
        }

        function getImmediateRiskPenalty(board, nextBoard, move, color, stage) {
            let penalty = 0;
            if (isInCheck(nextBoard, color)) {
                penalty += stageWeight(stage, 36, 44, 40);
            }

            if (move.piece[1] === 'G' || !isSquareAttacked(nextBoard, move.toRow, move.toCol, otherColor(color))) {
                return Math.round(penalty);
            }

            const attackers = getAttackerValues(nextBoard, move.toRow, move.toCol, otherColor(color));
            const defenders = getAttackerValues(nextBoard, move.toRow, move.toCol, color);
            const moverValue = pieceValue(move.piece[1], stage);
            const capturedValue = move.captured ? pieceValue(move.captured[1], stage) : 0;

            if (attackers.length === 0) {
                return Math.round(penalty);
            }

            if (defenders.length === 0) {
                penalty += Math.round(moverValue * (move.captured ? 0.2 : 0.3));
            } else {
                const leastAttacker = attackers[0];
                const leastDefender = defenders[0];

                if (leastAttacker < moverValue && leastAttacker <= leastDefender) {
                    penalty += Math.round((moverValue - leastAttacker) * (move.captured ? 0.4 : 0.55));
                } else if (attackers.length > defenders.length) {
                    penalty += 10 * Math.min(3, attackers.length - defenders.length);
                } else if (!move.captured) {
                    penalty += Math.round(moverValue * 0.04);
                }
            }

            if (move.captured && capturedValue < attackers[0]) {
                penalty += Math.round((attackers[0] - capturedValue) * 0.2);
            }

            if (move.piece[1] === 'C' &&
                move.captured &&
                move.captured[1] === 'H' &&
                stage.opening > 0.22 &&
                hasImmediateRookCapture(nextBoard, move.toRow, move.toCol, otherColor(color))) {
                penalty += stageWeight(stage, 326, 208, 48);

                if (countUndevelopedRooks(board, otherColor(color)) >= 1) {
                    penalty += stageWeight(stage, 58, 28, 0);
                }
                if (countUndevelopedRooks(board, color) >= 1) {
                    penalty += stageWeight(stage, 42, 18, 0);
                }
            }

            return Math.round(penalty);
        }

        function getRootPassivityPenalty(board, nextBoard, move, color, stage, openingContext) {
            if (move.captured || stage.middlegame < 0.2) {
                return 0;
            }

            const backward = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
            const repeatedPiece = openingContext.lastOwnMove &&
                openingContext.lastOwnMove.toRow === move.fromRow &&
                openingContext.lastOwnMove.toCol === move.fromCol;
            let penalty = 0;

            if (move.piece[1] === 'R' && backward) {
                penalty += stageWeight(stage, 0, 20, 8);
            } else if (move.piece[1] === 'C' && backward) {
                penalty += stageWeight(stage, 0, 14, 5);
            } else if (move.piece[1] === 'H' && backward && move.fromRow !== homeRow(color)) {
                penalty += stageWeight(stage, 0, 14, 5);
            }

            if (repeatedPiece) {
                penalty += stageWeight(stage, 0, 16, 6);
            }

            if (move.piece[1] === 'R' &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                repeatedPiece) {
                penalty += stageWeight(stage, 28, 18, 6);
                if (isExactReverseMove(openingContext.lastOwnMove, move)) {
                    penalty += stageWeight(stage, 54, 30, 10);
                }
            }

            if (move.piece[1] === 'R' &&
                move.fromRow === homeRow(color) &&
                move.toRow === move.fromRow &&
                openingContext.previousOwnMove &&
                openingContext.previousOwnMove.toRow === move.fromRow &&
                openingContext.previousOwnMove.toCol === move.fromCol) {
                penalty += stageWeight(stage, 22, 12, 4);
                if (isExactReverseMove(openingContext.previousOwnMove, move)) {
                    penalty += stageWeight(stage, 42, 24, 8);
                }
            }

            if (isHomeCornerRookRetreat(move, color)) {
                penalty += stageWeight(stage, 34, 18, 6);
                if (openingContext.lastOwnMove && isExactReverseMove(openingContext.lastOwnMove, move)) {
                    penalty += stageWeight(stage, 92, 48, 14);
                }
                if (openingContext.previousOwnMove && isExactReverseMove(openingContext.previousOwnMove, move)) {
                    penalty += stageWeight(stage, 56, 28, 10);
                }
            }

            if (move.piece[1] === 'C' &&
                openingContext.undevelopedRooks >= 1 &&
                openingContext.developedHorses === 2 &&
                !openingContext.ownCenteredCannon &&
                !openingContext.opponentCenteredCannon) {
                if (move.fromRow === cannonRow(color) && move.toRow !== cannonRow(color)) {
                    penalty += stageWeight(stage, 42, 20, 8);
                }
                if (move.fromRow !== cannonRow(color) && !move.captured) {
                    penalty += move.toCol === 4
                        ? stageWeight(stage, 30, 16, 6)
                        : stageWeight(stage, 46, 22, 8);
                }
            }

            if (move.piece[1] === 'C' &&
                !move.captured &&
                openingContext.undevelopedRooks === 1 &&
                openingContext.undevelopedHorses === 1 &&
                openingContext.opponentCenteredCannon &&
                !openingContext.ownCenteredCannon) {
                penalty += move.fromRow === cannonRow(color) && move.toCol === 4
                    ? stageWeight(stage, 54, 26, 8)
                    : stageWeight(stage, 36, 18, 6);
            }

            if (move.piece[1] === 'A' || move.piece[1] === 'E') {
                penalty += stageWeight(stage, 0, 10, 4);
            }

            return Math.round(penalty);
        }

        function getOpeningTradePenalty(board, nextBoard, move, color, stage, openingContext) {
            if (stage.opening < 0.22 ||
                move.piece[1] !== 'C' ||
                !move.captured ||
                move.captured[1] !== 'H' ||
                !hasImmediateRookCapture(nextBoard, move.toRow, move.toCol, otherColor(color))) {
                return 0;
            }

            let penalty = stageWeight(stage, 360, 236, 54);

            if (openingContext.undevelopedMajors >= 2) {
                penalty += stageWeight(stage, 48, 20, 0);
            }
            if (countUndevelopedRooks(board, otherColor(color)) >= 1) {
                penalty += stageWeight(stage, 54, 26, 0);
            }

            return Math.round(penalty);
        }

        function getOpponentCheckThreatPenalty(nextBoard, move, color, stage, history, positionHistory) {
            if (stage.opening < 0.12 && stage.middlegame < 0.18) {
                return 0;
            }

            const opponent = otherColor(color);
            const nextHistory = history.concat(getMoveKey(move));
            const nextPositionHistory = positionHistory.concat(getBoardKey(nextBoard, opponent));
            const opponentMoves = filterPlayableMoves(
                nextBoard,
                opponent,
                getAllLegalMoves(nextBoard, opponent),
                nextPositionHistory,
                nextHistory
            );
            let checks = 0;
            let strongest = 0;

            for (const reply of opponentMoves) {
                const replyBoard = applyMoveToBoard(nextBoard, reply);
                if (!isInCheck(replyBoard, color)) {
                    continue;
                }

                const escapeMoves = filterPlayableMoves(
                    replyBoard,
                    color,
                    getAllLegalMoves(replyBoard, color),
                    nextPositionHistory.concat(getBoardKey(replyBoard, color)),
                    nextHistory.concat(getMoveKey(reply))
                );
                if (escapeMoves.length === 0) {
                    return MATE_SCORE * 0.75;
                }

                checks++;
                let threat = stageWeight(stage, 14, 12, 8);
                if (reply.piece[1] === 'R') {
                    threat += stageWeight(stage, 32, 28, 16);
                } else if (reply.piece[1] === 'C') {
                    threat += stageWeight(stage, 30, 26, 14);
                } else if (reply.piece[1] === 'H') {
                    threat += stageWeight(stage, 22, 20, 12);
                } else if (reply.piece[1] === 'S') {
                    threat += stageWeight(stage, 10, 12, 10);
                }
                if (reply.captured) {
                    threat += Math.round(pieceValue(reply.captured[1], stage) * 0.12);
                }
                strongest = Math.max(strongest, threat);

                if (checks >= 4) {
                    break;
                }
            }

            if (checks === 0) {
                return 0;
            }

            return Math.round(strongest + stageWeight(stage, 16, 12, 6) * Math.max(0, checks - 1));
        }

        function getRootContinuationBias(board, nextBoard, move, color, history, stage) {
            if (stage.opening < 0.16 && stage.middlegame < 0.28) {
                return 0;
            }

            let score = 0;
            if (!move.captured) {
                score += (evaluateDevelopment(nextBoard, color, stage) - evaluateDevelopment(board, color, stage)) * 0.55;
                score += (evaluateRookPressure(nextBoard, color, stage) - evaluateRookPressure(board, color, stage)) * 0.75;
                score += (evaluateInitiative(nextBoard, color, stage) - evaluateInitiative(board, color, stage)) * 0.65;
                score += (evaluateKingSafety(nextBoard, color, stage) - evaluateKingSafety(board, color, stage)) * 0.2;
            }
            if (move.piece[1] === 'R' && countUndevelopedRooks(nextBoard, color) < countUndevelopedRooks(board, color)) {
                score += move.toRow === move.fromRow
                    ? stageWeight(stage, 20, 12, 4)
                    : stageWeight(stage, 6, 6, 2);
            }
            if (move.piece[1] === 'H' && countUndevelopedHorses(nextBoard, color) < countUndevelopedHorses(board, color)) {
                score += stageWeight(stage, 12, 8, 4);
            } else if (move.piece[1] === 'H' && !move.captured) {
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                if (centerGain > 0) {
                    score += centerGain * stageWeight(stage, 8, 14, 10);
                }
            }

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
                opponentDevelopedHorses: countDevelopedHorses(board, otherColor(color)),
                rookMovesAvailable: countUndevelopedRooks(board, color) >= 1 && hasHomeRookDevelopment(board, color),
                horizontalRookMovesAvailable: hasHomeHorizontalRookDevelopment(board, color),
                ownCenteredCannon: hasCenteredCannon(board, color),
                opponentCenteredCannon: hasCenteredCannon(board, otherColor(color)),
                lastOwnMove: sameSideMoves[sameSideMoves.length - 1] || null,
                previousOwnMove: sameSideMoves.length > 1 ? sameSideMoves[sameSideMoves.length - 2] : null
            };
            const openingPlanMode = searchConfig.phase === 'opening'
                ? getOpeningPlanMode(openingContext)
                : 'balanced';
            const quickEntries = legalMoves.map(move => {
                const nextBoard = applyMoveToBoard(board, move);
                const bookBias = suggestions.get(getMoveKey(move)) || 0;
                const practicalBias = getPracticalOpeningBias(board, move, color, history, openingContext);
                const tacticalBias = getTacticalBias(board, nextBoard, move, color, history);
                const safetyPenalty = getImmediateRiskPenalty(board, nextBoard, move, color, searchConfig.stage);
                const quietCenter = move.captured ? 0 : Math.max(0, 4 - Math.abs(4 - move.toCol)) * 3;
                return {
                    move,
                    nextBoard,
                    tacticalBias,
                    safetyPenalty,
                    quickScore: bookBias + practicalBias + quietCenter + Math.round(tacticalBias * 0.9) - Math.round(safetyPenalty * 0.45),
                    policyBias: bookBias + practicalBias + Math.round(tacticalBias * 0.55) - Math.round(safetyPenalty * 0.3)
                };
            }).sort((left, right) => right.quickScore - left.quickScore);

            const shortlist = quickEntries.slice(0, Math.min(legalMoves.length, Math.max(searchConfig.rootLimit * 2, 12)));
            const entries = shortlist.map(entry => {
                const nextBoard = entry.nextBoard;
                const continuationBias = getRootContinuationBias(board, nextBoard, entry.move, color, history, searchConfig.stage);
                let captureBias = entry.move.captured
                    ? Math.round(pieceValue(entry.move.captured[1], searchConfig.stage) * 0.22 - pieceValue(entry.move.piece[1], searchConfig.stage) * 0.05)
                    : 0;
                if (searchConfig.phase === 'opening' && entry.move.captured) {
                    if (openingPlanMode === 'horizontal-rook' && entry.move.piece[1] !== 'R') {
                        captureBias -= 86;
                    } else if (openingPlanMode === 'second-horse' && entry.move.piece[1] !== 'H') {
                        captureBias -= 72;
                    }

                    if (entry.move.piece[1] === 'C') {
                        const deepRaid = color === RED_COLOR ? entry.move.toRow <= 4 : entry.move.toRow >= 5;
                        if (deepRaid && openingContext.undevelopedMajors >= 2) {
                            captureBias -= 96;
                        }
                    }
                }
                const checkBias = isInCheck(nextBoard, otherColor(color))
                    ? Math.round(stageWeight(searchConfig.stage, 20, 30, 28))
                    : 0;
                const safetyPenalty = entry.safetyPenalty;
                const tradePenalty = getOpeningTradePenalty(board, nextBoard, entry.move, color, searchConfig.stage, openingContext);
                const checkThreatPenalty = getOpponentCheckThreatPenalty(nextBoard, entry.move, color, searchConfig.stage, history, positionHistory);
                const passivityPenalty = getRootPassivityPenalty(board, nextBoard, entry.move, color, searchConfig.stage, openingContext);
                const tacticalBias = entry.tacticalBias;
                return {
                    move: entry.move,
                    nextBoard,
                    sortScore: entry.quickScore + continuationBias + captureBias + checkBias + Math.round(tacticalBias * 0.35) - Math.round(safetyPenalty * 0.55) - tradePenalty - checkThreatPenalty - passivityPenalty,
                    policyBias: entry.policyBias + Math.round(continuationBias * 0.6) + captureBias + Math.round(checkBias * 0.7) + Math.round(tacticalBias * 0.25) - Math.round(safetyPenalty * 0.35) - tradePenalty - Math.round(checkThreatPenalty * 0.85) - Math.round(passivityPenalty * 0.9)
                };
            }).sort((left, right) => right.sortScore - left.sortScore);

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

        function getMoveHistoryKey(move) {
            return `${move.piece}|${move.fromRow},${move.fromCol}-${move.toRow},${move.toCol}`;
        }

        function getKillerMoves(context, ply) {
            return context.killers.get(ply) || [];
        }

        function recordKillerMove(context, ply, move) {
            if (move.captured) {
                return;
            }

            const killers = getKillerMoves(context, ply)
                .filter(candidate => !sameMove(candidate, move));
            killers.unshift(move);
            context.killers.set(ply, killers.slice(0, 2));
        }

        function recordHistoryScore(context, move, depth) {
            if (move.captured) {
                return;
            }

            const key = getMoveHistoryKey(move);
            const current = context.historyScores.get(key) || 0;
            context.historyScores.set(key, current + depth * depth * 6);
        }

        function getHistoryScore(context, move) {
            return context.historyScores.get(getMoveHistoryKey(move)) || 0;
        }

        function scoreMoveForOrdering(board, move, stage, ttMove, context, ply) {
            if (sameMove(move, ttMove)) {
                return 10000000;
            }

            const pieceColor = move.piece[0];
            const capturedValue = move.captured ? pieceValue(move.captured[1], stage) : 0;
            const moverValue = pieceValue(move.piece[1], stage);
            let score = capturedValue * 10 - moverValue * 0.2;
            const killerMoves = context ? getKillerMoves(context, ply) : [];

            if (move.captured && move.captured[1] === 'G') {
                score += MATE_SCORE;
            }
            if (move.piece[1] === 'R') {
                score += 10;
            }
            if (move.piece[1] === 'C') {
                score += stageWeight(stage, 4, 6, 2);
            }
            if (move.piece[1] === 'S') {
                score += stageWeight(stage, 2, 4, 10);
            }

            if (!move.captured && stage.opening >= 0.28) {
                if (move.piece[1] === 'H' && move.fromRow === homeRow(pieceColor)) {
                    score += 18;
                }
                if (move.piece[1] === 'R' && move.fromRow === homeRow(pieceColor) && move.toRow === move.fromRow) {
                    score += 18;
                }
                if (move.piece[1] === 'R' && move.fromRow === homeRow(pieceColor) && move.toRow !== move.fromRow) {
                    score -= 12;
                }
                if (move.piece[1] === 'C' && move.fromRow === cannonRow(pieceColor) && move.toCol === 4) {
                    score += 10;
                }
                if (move.piece[1] === 'A' || move.piece[1] === 'E') {
                    score -= 18;
                }
                if (move.piece[1] === 'G') {
                    score -= 40;
                }
            }

            if (!move.captured) {
                if (killerMoves[0] && sameMove(move, killerMoves[0])) {
                    score += 9000;
                } else if (killerMoves[1] && sameMove(move, killerMoves[1])) {
                    score += 7500;
                }
                if (context) {
                    score += Math.min(5000, getHistoryScore(context, move));
                }
            }

            return score + Math.max(0, 4 - Math.abs(4 - move.toCol)) * 5;
        }

        function orderMoves(board, moves, stage, ttMove, limit, context, ply) {
            const ordered = moves
                .slice()
                .sort((left, right) => scoreMoveForOrdering(board, right, stage, ttMove, context, ply) - scoreMoveForOrdering(board, left, stage, ttMove, context, ply));
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

        function quiescence(board, color, alpha, beta, context, history, depth, ply) {
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

            const stage = getStageProfile(board, history);
            const inCheck = isInCheck(board, color);
            const tacticalMoves = orderMoves(
                board,
                getAllLegalMoves(board, color).filter(move => inCheck || move.captured),
                stage,
                null,
                context.quiescenceLimit,
                context,
                ply
            );

            let bestScore = standPat;
            let bestPv = [];
            for (const move of tacticalMoves) {
                const nextBoard = applyMoveToBoard(board, move);
                const result = quiescence(nextBoard, otherColor(color), -beta, -alpha, context, history.concat(getMoveKey(move)), depth - 1, ply + 1);
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

        function negamax(board, color, depth, alpha, beta, context, history, ply) {
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
                return quiescence(board, color, alpha, beta, context, history, context.quiescenceDepth, ply);
            }

            const stage = getStageProfile(board, history);
            const legalMoves = getAllLegalMoves(board, color);
            if (legalMoves.length === 0) {
                return { score: isInCheck(board, color) ? -MATE_SCORE - depth : -3000 - depth, pv: [] };
            }

            const orderedMoves = orderMoves(board, legalMoves, stage, cached && cached.bestMove, context.branchLimit, context, ply);
            let bestScore = -Infinity;
            let bestMove = orderedMoves[0];
            let bestPv = [];

            for (const move of orderedMoves) {
                const nextBoard = applyMoveToBoard(board, move);
                const result = negamax(nextBoard, otherColor(color), depth - 1, -beta, -alpha, context, history.concat(getMoveKey(move)), ply + 1);
                const score = -result.score;

                if (score > bestScore) {
                    bestScore = score;
                    bestMove = move;
                    bestPv = [move].concat(result.pv || []);
                }
                if (score > alpha) {
                    alpha = score;
                }
                if (alpha >= beta) {
                    recordKillerMove(context, ply, move);
                    recordHistoryScore(context, move, depth);
                    break;
                }
                if (result.aborted) {
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
                historyScores: new Map(),
                killers: new Map(),
                branchLimit: searchConfig.branchLimit,
                quiescenceLimit: searchConfig.quiescenceLimit,
                quiescenceDepth: CONFIG.quiescenceDepth
            };

            let bestMove = rootEntries[0].move;
            let bestScore = -Infinity;
            let bestPv = [bestMove];
            let completedDepth = 0;
            const policyWeight = searchConfig.phase === 'opening' ? 1.9 : searchConfig.phase === 'middlegame' ? 1.15 : 1;
            let orderedRootEntries = rootEntries.slice();

            for (let depth = 1; depth <= searchConfig.maxDepth; depth++) {
                let depthBestMove = bestMove;
                let depthBestScore = -Infinity;
                let depthBestPv = bestPv;
                const depthScores = new Map();

                for (const entry of orderedRootEntries) {
                    const result = negamax(entry.nextBoard, otherColor(color), depth - 1, -Infinity, Infinity, context, history.concat(getMoveKey(entry.move)), 1);
                    const score = -result.score + entry.policyBias * policyWeight;
                    depthScores.set(getMoveKey(entry.move), score);

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

                orderedRootEntries = orderedRootEntries
                    .slice()
                    .sort((left, right) => (depthScores.get(getMoveKey(right.move)) || -Infinity) - (depthScores.get(getMoveKey(left.move)) || -Infinity));
            }

            if (!context.timedOut &&
                completedDepth >= 2 &&
                orderedRootEntries.length >= 2 &&
                Date.now() + 120 < context.deadline) {
                const verifyCount = Math.min(3, orderedRootEntries.length);
                const verifyDepth = Math.min(searchConfig.maxDepth, completedDepth + 1);
                let verifyBestMove = bestMove;
                let verifyBestScore = bestScore;
                let verifyBestPv = bestPv;

                for (let index = 0; index < verifyCount; index++) {
                    const entry = orderedRootEntries[index];
                    const result = negamax(entry.nextBoard, otherColor(color), verifyDepth - 1, -Infinity, Infinity, context, history.concat(getMoveKey(entry.move)), 1);
                    const score = -result.score + entry.policyBias * (policyWeight * 0.55);
                    if (score > verifyBestScore) {
                        verifyBestScore = score;
                        verifyBestMove = entry.move;
                        verifyBestPv = [entry.move].concat(result.pv || []);
                    }
                    if (result.aborted || context.timedOut) {
                        break;
                    }
                }

                if (!context.timedOut) {
                    bestMove = verifyBestMove;
                    bestScore = verifyBestScore;
                    bestPv = verifyBestPv;
                }
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
