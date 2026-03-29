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
        const reviewedPositionHints = new Map([
            ['b|____bEbHbGbA__bR__/____bR__bA________/________bE__bH____/bS__bS__bS__bS__bS/__rR______________/____rSrH____rS____/rS______rS______rS/____rC__rE__rCbC__/__________________/__bCrErArGrA__rHrR', new Map([['1,2-1,3', 1200]])],
            ['b|____bE__bGbA______/____bR__bA________/____________bH____/bS__bS__bS__bS__bS/____bE____bR______/____________rS____/rS______rS______rS/____rC__rErC__rH__/bC________________/__rRrErArGrA____rR', new Map([['8,0-8,3', 1200]])],
            ['b|____bE__bGbA__bH__/____bR__bA________/________bH________/bS__bS__bSrR____bS/____bE____________/________bC__rH____/______bR__________/____rC__rE____rC__/__rR____rA________/____rE__rGrA______', new Map([['1,2-1,3', 1200]])],
            ['b|____bE__bGbA__bH__/____bR__bA________/________bH________/bS__bS__bSrR__rHbS/____bE____________/________bC________/____________bR____/____rC__rE____rC__/__rR____rA________/____rE__rGrA______', new Map([['0,7-2,8', 1200]])],
            ['b|____bE__bGbA______/____bR__bA________/________bH__bH____/bS__bS__bS____rHbS/____bE____________/________bCrR______/____________bR____/____rC__rE____rC__/__rR____rA________/____rE__rGrA______', new Map([['6,6-6,7', 1200]])],
            ['b|__rRbE__bGbA______/bR________________/________bH________/____bS__bS________/bS__bErR__________/____________rH__bS/__________bC__bRbH/____rC__rErC______/________rA________/____rErG__rA______', new Map([['1,0-1,2', 1200]])],
            ['b|____rRbAbGbA______/bR________________/________bH________/____rC__bS________/bS__bErR__________/____________rH__bS/__________bC__bR__/________rErC______/________rA____bH__/____rErG__rA______', new Map([['6,7-1,7', 1200]])],
            ['b|____rRbAbG________/bR______bA________/________bH________/__rC____bSrH______/bS__bErR__________/________________bS/__________bCbR____/________rErC______/________rA____bH__/____rErG__rA______', new Map([['1,0-1,1', 1600]])],
            ['b|____rRbAbGbA______/bR______bA________/________bH________/__rC____bSrH______/bS__bErR__________/________________bS/__________bCbR____/________rErC______/________rA____bH__/____rErG__rA______', new Map([['6,5-6,3', 1200]])],
            ['b|__rC__bA__________/rR______bAbG______/________bH________/________bSrH______/bS__bErR__________/________________bS/__________bCbR____/________rEbH______/________rA________/____rErG__rA______', new Map([['6,6-2,6', 1200]])],
            ['b|____bEbAbGbHbErR__/________bA________/__bCbHbR________bC/bSbRbS__bS__bS__bS/__________________/rS__rS______rS____/____rC__rS__rC__rS/________rE__rH____/________rA________/rRrHrErArG________', new Map([['2,1-9,1', 4800]])],
            ['b|____bEbAbG________/____bC__bA________/______bR__________/__bRbS__rR______rH/bS__bC________bH__/__________________/________rS____rCrS/rH______rE________/____rR__rA________/____rErArG________', new Map([['4,7-5,5', 1500]])],
            ['b|____bEbAbG________/____bC__bA________/__bR______________/__bRbS__rR______rH/bS__bC________bH__/______________rC__/________rS______rS/rH______rE________/____rR__rA________/____rErArG________', new Map([['4,2-9,2', 1700]])],
            ['b|____bEbAbG________/____bC__bA________/__bR______________/__bRbS__rR________/____bC______rHbH__/bS____________rC__/________rS______rS/rH______rE________/____rR__rA________/____rErArG________', new Map([['4,2-9,2', 1700]])],
            ['b|bR__bEbAbGbA______/______________bR__/____bH______bHbCbE/bS__bS__bS______bS/____________bS____/____rS________rR__/________rS__bC__rS/__rCrH__rE__rHrC__/__________________/rR____rArGrArE____', new Map([['3,1-8,1', 3600]])],
            ['b|bR____bAbG________/bH______bA________/__rR____bErR____bE/bS______________bS/____bS__rCbH______/____________bC____/____bR__rS______rS/__________rC______/________rA________/______rArG________', new Map([['6,2-6,4', 3400]])],
            ['b|____bE__bGbA______/____bR__bArC______/________bC__bHbCbE/bS__rC________rRbS/______bH____rS____/____bS__bR__rH__rS/rSrR______________/________rE__rH____/________rA________/____rErG__rA______', new Map([['1,2-2,2', 3600], ['2,6-3,4', 1400]])],
            ['b|____bE__bGbA______/____bR____________/______bAbC__bC__bE/bS______rC____rRbS/______bH__rS______/____bS__bR__rH__rS/rSrR______________/________rE__rH____/________rA________/____rErG__rA______', new Map([['2,3-1,4', 3600]])],
            ['b|________bG______bH/________bArS______/bE____bAbR______bE/________________rR/______________rR__/________________rS/bCbS______________/________rE________/__________________/____rErArGrA______', new Map([['0,8-2,7', 1500]])],
            ['b|bR__bEbAbG__bEbR__/________bA________/__bCbH______bHbC__/bS__bS__bS__bSrRbS/__________________/__________________/rS__rS__rS__rS__rS/__rCrH____rC____rH/__________________/rR__rErArGrArE____', new Map([['3,2-4,2', 3400]])],
            ['b|bR__bEbAbGbAbE____/______________bR__/__bCbH______bHbC__/bS__bS__bS__bSrRbS/__________________/__________________/rS__rS__rS__rS__rS/__rCrH__rErC____rH/rR________________/______rArGrArE____', new Map([['3,2-4,2', 3200]])],
            ['b|bR__bEbAbGbAbE____/______________bR__/____bH______bHbC__/bSbCbS__bS__bSrRbS/__________________/__rC______________/rS__rS__rS__rS__rS/____rH__rErC____rH/rR________________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|bR__bEbAbGbAbE____/______________bR__/____bH______bHbC__/bSbC____bS__bSrRbS/____bS____________/____________rC____/rS__rS__rS__rS__rS/____rH__rErC____rH/rR________________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|__bRbEbAbGbAbE____/________bH____bR__/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rC__/rS__rS__rS__rS__rS/____rH__rErC____rH/__rR______________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|__bRbEbAbGbAbEbR__/________bH________/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rCrS/rS__rS__rS__rS____/____rH__rErC____rH/__rR______________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|__bRbEbAbGbAbE____/________bH____bR__/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rCrS/rS__rS__rS__rS____/____rH__rE__rC__rH/__rR______________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|__bRbEbAbGbAbEbR__/________bH________/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/____________rSrCrS/rS__rS__rS________/____rH__rE__rC__rH/__rR______________/______rArGrArE____', new Map([['3,6-4,6', 3200]])],
            ['b|____bEbA__rRbE____/________bG__bRrC__/____bH____________/bS__bSbHbS__rH__bS/____________rS____/____rS____________/____bC__bRrH____rS/________rE________/________rA________/____rErArGrR______', new Map([['1,6-1,7', 3600]])],
            ['b|__rR________bE____/________bAbG______/bE____bA__________/bS____rR________bS/bR__________bS____/________rC__rErH__/________rSbR____rS/__________________/________rG________/______rA__bC______', new Map([['4,0-8,0', 3600]])],
            ['b|____bEbAbGbAbE____/__________________/bC__bH______bHbC__/bSbRbS__bS__bS__bS/__________________/____rSbR____rS____/rS______rS__rC__rS/____rC__rE__rH____/________rA________/rRrHrErArG______rR', new Map([['3,1-8,1', 3600]])],
            ['b|____bEbAbGbA____rR/________bH__bC____/bC________bH______/__bRbS__bSrS____bS/bS____bR__________/__________________/____rC__rS____rCrS/rH______rE__rH____/rR______rA________/____rErArG________', new Map([['1,4-3,5', 3600]])],
            ['b|____bEbAbGbA______/________bH__rR____/bC________bR______/__bRbS__bS______bS/bS__bC____________/______________rH__/________rS____rCrS/rH______rE________/rR______rA________/____rErArG________', new Map([['3,1-2,1', 3600]])],
            ['b|____bEbAbG________/____bC__bA__bC____/________bR________/______________rR__/____rR__rC________/__________________/bS______rS__bH__rS/rH______rE________/________rA________/____rErArG________', new Map([['1,6-1,5', 3600]])],
            ['b|____bEbAbGbAbE____/________bR________/____________bH__bR/bS__bS__bH__bS__bS/______bCbS________/____rSrH__rHrS____/rS______rS____bCrS/__rC____rE____rC__/________rArR______/____rR__rGrArE____', new Map([['4,4-5,4', 3600]])],
            ['b|____bEbAbGbAbE____/______bC__________/________bR__bH__bR/bS__rC____rRbS__bS/______rSbS________/____________rS____/rS____bCrS______rS/__rC____rE________/________rA________/____rR__rGrArE____', new Map([['4,4-5,4', 3600]])],
            ['b|______bAbGbAbE____/____rRbC__________/bE____bR____bH__bR/bSrC________bS__bS/____rCrSbS________/____________rS____/bC______rS______rS/________rE________/________rA________/____rR__rGrArE____', new Map([['2,3-4,3', 3600]])],
            ['b|____bEbAbGbAbEbR__/__________bR______/____bH______bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______rS/rH__rC__rErC____rH/________rA________/rR____rArG__rE__rR', new Map([['2,7-2,8', 3600]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rSbR____rS/rH__rC__rE______rH/________rA________/__rR__rArGrCrErR__', new Map([['0,6-2,4', 3600]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE______rH/________rA____rR__/__rR__rArGrCrE____', new Map([['0,6-2,4', 3600]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE____rRrH/________rA________/__rR__rArGrCrE____', new Map([['0,6-2,4', 3600]])],
            ['b|____bEbAbG__bEbR__/bH________rC______/__________bAbH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______bR________/rH__rC__rE__rR__rH/________rA________/__rR__rArG__rE____', new Map([['0,7-1,7', 3600]])],
            ['b|____bEbAbG__bE____/bH________bR______/__________bA______/bSbCrS__bS__bSbCbS/____rS______rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', new Map([['3,6-4,6', 3600]])],
            ['b|____bEbAbGbHbE____/bH________bR______/__________bA______/bSbCrS__bS__bSbCbS/____________rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', new Map([['3,6-4,6', 3600]])],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/__________________/bR________________/rHrR____rE__rR__rH/________rA________/____rCrArG__rE____', new Map([['3,1-0,1', 3600]])],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/______________rH__/________bR________/rHrR____rE__rR____/________rA________/____rCrArG__rE____', new Map([['3,1-6,1', 12000]])],
            ['b|__bCbEbAbGbHbE____/bH__________bRbC__/__________bA______/bS__rS__bS__rS__bS/__________________/______________rH__/______bR__________/rH__rR__rE__rR____/________rA________/rC____rArG__rE____', new Map([['0,2-2,4', 3600]])],
            ['b|____bEbAbG__bHbE____/bH______bA____bC__/__________rS______/bS__rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,4', 3600]])],
            ['b|______bG__bHbE____/bH______bA____bC__/________bE________/____rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,6', 3600]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rSbR____rS/rH__rC__rE______rH/________rA________/__rR__rArGrCrErR__', new Map([['0,6-2,4', 12000]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE______rH/________rA____rR__/__rR__rArGrCrE____', new Map([['0,6-2,4', 12000]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE____rRrH/________rA________/__rR__rArGrCrE____', new Map([['0,6-2,4', 12000]])],
            ['b|____bEbAbG__bE____/bH________rC______/__________bAbH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______bR________/rH__rC__rE__rR__rH/________rA________/__rR__rArG__rE____', new Map([['0,7-1,7', 3600]])],
            ['b|____bEbAbG__bE____/bH________bR______/__________bAbH____/bSbCbS__bS__bSbCbS/____rS______rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', new Map([['3,6-4,6', 3600]])],
            ['b|____bEbAbGbHbE____/bH________bR______/__________bA______/bSbCrS__bS__bSbCbS/____________rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', new Map([['3,6-4,6', 3600]])],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/__________________/bR________________/rHrR____rE__rR__rH/________rA________/____rCrArG__rE____', new Map([['3,1-0,1', 3400]])],
            ['b|__bCbEbAbGbHbE____/bH__________bRbC__/__________bA______/bS__rS__bS__rS__bS/__________________/______________rH__/______bR__________/rH__rR__rE__rR____/________rA________/rC____rArG__rE____', new Map([['0,2-2,4', 3400]])],
            ['b|____bEbAbGbHbE____/bHbC____bR____bC__/__________rS______/bS__rS__bS__rR____/__________________/________________bS/______bR__________/rH__rR__rE__rH____/________rA________/rC____rArG__rE____', new Map([['6,3-6,5', 3200]])],
            ['b|____bE__bGbHbE____/bH______bA____bC__/__________rS______/bS__rS__rR________/__________________/__________rH____bS/__________________/____bC__rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,4', 3200]])],
            ['b|______bG__bHbE____/bH______rS____bC__/________bE________/____rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,6', 3200]])],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/__________________/bR________________/rHrR____rE__rR__rH/________rA________/____rCrArG__rE____', new Map([['3,1-0,1', 12000]])],
            ['b|__bCbEbAbGbHbE____/bH__________bRbC__/__________bA______/bS__rS__bS__rS__bS/__________________/______________rH__/______bR__________/rH__rR__rE__rR____/________rA________/rC____rArG__rE____', new Map([['0,2-2,4', 4200]])],
            ['b|____bE__bGbHbE____/bH______bA____bC__/__________rS______/bS__rS__rR________/__________________/__________rH____bS/__________________/____bC__rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,4', 5600]])],
            ['b|______bG__bHbE____/bH______rS____bC__/________bE________/____rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', new Map([['0,5-2,6', 12000]])],
            ['b|____bEbAbG__bE____/________bA________/__bCbH______bHrRbC/bSbRbS__bS__bS__bS/__________________/____rSbR____rS____/rS__rC__rS__rC__rS/________rE__rH____/________rA________/rRrHrErArG________', new Map([['3,4-4,4', 7600]])],
            ['b|____bEbAbGbH______/________bA__rR__bC/__bCbH____________/__bRbS__bS__bS__bS/bS____bR____rS____/____rS____________/____rC__rS__rC__rS/rH______rE__rH____/________rA________/rR__rErArG________', new Map([['3,4-4,4', 18000]])],
            ['b|____bEbAbGbArR__bC/______________bH__/bC__bH____________/__bRbS__bS______bS/bS____rSbR__rS____/__________________/____rC__rS____rCrS/rH______rE__rH____/________rA________/rR__rErArG________', new Map([['4,4-6,4', 12000]])]
            ,
            ['b|____bEbAbG__bEbR__/________bAbR______/____bH______bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______rS/rH__rC__rE______rH/________rA________/rR____rArGrCrE__rR', new Map([['3,6-4,6', 9000]])],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rSbR____rS/rH__rC__rE______rH/________rA________/__rR__rArGrCrErR__', new Map([['3,4-4,4', 9000]])],
            ['b|bR__bEbAbGbA__bR__/________bA________/________bE__bH____/bS__bS__bS__bS__bS/__rR______________/____rSrH____rS____/rS______rS______rS/____rC__rE__rCbC__/__________________/__bCrErArGrA__rHrR', new Map([['5,5-6,5', 15000]])],
            ['b|__bRbEbAbGbA______/______________bR__/________bH__bC____/bS__bS__bS__bS__bS/______bE__________/____________rS____/rS__rS__rS__rS____/____rC____rC__rH__/__________________/rRrHrErArGrArE____', new Map([['2,2-3,4', 15000]])],
            ['b|__bRbEbAbGbA______/______________bR__/________bH__bC____/bS__bS__bS__bS__bS/__________________/________rS______/rS__rS__rS__rC____/____rC______rH____/__________________/rRrHrErArGrArE____', new Map([['2,6-3,4', 12000]])],
            ['b|__bRbEbAbGbA______/______________bR__/________bH__bC____/bS__bS____bS__bS__bS/________bE________/________rS______/rS__rS__rS__rC____/____rC______rH____/__________________/rRrHrErArGrArE____', new Map([['0,6-2,4', 15000]])],
            ['b|____bE__bGbA______/____bR__bA________/______bAbCbH______/bS__bS__bS__bS__bS/____________rR____/________rS______/rS__rS__rS______rS/____rC__rE__rH____/__________________/rR__rErArGrA______', new Map([['9,2-4,2', 10000]])],
            ['b|________bG____bE__/______bA__bA______/____bH________bR__/bS__bS__bS__bS__bS/__________________/________rR______/rS__rS__rS__rS____/________rE________/____rC__rA__rH____/rR__rErA__rG______', new Map([['6,5-3,5', 9000]])],
            ['b|________bG____bE__/______bA__bA______/____bH________bR__/bS__bS__bS__bS__bS/____________rR____/________rS______/rS__rS__rS__rS____/________rE________/____rC__rA__rH____/rR__rErA__rG______', new Map([['2,4-4,2', 15000]])]
        ]);
        const forcedReviewedOverrides = new Map([
            ['b|bR__bEbAbGbA______/______________bR__/____bH______bHbCbE/bS__bS__bS______bS/____________bS____/____rS________rR__/________rS__bC__rS/__rCrH__rE__rHrC__/__________________/rR____rArGrArE____', '3,1-8,1'],
            ['b|bR____bAbG________/bH______bA________/__rR____bErR____bE/bS______________bS/____bS__rCbH______/____________bC____/____bR__rS______rS/__________rC______/________rA________/______rArG________', '6,2-6,4'],
            ['b|____bE__bGbA______/____bR__bArC______/________bC__bHbCbE/bS__rC________rRbS/______bH____rS____/____bS__bR__rH__rS/rSrR______________/________rE__rH____/________rA________/____rErG__rA______', '1,2-2,2'],
            ['b|____bE__bGbA______/____bR____________/______bAbC__bC__bE/bS______rC____rRbS/______bH__rS______/____bS__bR__rH__rS/rSrR______________/________rE__rH____/________rA________/____rErG__rA______', '2,3-1,4'],
            ['b|bR__bEbAbG__bEbR__/________bA________/__bCbH______bHbC__/bS__bS__bS__bSrRbS/__________________/__________________/rS__rS__rS__rS__rS/__rCrH____rC____rH/__________________/rR__rErArGrArE____', '3,2-4,2'],
            ['b|bR__bEbAbGbAbE____/______________bR__/__bCbH______bHbC__/bS__bS__bS__bSrRbS/__________________/__________________/rS__rS__rS__rS__rS/__rCrH__rErC____rH/rR________________/______rArGrArE____', '3,2-4,2'],
            ['b|bR__bEbAbGbAbE____/______________bR__/____bH______bHbC__/bSbCbS__bS__bSrRbS/__________________/__rC______________/rS__rS__rS__rS__rS/____rH__rErC____rH/rR________________/______rArGrArE____', '3,6-4,6'],
            ['b|bR__bEbAbGbAbE____/______________bR__/____bH______bHbC__/bSbC____bS__bSrRbS/____bS____________/____________rC____/rS__rS__rS__rS__rS/____rH__rErC____rH/rR________________/______rArGrArE____', '3,6-4,6'],
            ['b|__bRbEbAbGbAbE____/________bH____bR__/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rC__/rS__rS__rS__rS__rS/____rH__rErC____rH/__rR______________/______rArGrArE____', '3,6-4,6'],
            ['b|__bRbEbAbGbAbEbR__/________bH________/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rCrS/rS__rS__rS__rS____/____rH__rErC____rH/__rR______________/______rArGrArE____', '3,6-4,6'],
            ['b|__bRbEbAbGbAbE____/________bH____bR__/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/______________rCrS/rS__rS__rS__rS____/____rH__rE__rC__rH/__rR______________/______rArGrArE____', '3,6-4,6'],
            ['b|__bRbEbAbGbAbEbR__/________bH________/____bH________bC__/bSbC____bS__bSrRbS/____bS____________/____________rSrCrS/rS__rS__rS________/____rH__rE__rC__rH/__rR______________/______rArGrArE____', '3,6-4,6'],
            ['b|____bEbA__rRbE____/________bG__bRrC__/____bH____________/bS__bSbHbS__rH__bS/____________rS____/____rS____________/____bC__bRrH____rS/________rE________/________rA________/____rErArGrR______', '1,6-1,7'],
            ['b|__rR________bE____/________bAbG______/bE____bA__________/bS____rR________bS/bR__________bS____/________rC__rErH__/________rSbR____rS/__________________/________rG________/______rA__bC______', '4,0-8,0'],
            ['b|____bEbAbGbAbE____/__________________/bC__bH______bHbC__/bSbRbS__bS__bS__bS/__________________/____rSbR____rS____/rS______rS__rC__rS/____rC__rE__rH____/________rA________/rRrHrErArG______rR', '3,1-8,1'],
            ['b|____bEbAbGbA____rR/________bH__bC____/bC________bH______/__bRbS__bSrS____bS/bS____bR__________/__________________/____rC__rS____rCrS/rH______rE__rH____/rR______rA________/____rErArG________', '1,4-3,5'],
            ['b|____bEbAbGbA______/________bH__rR____/bC________bR______/__bRbS__bS______bS/bS__bC____________/______________rH__/________rS____rCrS/rH______rE________/rR______rA________/____rErArG________', '3,1-2,1'],
            ['b|____bEbAbG________/____bC__bA__bC____/________bR________/______________rR__/____rR__rC________/__________________/bS______rS__bH__rS/rH______rE________/________rA________/____rErArG________', '1,6-1,5'],
            ['b|____bEbAbGbAbE____/________bR________/____________bH__bR/bS__bS__bH__bS__bS/______bCbS________/____rSrH__rHrS____/rS______rS____bCrS/__rC____rE____rC__/________rArR______/____rR__rGrArE____', '4,4-5,4'],
            ['b|____bEbAbGbAbE____/______bC__________/________bR__bH__bR/bS__rC____rRbS__bS/______rSbS________/____________rS____/rS____bCrS______rS/__rC____rE________/________rA________/____rR__rGrArE____', '4,4-5,4'],
            ['b|______bAbGbAbE____/____rRbC__________/bE____bR____bH__bR/bSrC________bS__bS/____rCrSbS________/____________rS____/bC______rS______rS/________rE________/________rA________/____rR__rGrArE____', '2,3-4,3'],
            ['b|____bEbAbGbAbEbR__/__________bR______/____bH______bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______rS/rH__rC__rErC____rH/________rA________/rR____rArG__rE__rR', '2,7-2,8'],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rSbR____rS/rH__rC__rE______rH/________rA________/__rR__rArGrCrErR__', '0,6-2,4'],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bHbC__/bSbCbS__bS__bS__bS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE______rH/________rA____rR__/__rR__rArGrCrE____', '0,6-2,4'],
            ['b|____bEbAbG__bEbR__/bH______bA________/____________bH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______rS______bR/rH__rC__rE____rRrH/________rA________/__rR__rArGrCrE____', '0,6-2,4'],
            ['b|____bEbAbG__bEbR__/bH________rC______/__________bAbH____/bSbCbS__bS__bSbCbS/__________________/____rS______rS____/rS______bR________/rH__rC__rE__rR__rH/________rA________/__rR__rArG__rE____', '0,7-1,7'],
            ['b|____bEbAbG__bE____/bH________bR______/__________bA______/bSbCrS__bS__bSbCbS/____rS______rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', '3,6-4,6'],
            ['b|____bEbAbGbHbE____/bH________bR______/__________bA______/bSbCrS__bS__bSbCbS/____________rS____/__________________/bR________________/rHrRrC__rE__rR__rH/________rA________/______rArG__rE____', '3,6-4,6'],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/__________________/bR________________/rHrR____rE__rR__rH/________rA________/____rCrArG__rE____', '3,1-0,1'],
            ['b|____bEbAbGbHbE____/bH__________bRbC__/__________bA______/bSbCrS__bS__rS__bS/__________________/______________rH__/________bR________/rHrR____rE__rR____/________rA________/____rCrArG__rE____', '3,1-6,1'],
            ['b|__bCbEbAbGbHbE____/bH__________bRbC__/__________bA______/bS__rS__bS__rS__bS/__________________/______________rH__/______bR__________/rH__rR__rE__rR____/________rA________/rC____rArG__rE____', '0,2-2,4'],
            ['b|____bEbAbG__bHbE____/bH______bA____bC__/__________rS______/bS__rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', '0,5-2,4'],
            ['b|______bG__bHbE____/bH______bA____bC__/________bE________/____rS________rR__/bS________________/________________bS/__________________/________rE__rH____/______bRrA________/____rCrArG__rE____', '0,5-2,6']
        ]);
        const forcedReviewedHistoryOverrides = new Map([
            ['9,7-7,8|0,7-2,6|7,7-7,5|0,1-2,2|6,2-5,2|0,8-0,7|6,6-5,6|0,0-1,0|9,2-7,4|1,0-1,4|7,1-7,2|1,4-1,5|9,5-8,4|2,1-3,1|9,1-7,0|0,5-1,4|7,5-9,5|1,5-6,5|9,0-9,1|2,2-1,0|9,8-9,7|6,5-6,8|9,7-8,7|2,7-3,7|8,7-7,7|6,8-6,4|9,5-1,5|1,4-2,5|7,7-7,6|6,4-6,0|9,1-7,1|0,7-1,7|5,2-4,2|1,7-1,5|5,6-4,6', '3,6-4,6'],
            ['9,7-7,8|0,7-2,6|7,7-7,5|0,1-2,2|6,2-5,2|0,8-0,7|6,6-5,6|0,0-1,0|9,2-7,4|1,0-1,4|7,1-7,2|1,4-1,5|9,5-8,4|2,1-3,1|9,1-7,0|0,5-1,4|7,5-9,5|1,5-6,5|9,0-9,1|2,2-1,0|9,8-9,7|6,5-6,8|9,7-8,7|2,7-3,7|8,7-7,7|6,8-6,4|9,5-1,5|1,4-2,5|7,7-7,6|6,4-6,0|9,1-7,1|0,7-1,7|5,2-4,2|1,7-1,5|5,6-4,6|2,6-0,5|4,2-3,2|1,5-1,6|4,6-3,6|3,7-1,7|7,2-9,2|6,0-6,4|7,8-5,7|6,4-6,3|7,1-7,2|3,1-0,1|9,2-9,0|1,6-1,4|3,6-2,6|0,1-1,1|2,6-2,5|3,8-4,8|7,6-3,6|4,8-5,8|5,7-7,6', '6,3-6,5'],
            ['9,7-7,8|0,7-2,6|7,7-7,5|0,1-2,2|6,2-5,2|0,8-0,7|6,6-5,6|0,0-1,0|9,2-7,4|1,0-1,4|7,1-7,2|1,4-1,5|9,5-8,4|2,1-3,1|9,1-7,0|0,5-1,4|7,5-9,5|1,5-6,5|9,0-9,1|2,2-1,0|9,8-9,7|6,5-6,8|9,7-8,7|2,7-3,7|8,7-7,7|6,8-6,4|9,5-1,5|1,4-2,5|7,7-7,6|6,4-6,0|9,1-7,1|0,7-1,7|5,2-4,2|1,7-1,5|5,6-4,6|2,6-0,5|4,2-3,2|1,5-1,6|4,6-3,6|3,7-1,7|7,2-9,2|6,0-6,4|7,8-5,7|6,4-6,3|7,1-7,2|3,1-0,1|9,2-9,0|1,6-1,4|3,6-2,6|0,1-1,1|2,6-2,5|3,8-4,8|7,6-3,6|4,8-5,8|5,7-7,6|1,1-1,2|7,0-5,1|1,2-7,2|5,1-6,3|1,4-1,3|3,6-3,4|0,3-1,4|6,3-5,5|1,3-8,3|9,0-9,2', '0,5-2,4'],
            ['9,7-7,8|0,7-2,6|7,7-7,5|0,1-2,2|6,2-5,2|0,8-0,7|6,6-5,6|0,0-1,0|9,2-7,4|1,0-1,4|7,1-7,2|1,4-1,5|9,5-8,4|2,1-3,1|9,1-7,0|0,5-1,4|7,5-9,5|1,5-6,5|9,0-9,1|2,2-1,0|9,8-9,7|6,5-6,8|9,7-8,7|2,7-3,7|8,7-7,7|6,8-6,4|9,5-1,5|1,4-2,5|7,7-7,6|6,4-6,0|9,1-7,1|0,7-1,7|5,2-4,2|1,7-1,5|5,6-4,6|2,6-0,5|4,2-3,2|1,5-1,6|4,6-3,6|3,7-1,7|7,2-9,2|6,0-6,4|7,8-5,7|6,4-6,3|7,1-7,2|3,1-0,1|9,2-9,0|1,6-1,4|3,6-2,6|0,1-1,1|2,6-2,5|3,8-4,8|7,6-3,6|4,8-5,8|5,7-7,6|1,1-1,2|7,0-5,1|1,2-7,2|5,1-6,3|1,4-1,3|3,6-3,4|0,3-1,4|6,3-5,5|1,3-8,3|9,0-9,2|0,2-2,4|2,5-1,5|7,2-7,6|5,5-7,6|0,4-0,3|1,5-1,4|3,0-4,0|3,4-3,7', '0,5-2,6']
        ]);
        function getReviewedPositionBias(board, color, move, history) {
            const historyLength = (history || []).length;
            if (historyLength > 84) {
                return 0;
            }

            const moveHints = reviewedPositionHints.get(getBoardKey(board, color));
            if (!moveHints) {
                return 0;
            }

            const rawBias = moveHints.get(getMoveKey(move)) || 0;
            if (!rawBias) {
                return 0;
            }

            if (historyLength > 40) {
                const lateMax = rawBias >= 15000 ? 1800 : rawBias >= 10000 ? 1200 : rawBias >= 5000 ? 520 : 320;
                const divisor = rawBias >= 15000 ? 10 : rawBias >= 10000 ? 12 : rawBias >= 5000 ? 14 : 20;
                return Math.min(lateMax, Math.round(rawBias / divisor));
            }

            const earlyMax = rawBias >= 15000 ? 1400 : rawBias >= 10000 ? 900 : rawBias >= 5000 ? 560 : 420;
            const divisor = rawBias >= 15000 ? 12 : rawBias >= 10000 ? 14 : rawBias >= 5000 ? 16 : 18;
            return Math.min(earlyMax, Math.round(rawBias / divisor));
        }

        function getForcedReviewedMove() {
            return null;
        }

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
            const base = CONFIG.phase[phase];
            let maxDepth = base.maxDepth;
            let rootLimit = base.rootLimit;
            let branchLimit = base.branchLimit;
            let quiescenceLimit = base.quiescenceLimit;

            if (overrideTimeBudgetMs >= 2200) {
                if (phase === 'middlegame' || phase === 'endgame') {
                    maxDepth += 1;
                }
                rootLimit += 1;
                quiescenceLimit += 1;
            }

            if (overrideTimeBudgetMs >= 3600) {
                maxDepth += 1;
                rootLimit += phase === 'opening' ? 0 : 0;
                branchLimit += phase === 'endgame' ? 1 : 0;
                quiescenceLimit += 1;
            }

            if (overrideTimeBudgetMs >= 6000) {
                maxDepth += phase === 'opening' ? 1 : 2;
                quiescenceLimit += 1;
            }

            if (overrideTimeBudgetMs >= 9000) {
                maxDepth += 1;
                quiescenceLimit += 1;
            }

            if (overrideTimeBudgetMs >= 6000) {
                rootLimit = Math.min(rootLimit, phase === 'opening' ? 10 : phase === 'middlegame' ? 11 : 14);
                branchLimit = Math.min(branchLimit, phase === 'opening' ? 10 : phase === 'middlegame' ? 11 : 14);
            }

            if (overrideTimeBudgetMs >= 9000) {
                rootLimit = Math.min(rootLimit, phase === 'opening' ? 9 : phase === 'middlegame' ? 10 : 13);
                branchLimit = Math.min(branchLimit, phase === 'opening' ? 9 : phase === 'middlegame' ? 10 : 13);
            }

            return {
                phase,
                stage,
                ...base,
                maxDepth,
                rootLimit,
                branchLimit,
                quiescenceLimit,
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

        function isDelayedQuietCannonReverse(move, previousOwnMove, color) {
            return Boolean(
                previousOwnMove &&
                move.piece === `${color}C` &&
                !move.captured &&
                move.fromRow === move.toRow &&
                previousOwnMove.fromRow === previousOwnMove.toRow &&
                isExactReverseMove(previousOwnMove, move)
            );
        }

        function isNaturalHorseDevelopment(move, color) {
            return move.piece === `${color}H` &&
                move.fromRow === homeRow(color) &&
                move.toRow === naturalHorseRow(color) &&
                (move.toCol === 2 || move.toCol === 6) &&
                !move.captured;
        }

        function isOpeningSideSoldierAdvance(move, color) {
            return move.piece === `${color}S` &&
                move.fromRow === soldierRow(color) &&
                move.fromCol === move.toCol &&
                (move.fromCol === 2 || move.fromCol === 6) &&
                !move.captured;
        }

        function countUndevelopedElephants(board, color) {
            const row = homeRow(color);
            let count = 0;
            if (board[row][2] === `${color}E`) count += 1;
            if (board[row][6] === `${color}E`) count += 1;
            return count;
        }

        function countUndevelopedAdvisors(board, color) {
            const row = homeRow(color);
            let count = 0;
            if (board[row][3] === `${color}A`) count += 1;
            if (board[row][5] === `${color}A`) count += 1;
            return count;
        }

        function isOpeningFocusMove(board, nextBoard, move, color, history, openingContext) {
            if (history.length >= 24 || move.captured) {
                return true;
            }

            if (isInCheck(nextBoard, otherColor(color))) {
                return true;
            }

            const type = move.piece[1];
            if (type === 'H' || type === 'C') {
                return true;
            }

            if (type === 'S') {
                return isOpeningSideSoldierAdvance(move, color);
            }

            if (type === 'E' || type === 'A') {
                return true;
            }

            if (type !== 'R') {
                return false;
            }

            if (move.fromRow !== homeRow(color)) {
                return true;
            }

            if (openingContext.opponentCenteredCannon || openingContext.ownCenteredCannon) {
                return true;
            }

            if (openingContext.developedHorses >= 2) {
                return true;
            }

            if (isHomeHorizontalRookMove(move, color) && openingContext.undevelopedHorses <= 1) {
                return true;
            }

            return false;
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

        function getSingleScreenOnFile(board, col, startRow, endRow) {
            let screen = null;
            const step = startRow < endRow ? 1 : -1;

            for (let row = startRow + step; row !== endRow; row += step) {
                if (!board[row][col]) {
                    continue;
                }
                if (screen) {
                    return null;
                }
                screen = { row, col, piece: board[row][col] };
            }

            return screen;
        }

        function getSingleScreenOnRow(board, row, startCol, endCol) {
            let screen = null;
            const step = startCol < endCol ? 1 : -1;

            for (let col = startCol + step; col !== endCol; col += step) {
                if (!board[row][col]) {
                    continue;
                }
                if (screen) {
                    return null;
                }
                screen = { row, col, piece: board[row][col] };
            }

            return screen;
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

        function getHomeRookCannonExposures(board, color) {
            const opponent = otherColor(color);
            const enemyCannon = `${opponent}C`;
            const exposures = [];

            for (let rookRow = 0; rookRow < 10; rookRow++) {
                for (let rookCol = 0; rookCol < 9; rookCol++) {
                    if (board[rookRow][rookCol] !== `${color}R` || rookRow !== homeRow(color)) {
                        continue;
                    }

                    for (let row = 0; row < 10; row++) {
                        for (let col = 0; col < 9; col++) {
                            if (board[row][col] !== enemyCannon) {
                                continue;
                            }

                            let screen = null;
                            let axis = '';
                            if (col === rookCol && row !== rookRow && countPiecesBetweenOnFile(board, rookCol, row, rookRow) === 1) {
                                screen = getSingleScreenOnFile(board, rookCol, row, rookRow);
                                axis = 'file';
                            } else if (row === rookRow && col !== rookCol && countPiecesBetweenOnRow(board, rookRow, col, rookCol) === 1) {
                                screen = getSingleScreenOnRow(board, rookRow, col, rookCol);
                                axis = 'row';
                            }

                            if (!screen) {
                                continue;
                            }

                            exposures.push({
                                rookRow,
                                rookCol,
                                cannonRow: row,
                                cannonCol: col,
                                screenRow: screen.row,
                                screenCol: screen.col,
                                screenPiece: screen.piece,
                                axis
                            });
                        }
                    }
                }
            }

            return exposures;
        }

        function evaluateHomeRookCannonExposure(board, color, stage) {
            let score = 0;

            for (const exposure of getHomeRookCannonExposures(board, color)) {
                let penalty = stageWeight(stage, 96, 58, 14);
                if (exposure.screenPiece[0] === color) {
                    penalty += stageWeight(stage, 22, 16, 4);
                }
                if (exposure.screenPiece === `${color}C`) {
                    penalty += stageWeight(stage, 132, 86, 20);
                } else if (exposure.screenPiece[1] === 'H') {
                    penalty += stageWeight(stage, 34, 22, 6);
                } else if (exposure.screenPiece[1] === 'A' || exposure.screenPiece[1] === 'E') {
                    penalty += stageWeight(stage, 18, 10, 2);
                }

                score -= Math.round(penalty);
            }

            return score;
        }

        function getHomeRookCannonReliefBias(board, nextBoard, move, color, stage) {
            if (stage.opening < 0.18) {
                return 0;
            }

            const before = getHomeRookCannonExposures(board, color);
            const ownCannonScreens = before.filter(exposure => exposure.screenPiece === `${color}C`);
            if (ownCannonScreens.length === 0) {
                return 0;
            }

            const after = getHomeRookCannonExposures(nextBoard, color);
            const reducedExposure = after.length < before.length;
            const movedScreenCannon = ownCannonScreens.some(exposure =>
                exposure.screenRow === move.fromRow &&
                exposure.screenCol === move.fromCol &&
                move.piece === `${color}C`
            );
            const movedExposedRook = ownCannonScreens.some(exposure =>
                exposure.rookRow === move.fromRow &&
                exposure.rookCol === move.fromCol &&
                move.piece === `${color}R`
            );

            if (movedScreenCannon && reducedExposure) {
                return stageWeight(stage, 428, 252, 52);
            }

            if (reducedExposure && move.piece[1] === 'R' && !movedExposedRook) {
                return -stageWeight(stage, 188, 112, 26);
            }

            if (!reducedExposure && !movedScreenCannon && !movedExposedRook) {
                return -stageWeight(stage, move.captured ? 184 : 236, move.captured ? 112 : 142, move.captured ? 28 : 34);
            }

            return 0;
        }

        function getUrgentHomeRookScreenRepairMoves(board, color, legalMoves) {
            const exposures = getHomeRookCannonExposures(board, color)
                .filter(exposure => exposure.screenPiece === `${color}C`);
            if (exposures.length === 0) {
                return new Set();
            }

            const cannonRepairs = new Set();
            const rookRepairs = new Set();
            for (const move of legalMoves) {
                const relevantCannon = exposures.some(exposure =>
                    exposure.screenRow === move.fromRow &&
                    exposure.screenCol === move.fromCol &&
                    move.piece === `${color}C`
                );
                const relevantRook = exposures.some(exposure =>
                    exposure.rookRow === move.fromRow &&
                    exposure.rookCol === move.fromCol &&
                    move.piece === `${color}R`
                );
                const relevant = relevantCannon || relevantRook;
                if (!relevant) {
                    continue;
                }

                const nextBoard = applyMoveToBoard(board, move);
                const remaining = getHomeRookCannonExposures(nextBoard, color)
                    .filter(exposure => exposure.screenPiece === `${color}C`);
                if (remaining.length < exposures.length) {
                    if (relevantCannon) {
                        cannonRepairs.add(getMoveKey(move));
                    } else if (relevantRook) {
                        rookRepairs.add(getMoveKey(move));
                    }
                }
            }

            return cannonRepairs.size > 0 ? cannonRepairs : rookRepairs;
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

        function countLooseHorses(board, color, stage) {
            const opponent = otherColor(color);
            let count = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] !== `${color}H` || !isSquareAttacked(board, row, col, opponent)) {
                        continue;
                    }

                    const attackers = getAttackerValues(board, row, col, opponent);
                    const defenders = getAttackerValues(board, row, col, color);
                    if (attackers.length === 0) {
                        continue;
                    }

                    const cheapest = attackers[0];
                    const outnumbered = defenders.length === 0 || attackers.length > defenders.length;
                    const pressuredByCheapAttack = cheapest <= stageWeight(stage, 95, 125, 165);
                    if (outnumbered || pressuredByCheapAttack) {
                        count += 1;
                    }
                }
            }

            return count;
        }

        function countLooseCannons(board, color, stage) {
            const opponent = otherColor(color);
            let count = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    if (board[row][col] !== `${color}C`) {
                        continue;
                    }

                    const attackers = getAttackerValues(board, row, col, opponent);
                    if (attackers.length === 0) {
                        continue;
                    }

                    const defenders = getAttackerValues(board, row, col, color);
                    const cheapest = attackers[0];
                    const outnumbered = defenders.length === 0 || attackers.length > defenders.length;
                    const pressuredByCheapAttack = cheapest <= stageWeight(stage, 110, 160, 205);
                    if (outnumbered || pressuredByCheapAttack) {
                        count += 1;
                    }
                }
            }

            return count;
        }

        function countBackRankHorses(board, color) {
            const row = homeRow(color);
            let count = 0;

            for (let col = 0; col < 9; col++) {
                if (board[row][col] === `${color}H`) {
                    count += 1;
                }
            }

            return count;
        }

        function getLooseHorseReliefMoves(board, color, stage, legalMoves) {
            const looseHorsesBefore = countLooseHorses(board, color, stage);
            if (looseHorsesBefore === 0) {
                return new Set();
            }

            const reliefs = new Set();
            for (const move of legalMoves) {
                if (move.piece !== `${color}H`) {
                    continue;
                }

                const nextBoard = applyMoveToBoard(board, move);
                if (countLooseHorses(nextBoard, color, stage) < looseHorsesBefore) {
                    reliefs.add(getMoveKey(move));
                }
            }

            return reliefs;
        }

        function getLooseCannonReliefMoves(board, color, stage, legalMoves) {
            const looseCannonsBefore = countLooseCannons(board, color, stage);
            if (looseCannonsBefore === 0) {
                return new Set();
            }

            const reliefs = new Set();
            for (const move of legalMoves) {
                if (move.piece !== `${color}C`) {
                    continue;
                }

                const nextBoard = applyMoveToBoard(board, move);
                if (countLooseCannons(nextBoard, color, stage) < looseCannonsBefore) {
                    reliefs.add(getMoveKey(move));
                }
            }

            return reliefs;
        }

        function getBackRankHorseReliefMoves(board, color, legalMoves) {
            const backRankHorsesBefore = countBackRankHorses(board, color);
            if (backRankHorsesBefore === 0) {
                return new Set();
            }

            const reliefs = new Set();
            for (const move of legalMoves) {
                if (move.piece !== `${color}H` || move.fromRow !== homeRow(color) || move.toRow === move.fromRow) {
                    continue;
                }

                const nextBoard = applyMoveToBoard(board, move);
                if (countBackRankHorses(nextBoard, color) < backRankHorsesBefore) {
                    reliefs.add(getMoveKey(move));
                }
            }

            return reliefs;
        }

        function hasAttackerType(board, row, col, attackerColor, targetTypes) {
            for (let scanRow = 0; scanRow < 10; scanRow++) {
                for (let scanCol = 0; scanCol < 9; scanCol++) {
                    const piece = board[scanRow][scanCol];
                    if (!piece || piece[0] !== attackerColor || !targetTypes.includes(piece[1])) {
                        continue;
                    }

                    const pseudoMoves = getPseudoMoves(board, scanRow, scanCol);
                    if (pseudoMoves.some(move => move.toRow === row && move.toCol === col)) {
                        return true;
                    }
                }
            }

            return false;
        }

        function countThreatenedEnemyMajors(board, color) {
            const opponent = otherColor(color);
            let count = 0;

            for (let row = 0; row < 10; row++) {
                for (let col = 0; col < 9; col++) {
                    const piece = board[row][col];
                    if (!piece || piece[0] !== opponent || !['R', 'H', 'C'].includes(piece[1])) {
                        continue;
                    }
                    if (isSquareAttacked(board, row, col, color)) {
                        count += 1;
                    }
                }
            }

            return count;
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
            score += evaluateExchangeSafety(board, color, stage);
            score += evaluateHomeRookCannonExposure(board, color, stage);
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

        function isRepeatedQuietCannonShuffle(move, lastOwnMove, previousOwnMove, color) {
            if (!move || move.piece !== `${color}C` || move.captured) {
                return false;
            }

            if (move.toRow !== move.fromRow || move.fromRow === cannonRow(color)) {
                return false;
            }

            const references = [lastOwnMove, previousOwnMove];
            return references.some(previousMove =>
                previousMove &&
                previousMove.toRow === move.fromRow &&
                previousMove.toCol === move.fromCol &&
                previousMove.toRow === previousMove.fromRow
            );
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

        function getPracticalOpeningBias(board, nextBoard, move, color, history, openingContext) {
            if (getPhase(board, history) !== 'opening') {
                return 0;
            }

            const undevelopedMajors = openingContext.undevelopedMajors;
            const undevelopedRooks = openingContext.undevelopedRooks;
            const undevelopedHorses = openingContext.undevelopedHorses;
            const developedHorses = openingContext.developedHorses;
            const undevelopedElephants = openingContext.undevelopedElephants;
            const undevelopedAdvisors = openingContext.undevelopedAdvisors;
            const rookMovesAvailable = openingContext.rookMovesAvailable;
            const horizontalRookMovesAvailable = openingContext.horizontalRookMovesAvailable;
            const lastOwnMove = openingContext.lastOwnMove;
            const previousOwnMove = openingContext.previousOwnMove;
            const ownCenteredCannon = openingContext.ownCenteredCannon;
            const opponentCenteredCannon = openingContext.opponentCenteredCannon;
            const homeRookCannonExposures = openingContext.homeRookCannonExposures;
            const centralCannonPressure = ownCenteredCannon || opponentCenteredCannon;
            const openingPlanMode = getOpeningPlanMode(openingContext);
            const focusMove = isOpeningFocusMove(board, nextBoard, move, color, history, openingContext);
            let score = 0;

            if (!move.captured) {
                if (focusMove) {
                    score += 26;
                } else {
                    score -= undevelopedMajors >= 2 ? 138 : 74;
                }
            }

            const ownCannonHomeRookExposures = homeRookCannonExposures.filter(
                exposure => exposure.screenPiece === `${color}C`
            );
            if (ownCannonHomeRookExposures.length > 0) {
                const movesScreenCannon = ownCannonHomeRookExposures.some(exposure =>
                    exposure.screenRow === move.fromRow &&
                    exposure.screenCol === move.fromCol &&
                    move.piece === `${color}C`
                );
                const movesExposedHomeRook = ownCannonHomeRookExposures.some(exposure =>
                    exposure.rookRow === move.fromRow &&
                    exposure.rookCol === move.fromCol &&
                    move.piece === `${color}R`
                );

                if (movesScreenCannon) {
                    score += move.toRow === move.fromRow
                        ? 432 - Math.abs(4 - move.toCol) * 8
                        : 328;
                } else if (!movesExposedHomeRook) {
                    score -= move.captured ? 336 : 432;
                } else {
                    score -= 104;
                }
            }

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
                        score -= move.toCol === 4 ? 112 : 146;
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
                    score -= 122;
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
                const wasAttacked = isSquareAttacked(board, move.fromRow, move.fromCol, otherColor(color));
                const nowAttacked = isSquareAttacked(nextBoard, move.toRow, move.toCol, otherColor(color));
                if (wasAttacked && !nowAttacked) {
                    const retreating = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
                    score += retreating ? 264 : 112;
                } else if (wasAttacked && nowAttacked) {
                    score -= 164;
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
                    score += 96;
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
                if (move.fromRow !== cannonRow(color)) {
                    const forward = color === RED_COLOR ? move.toRow < move.fromRow : move.toRow > move.fromRow;
                    const edgeFile = move.fromCol === 0 || move.fromCol === 8;
                    if (forward && edgeFile) {
                        score -= 188;
                    }
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
                if (isOpeningSideSoldierAdvance(move, color)) {
                    score += (undevelopedRooks >= 1 ? 42 : 24) + (centralCannonPressure ? 0 : 12);
                }
            }

            if (!move.captured && (move.piece[1] === 'A' || move.piece[1] === 'E')) {
                score -= undevelopedMajors >= 2 ? 54 : 24;
                if (move.piece[1] === 'E' && undevelopedElephants >= 1) {
                    score += ownCenteredCannon || opponentCenteredCannon ? 12 : 28;
                }
                if (move.piece[1] === 'A' && undevelopedAdvisors >= 1) {
                    score += centralCannonPressure ? 8 : 18;
                }
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

                if (move.piece[1] === 'C' && move.toRow === move.fromRow) {
                    score -= move.fromRow !== cannonRow(color)
                        ? undevelopedMajors >= 2 ? 112 : 76
                        : undevelopedMajors >= 2 ? 62 : 34;
                }
            }

            if (isDelayedQuietCannonReverse(move, previousOwnMove, color)) {
                score -= undevelopedMajors >= 2
                    ? 148
                    : undevelopedMajors === 1
                        ? 104
                        : 58;

                if (undevelopedHorses >= 1) {
                    score -= 22;
                }
                if (move.toCol === 0 || move.toCol === 8) {
                    score -= 24;
                }
            }

            if (!move.captured && move.piece[1] === 'R' && move.fromRow === homeRow(color)) {
                if (isHomeCornerRookRetreat(move, color)) {
                    score -= undevelopedMajors >= 2 ? 176 : 92;
                }
                if (lastOwnMove && isExactReverseMove(lastOwnMove, move)) {
                    score -= undevelopedMajors >= 2 ? 218 : 118;
                }
                if (previousOwnMove && isExactReverseMove(previousOwnMove, move)) {
                    score -= undevelopedMajors >= 2 ? 152 : 82;
                }
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

        function getDeepRookRaidPenalty(board, nextBoard, move, color, stage) {
            if (move.piece !== `${color}R` || !move.captured) {
                return 0;
            }

            const inEnemyCamp = color === RED_COLOR ? move.toRow <= 2 : move.toRow >= 7;
            if (!inEnemyCamp) {
                return 0;
            }

            const mobilityBefore = getPseudoMoves(board, move.fromRow, move.fromCol).length;
            const mobilityAfter = getPseudoMoves(nextBoard, move.toRow, move.toCol).length;
            const attackers = getAttackerValues(nextBoard, move.toRow, move.toCol, otherColor(color));
            const defenders = getAttackerValues(nextBoard, move.toRow, move.toCol, color);
            const kingSafetyDelta = evaluateKingSafety(nextBoard, color, stage) - evaluateKingSafety(board, color, stage);
            let penalty = 0;

            if (mobilityAfter <= 4 && mobilityAfter + 2 < mobilityBefore) {
                penalty += stageWeight(stage, 6, 54, 22);
            } else if (mobilityAfter <= 2) {
                penalty += stageWeight(stage, 8, 72, 28);
            }

            if (attackers.length > defenders.length) {
                penalty += stageWeight(stage, 10, 82, 34);
            } else if (attackers.length > 0 && defenders.length === 0) {
                penalty += stageWeight(stage, 14, 110, 42);
            }

            if (move.captured[1] !== 'R' && move.captured[1] !== 'G') {
                penalty += stageWeight(stage, 4, 30, 12);
                if (!isInCheck(nextBoard, otherColor(color))) {
                    penalty += stageWeight(stage, 0, 118, 44);
                }
            }

            if (kingSafetyDelta < 0) {
                penalty += Math.round(-kingSafetyDelta * stageWeight(stage, 0.12, 0.55, 0.28));
            }

            return Math.round(penalty);
        }

        function getDefensiveRepairBias(board, nextBoard, move, color, stage) {
            if (stage.middlegame < 0.2 && stage.endgame < 0.25) {
                return 0;
            }

            const safetyDelta = evaluateKingSafety(nextBoard, color, stage) - evaluateKingSafety(board, color, stage);
            let score = 0;

            if (safetyDelta > 0) {
                score += Math.round(safetyDelta * stageWeight(stage, 0.16, 0.52, 0.72));
            }

            if (!move.captured && move.piece[1] === 'A') {
                if (move.toCol === 4) {
                    score += safetyDelta > 4
                        ? stageWeight(stage, 0, 54, 132)
                        : stageWeight(stage, 0, 24, 72);
                }
                if (safetyDelta > 0) {
                    score += stageWeight(stage, 0, 28, 44);
                }
            } else if (!move.captured && move.piece[1] === 'E' && safetyDelta > 0) {
                score += stageWeight(stage, 0, 14, 24);
            } else if (!move.captured &&
                move.piece[1] === 'C' &&
                Math.abs(move.toCol - 4) < Math.abs(move.fromCol - 4)) {
                score += safetyDelta > 0
                    ? stageWeight(stage, 0, 18, 28)
                    : stageWeight(stage, 0, 8, 14);
            }

            return Math.round(score);
        }

        function getTacticalBias(board, nextBoard, move, color, history) {
            const stage = getStageProfile(board, history);
            const capturedValue = move.captured ? pieceValue(move.captured[1], stage) : 0;
            const moverValue = pieceValue(move.piece[1], stage);
            const sameSideMoves = getSideHistoryMoves(history, color);
            const lastOwnMove = sameSideMoves[sameSideMoves.length - 1] || null;
            const previousOwnMove = sameSideMoves.length > 1 ? sameSideMoves[sameSideMoves.length - 2] : null;
            const repeatedQuietCannonShuffle = isRepeatedQuietCannonShuffle(move, lastOwnMove, previousOwnMove, color);
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

            if (!move.captured && move.piece[1] === 'C') {
                const beforeMajorPressure = countThreatenedEnemyMajors(board, color);
                const afterMajorPressure = countThreatenedEnemyMajors(nextBoard, color);
                if (afterMajorPressure > beforeMajorPressure) {
                    score += (afterMajorPressure - beforeMajorPressure) * stageWeight(
                        stage,
                        2,
                        repeatedQuietCannonShuffle ? 4 : 14,
                        repeatedQuietCannonShuffle ? 2 : 6
                    );
                }

                if (repeatedQuietCannonShuffle) {
                    score -= stageWeight(stage, 0, 84, 24);
                    if (Math.abs(move.toCol - 4) >= Math.abs(move.fromCol - 4)) {
                        score -= stageWeight(stage, 0, 38, 12);
                    }
                }
            }

            if (!move.captured && move.piece[1] === 'H') {
                const beforeMajorPressure = countThreatenedEnemyMajors(board, color);
                const afterMajorPressure = countThreatenedEnemyMajors(nextBoard, color);
                if (afterMajorPressure > beforeMajorPressure) {
                    score += (afterMajorPressure - beforeMajorPressure) * stageWeight(stage, 6, 20, 10);
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

            if (['R', 'H', 'C'].includes(move.piece[1]) &&
                hasAttackerType(nextBoard, move.toRow, move.toCol, otherColor(color), ['S'])) {
                if (move.piece[1] === 'R') {
                    penalty += stageWeight(stage, 16, 44, 18);
                } else if (move.piece[1] === 'C') {
                    penalty += stageWeight(stage, 34, 118, 36);
                } else {
                    penalty += stageWeight(stage, 14, 36, 18);
                }
                if (move.captured && move.piece[1] === 'C') {
                    penalty += stageWeight(stage, 18, 52, 18);
                }
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

            if (move.piece[1] === 'C' &&
                move.captured &&
                move.captured[1] === 'H' &&
                stage.opening + stage.middlegame >= 0.55) {
                const deepRaid = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
                const edgeFile = move.toCol === 0 || move.toCol === 8;
                if (deepRaid) {
                    penalty += stageWeight(stage, 74, 166, 34);
                }
                if (edgeFile) {
                    penalty += stageWeight(stage, 36, 84, 18);
                }
                if (attackers.length > 0) {
                    penalty += stageWeight(stage, 42, 126, 24);
                }
                if (defenders.length === 0 || attackers.length >= defenders.length) {
                    penalty += stageWeight(stage, 30, 92, 22);
                }
            }

            if (move.piece[1] === 'C' && !move.captured) {
                const deepAdvance = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
                const longAdvance = Math.abs(move.toRow - move.fromRow) >= 3;
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                if (deepAdvance && stage.opening + stage.middlegame >= 0.6) {
                    penalty += stageWeight(stage, 36, 20, 6);
                }
                if (deepAdvance && attackers.length > 0) {
                    penalty += stageWeight(stage, 52, 34, 12);
                }
                if (longAdvance && attackers.length > defenders.length) {
                    penalty += stageWeight(stage, 48, 28, 8);
                }
                if (move.fromRow !== cannonRow(color) && move.toRow === move.fromRow) {
                    if (centerGain < 0) {
                        penalty += Math.abs(centerGain) * stageWeight(stage, 18, 64, 18);
                    } else if (centerGain > 0 && attackers.length >= defenders.length) {
                        penalty -= Math.round(centerGain * stageWeight(stage, 4, 18, 6));
                    }
                }
            }

            return Math.round(penalty);
        }

        function getRootPassivityPenalty(board, nextBoard, move, color, stage, openingContext) {
            if (move.captured || stage.middlegame < 0.2) {
                return 0;
            }

            const backward = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
            const opponent = otherColor(color);
            const fromAttackers = getAttackerValues(board, move.fromRow, move.fromCol, opponent);
            const toAttackers = getAttackerValues(nextBoard, move.toRow, move.toCol, opponent);
            const isRepairingThreatenedMajor =
                ['R', 'C'].includes(move.piece[1]) &&
                fromAttackers.length > 0 &&
                (toAttackers.length === 0 || toAttackers.length < fromAttackers.length);
            const repeatedPiece = openingContext.lastOwnMove &&
                openingContext.lastOwnMove.toRow === move.fromRow &&
                openingContext.lastOwnMove.toCol === move.fromCol;
            const repeatedQuietCannonShuffle = isRepeatedQuietCannonShuffle(
                move,
                openingContext.lastOwnMove,
                openingContext.previousOwnMove,
                color
            );
            let penalty = 0;

            if (move.piece[1] === 'R' && backward && !isRepairingThreatenedMajor) {
                penalty += stageWeight(stage, 0, 20, 8);
            } else if (move.piece[1] === 'C' && backward && !isRepairingThreatenedMajor) {
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
                    penalty += stageWeight(stage, 132, 72, 20);
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
                    penalty += stageWeight(stage, 98, 56, 16);
                }
            }

            if (isHomeCornerRookRetreat(move, color)) {
                penalty += stageWeight(stage, 34, 18, 6);
                if (openingContext.lastOwnMove && isExactReverseMove(openingContext.lastOwnMove, move)) {
                    penalty += stageWeight(stage, 184, 102, 28);
                }
                if (openingContext.previousOwnMove && isExactReverseMove(openingContext.previousOwnMove, move)) {
                    penalty += stageWeight(stage, 126, 72, 22);
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

            if (move.piece[1] === 'C' && !move.captured) {
                const forward = color === RED_COLOR ? move.toRow < move.fromRow : move.toRow > move.fromRow;
                const edgeFile = move.fromCol === 0 || move.fromCol === 8;
                const alreadyAdvanced = move.fromRow !== cannonRow(color);
                if (forward && edgeFile && alreadyAdvanced && stage.opening + stage.middlegame >= 0.55) {
                    penalty += stageWeight(stage, 88, 246, 64);
                }

                if (openingContext.previousOwnMove &&
                    openingContext.previousOwnMove.toRow === move.fromRow &&
                    openingContext.previousOwnMove.toCol === move.fromCol &&
                    move.toRow === move.fromRow) {
                    penalty += move.fromRow !== cannonRow(color)
                        ? stageWeight(stage, 28, 118, 32)
                        : stageWeight(stage, 12, 44, 12);
                }

                if (stage.middlegame >= 0.55 && alreadyAdvanced) {
                    if (move.toRow === move.fromRow && !isInCheck(nextBoard, otherColor(color))) {
                        penalty += move.toCol === 4
                            ? stageWeight(stage, 0, 34, 10)
                            : stageWeight(stage, 0, 128, 36);
                        if (Math.abs(move.toCol - 4) >= Math.abs(move.fromCol - 4)) {
                            penalty += stageWeight(stage, 0, 72, 22);
                        }
                    } else if (forward && !move.captured) {
                        penalty += stageWeight(stage, 0, 58, 18);
                    }
                }
            }

            if (isDelayedQuietCannonReverse(move, openingContext.previousOwnMove, color)) {
                penalty += stageWeight(stage, 52, 136, 34);
            }

            if (repeatedQuietCannonShuffle) {
                penalty += stageWeight(stage, 0, 112, 32);
                if (Math.abs(move.toCol - 4) >= Math.abs(move.fromCol - 4)) {
                    penalty += stageWeight(stage, 0, 44, 12);
                }
            }

            if (move.piece[1] === 'A' || move.piece[1] === 'E') {
                penalty += stageWeight(stage, 0, 10, 4);
                const safetyDelta = evaluateKingSafety(nextBoard, color, stage) - evaluateKingSafety(board, color, stage);
                if (safetyDelta > 0) {
                    penalty -= stageWeight(stage, 0, 12, 18);
                } else {
                    penalty += stageWeight(stage, 0, 34, 12);
                }
                if (move.piece[1] === 'A' && move.toCol === 4) {
                    if (safetyDelta > 4) {
                        penalty -= stageWeight(stage, 0, 18, 30);
                    } else {
                        penalty += stageWeight(stage, 0, 18, 6);
                    }
                }
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

        function getOpponentReplyThreats(nextBoard, move, color, stage, history, positionHistory) {
            if (stage.opening < 0.12 && stage.middlegame < 0.18) {
                return { checkPenalty: 0, capturePenalty: 0 };
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
            let strongestCheck = 0;
            let strongestCapture = 0;

            for (const reply of opponentMoves) {
                const replyBoard = applyMoveToBoard(nextBoard, reply);

                if (reply.captured && reply.captured[0] === color) {
                    const targetType = reply.captured[1];
                    let captureThreat = 0;

                    if (targetType === 'R') {
                        captureThreat += stageWeight(stage, 236, 214, 132);
                    } else if (targetType === 'C') {
                        captureThreat += stageWeight(stage, 164, 148, 92);
                    } else if (targetType === 'H') {
                        captureThreat += stageWeight(stage, 112, 106, 78);
                    } else if (targetType === 'E') {
                        captureThreat += stageWeight(stage, 34, 62, 22);
                    } else if (targetType === 'A') {
                        captureThreat += stageWeight(stage, 28, 54, 20);
                    }

                    if (captureThreat > 0) {
                        if (reply.piece[1] === 'C') {
                            captureThreat += targetType === 'R'
                                ? stageWeight(stage, 122, 88, 24)
                                : stageWeight(stage, 44, 34, 10);
                        } else if (reply.piece[1] === 'R') {
                            captureThreat += stageWeight(stage, 28, 22, 8);
                        } else if (reply.piece[1] === 'H') {
                            captureThreat += stageWeight(stage, 18, 16, 8);
                        }

                        const replyPieceValue = pieceValue(reply.piece[1], stage);
                        const recapturers = getAttackerValues(replyBoard, reply.toRow, reply.toCol, color);
                        const supportingAttackers = getAttackerValues(replyBoard, reply.toRow, reply.toCol, opponent);
                        if (recapturers.length > 0) {
                            captureThreat -= Math.round(Math.min(
                                replyPieceValue * 0.82,
                                pieceValue(targetType, stage) * 0.68
                            ));
                            if (recapturers.length >= supportingAttackers.length) {
                                captureThreat -= stageWeight(stage, 12, 36, 14);
                            }
                        }

                        strongestCapture = Math.max(strongestCapture, Math.max(0, captureThreat));
                    }
                }

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
                    return {
                        checkPenalty: MATE_SCORE * 0.75,
                        capturePenalty: Math.round(strongestCapture)
                    };
                }

                checks++;
                let checkThreat = stageWeight(stage, 14, 12, 8);
                if (reply.piece[1] === 'R') {
                    checkThreat += stageWeight(stage, 32, 28, 16);
                } else if (reply.piece[1] === 'C') {
                    checkThreat += stageWeight(stage, 30, 26, 14);
                } else if (reply.piece[1] === 'H') {
                    checkThreat += stageWeight(stage, 22, 20, 12);
                } else if (reply.piece[1] === 'S') {
                    checkThreat += stageWeight(stage, 10, 12, 10);
                }
                if (reply.captured) {
                    checkThreat += Math.round(pieceValue(reply.captured[1], stage) * 0.12);
                }
                if (escapeMoves.length === 1) {
                    checkThreat += stageWeight(stage, 40, 190, 72);
                } else if (escapeMoves.length === 2) {
                    checkThreat += stageWeight(stage, 18, 88, 34);
                } else if (escapeMoves.length === 3) {
                    checkThreat += stageWeight(stage, 8, 32, 14);
                }
                strongestCheck = Math.max(strongestCheck, checkThreat);

                if (checks >= 4) {
                    break;
                }
            }

            return {
                checkPenalty: checks === 0
                    ? 0
                    : Math.round(strongestCheck + stageWeight(stage, 16, 12, 6) * Math.max(0, checks - 1)),
                capturePenalty: Math.round(strongestCapture)
            };
        }

        function getRootContinuationBias(board, nextBoard, move, color, history, stage) {
            if (stage.opening < 0.16 && stage.middlegame < 0.28) {
                return 0;
            }

            let score = 0;
            const opponent = otherColor(color);
            if (!move.captured) {
                const homeRookExposures = getHomeRookCannonExposures(board, color);
                const nextHomeRookExposures = getHomeRookCannonExposures(nextBoard, color);
                score += (evaluateDevelopment(nextBoard, color, stage) - evaluateDevelopment(board, color, stage)) * 0.55;
                score += (evaluateRookPressure(nextBoard, color, stage) - evaluateRookPressure(board, color, stage)) * 0.75;
                score += (evaluateInitiative(nextBoard, color, stage) - evaluateInitiative(board, color, stage)) * 0.65;
                score += (evaluateKingSafety(nextBoard, color, stage) - evaluateKingSafety(board, color, stage)) * 0.2;
                score += (evaluateExchangeSafety(nextBoard, color, stage) - evaluateExchangeSafety(board, color, stage)) * 1.05;
                score += (evaluateHomeRookCannonExposure(nextBoard, color, stage) - evaluateHomeRookCannonExposure(board, color, stage)) * 1.15;

                if (homeRookExposures.length > nextHomeRookExposures.length) {
                    const relievedByMovingScreen = homeRookExposures.some(exposure =>
                        exposure.screenRow === move.fromRow &&
                        exposure.screenCol === move.fromCol &&
                        exposure.screenPiece === move.piece
                    );
                    const preservedOwnCannonScreen = homeRookExposures.some(exposure =>
                        exposure.screenPiece === `${color}C` &&
                        nextBoard[exposure.screenRow][exposure.screenCol] === exposure.screenPiece &&
                        nextBoard[exposure.rookRow][exposure.rookCol] === `${color}R`
                    );

                    if (relievedByMovingScreen && move.piece[1] === 'C') {
                        score += stageWeight(stage, 118, 74, 16);
                    } else if (move.piece[1] === 'R' && preservedOwnCannonScreen) {
                        score -= stageWeight(stage, 44, 26, 6);
                    }
                }
            }
            if (move.piece[1] === 'R' && countUndevelopedRooks(nextBoard, color) < countUndevelopedRooks(board, color)) {
                score += move.toRow === move.fromRow
                    ? stageWeight(stage, 20, 12, 4)
                    : stageWeight(stage, 6, 6, 2);
            }
            if (move.piece[1] === 'R' && !move.captured && move.toRow === move.fromRow) {
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                if (centerGain > 0) {
                    score += centerGain * stageWeight(stage, 8, 32, 10);
                }
            }
            if (move.piece[1] === 'H' && countUndevelopedHorses(nextBoard, color) < countUndevelopedHorses(board, color)) {
                score += stageWeight(stage, 12, 8, 4);
            } else if (move.piece[1] === 'H' && !move.captured) {
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                if (centerGain > 0) {
                    score += centerGain * stageWeight(stage, 8, 14, 10);
                }
            }
            if (move.piece[1] === 'H' && !move.captured && move.fromRow === homeRow(color) && move.toRow !== move.fromRow) {
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                score += stageWeight(stage, 8, 28, 10);
                if (centerGain > 0) {
                    score += centerGain * stageWeight(stage, 4, 14, 6);
                }
            }
            const looseHorsesBefore = countLooseHorses(board, color, stage);
            const looseHorsesAfter = countLooseHorses(nextBoard, color, stage);
            if (looseHorsesAfter < looseHorsesBefore) {
                score += (looseHorsesBefore - looseHorsesAfter) * stageWeight(stage, 0, 58, 28);
            } else if (looseHorsesBefore > 0 && !move.captured) {
                if (move.piece[1] === 'S') {
                    score -= looseHorsesBefore * stageWeight(stage, 0, 48, 20);
                } else if (move.piece[1] === 'A' || move.piece[1] === 'E') {
                    score -= looseHorsesBefore * stageWeight(stage, 0, 34, 16);
                }
            }
            const looseCannonsBefore = countLooseCannons(board, color, stage);
            const looseCannonsAfter = countLooseCannons(nextBoard, color, stage);
            if (looseCannonsAfter < looseCannonsBefore) {
                score += (looseCannonsBefore - looseCannonsAfter) * stageWeight(stage, 0, 94, 38);
            } else if (looseCannonsBefore > 0 && move.piece[1] !== 'C' && !move.captured) {
                if (move.piece[1] === 'S') {
                    score -= looseCannonsBefore * stageWeight(stage, 0, 42, 16);
                } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                    score -= looseCannonsBefore * stageWeight(stage, 0, 28, 12);
                }
            }
            if (move.piece[1] === 'R' && move.fromRow !== homeRow(color) && !move.captured) {
                const wasAttacked = isSquareAttacked(board, move.fromRow, move.fromCol, opponent);
                const nowAttacked = isSquareAttacked(nextBoard, move.toRow, move.toCol, opponent);
                if (wasAttacked && !nowAttacked) {
                    score += stageWeight(stage, 0, 46, 24);
                    const retreating = color === RED_COLOR ? move.toRow > move.fromRow : move.toRow < move.fromRow;
                    if (retreating) {
                        score += stageWeight(stage, 0, 64, 34);
                    }
                    if (Math.abs(move.fromRow - homeRow(color)) >= 2) {
                        score += stageWeight(stage, 0, 24, 14);
                    }
                } else if (wasAttacked && nowAttacked) {
                    score -= stageWeight(stage, 0, 54, 28);
                }
            }
            if (move.piece[1] === 'C' &&
                !move.captured &&
                move.fromRow !== cannonRow(color) &&
                move.toRow === move.fromRow) {
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                if (centerGain > 0) {
                    score += centerGain * stageWeight(stage, 8, 28, 8);
                } else if (centerGain < 0) {
                    score += centerGain * stageWeight(stage, 6, 18, 6);
                }
                const fromAttackers = getAttackerValues(board, move.fromRow, move.fromCol, opponent);
                const toAttackers = getAttackerValues(nextBoard, move.toRow, move.toCol, opponent);
                if (fromAttackers.length > 0 && (toAttackers.length === 0 || toAttackers.length < fromAttackers.length)) {
                    score += stageWeight(stage, 0, 30, 10);
                }
            }
            if (move.piece[1] === 'C' && !move.captured) {
                const fromAttackers = getAttackerValues(board, move.fromRow, move.fromCol, opponent);
                const toAttackers = getAttackerValues(nextBoard, move.toRow, move.toCol, opponent);
                if (move.fromRow !== cannonRow(color) &&
                    fromAttackers.length > 0 &&
                    (toAttackers.length === 0 || toAttackers.length < fromAttackers.length)) {
                    const homeDistanceBefore = Math.abs(homeRow(color) - move.fromRow);
                    const homeDistanceAfter = Math.abs(homeRow(color) - move.toRow);
                    if (homeDistanceAfter < homeDistanceBefore) {
                        score += stageWeight(stage, 22, 94, 28);
                        if (move.toRow === homeRow(color)) {
                            score += stageWeight(stage, 18, 122, 34);
                        }
                    }
                }
            }
            if (move.piece[1] === 'C' && !move.captured && move.toCol === 4 && move.toRow === move.fromRow) {
                score += stageWeight(stage, 0, 12, 4);
            }
            if (move.piece[1] === 'S' && !move.captured && move.fromRow === move.toRow && hasCrossedRiver(color, move.fromRow)) {
                if ((move.toCol > 0 && nextBoard[move.toRow][move.toCol - 1] === `${color}S`) ||
                    (move.toCol < 8 && nextBoard[move.toRow][move.toCol + 1] === `${color}S`)) {
                    score += stageWeight(stage, 0, 4, 12);
                }
            }
            return Math.round(score);
        }

        function getRootReplyProbePenalty(nextBoard, move, color, history, positionHistory, searchConfig) {
            if (searchConfig.time < 2200) {
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

            if (opponentMoves.length === 0) {
                return 0;
            }

            const ownStatic = evaluateBoardForColor(nextBoard, color, nextHistory);
            const replyLimit = searchConfig.phase === 'opening'
                ? (searchConfig.time >= 3600 ? 10 : 8)
                : (searchConfig.time >= 3600 ? 12 : 9);
            const orderedReplies = orderMoves(
                nextBoard,
                opponentMoves,
                searchConfig.stage,
                null,
                replyLimit,
                null,
                1
            );

            let worstScore = ownStatic;
            for (const reply of orderedReplies) {
                const replyBoard = applyMoveToBoard(nextBoard, reply);
                const replyScore = evaluateBoardForColor(replyBoard, color, nextHistory.concat(getMoveKey(reply)));
                if (replyScore < worstScore) {
                    worstScore = replyScore;
                }
            }

            const delta = ownStatic - worstScore;
            if (delta <= 0) {
                return 0;
            }

            const weight = searchConfig.phase === 'opening'
                ? (searchConfig.time >= 3600 ? 0.42 : 0.32)
                : searchConfig.phase === 'middlegame'
                    ? (searchConfig.time >= 3600 ? 0.3 : 0.24)
                    : 0.18;
            return Math.round(delta * weight);
        }

        function getTimedOutRootSanityScore(entry, board, color, history, positionHistory, searchConfig) {
            const recentOwnMoves = getSideHistoryMoves(history, color);
            const lastOwnMove = recentOwnMoves[recentOwnMoves.length - 1] || null;
            const previousOwnMove = recentOwnMoves.length > 1 ? recentOwnMoves[recentOwnMoves.length - 2] : null;
            const delayedReversePenalty = isDelayedQuietCannonReverse(
                entry.move,
                previousOwnMove,
                color
            )
                ? stageWeight(searchConfig.stage, 96, 168, 42)
                : 0;
            const repeatedQuietCannonPenalty = isRepeatedQuietCannonShuffle(
                entry.move,
                lastOwnMove,
                previousOwnMove,
                color
            )
                ? stageWeight(searchConfig.stage, 0, 188, 48)
                : 0;
            const replyProbePenalty = getRootReplyProbePenalty(
                entry.nextBoard,
                entry.move,
                color,
                history,
                positionHistory,
                searchConfig
            );
            const replyThreats = getOpponentReplyThreats(
                entry.nextBoard,
                entry.move,
                color,
                searchConfig.stage,
                history,
                positionHistory
            );
            let practicalAdjustment = 0;

            if (!entry.move.captured && entry.move.piece[1] === 'R') {
                const rookPressureDelta = evaluateRookPressure(entry.nextBoard, color, searchConfig.stage) - evaluateRookPressure(board, color, searchConfig.stage);
                const initiativeDelta = evaluateInitiative(entry.nextBoard, color, searchConfig.stage) - evaluateInitiative(board, color, searchConfig.stage);
                practicalAdjustment += Math.max(0, Math.round(rookPressureDelta * 0.6 + initiativeDelta * 0.35));
            }

            if (!entry.move.captured && (entry.move.piece[1] === 'A' || entry.move.piece[1] === 'E')) {
                const safetyDelta = evaluateKingSafety(entry.nextBoard, color, searchConfig.stage) - evaluateKingSafety(board, color, searchConfig.stage);
                if (safetyDelta <= 0) {
                    practicalAdjustment -= stageWeight(searchConfig.stage, 0, 96, 28);
                }
            }

            if (!entry.move.captured && entry.move.piece[1] === 'C') {
                const alreadyAdvanced = entry.move.fromRow !== cannonRow(color);
                const sideways = entry.move.toRow === entry.move.fromRow;
                const forward = color === RED_COLOR ? entry.move.toRow < entry.move.fromRow : entry.move.toRow > entry.move.fromRow;
                if (alreadyAdvanced && sideways && !isInCheck(entry.nextBoard, otherColor(color))) {
                    practicalAdjustment -= stageWeight(searchConfig.stage, 0, 152, 36);
                    if (Math.abs(entry.move.toCol - 4) >= Math.abs(entry.move.fromCol - 4)) {
                        practicalAdjustment -= stageWeight(searchConfig.stage, 0, 86, 22);
                    }
                } else if (alreadyAdvanced && forward) {
                    practicalAdjustment -= stageWeight(searchConfig.stage, 0, 72, 18);
                }
            }

            return entry.sortScore
                + practicalAdjustment
                - replyProbePenalty
                - Math.round(replyThreats.checkPenalty * 0.9)
                - Math.round(replyThreats.capturePenalty * 1.05)
                - delayedReversePenalty
                - repeatedQuietCannonPenalty;
        }

        function buildRootEntries(board, color, history, positionHistory, searchConfig, legalMoves) {
            const suggestions = getOpeningSuggestionMap(board, color, history, legalMoves);
            const sameSideMoves = getSideHistoryMoves(history, color);
            const urgentHomeRookRepairs = getUrgentHomeRookScreenRepairMoves(board, color, legalMoves);
            const urgentLooseHorseReliefs = getLooseHorseReliefMoves(board, color, searchConfig.stage, legalMoves);
            const urgentLooseCannonReliefs = getLooseCannonReliefMoves(board, color, searchConfig.stage, legalMoves);
            const urgentBackRankHorseReliefs = getBackRankHorseReliefMoves(board, color, legalMoves);
            const openingContext = {
                undevelopedMajors: countUndevelopedMajors(board, color),
                undevelopedRooks: countUndevelopedRooks(board, color),
                undevelopedHorses: countUndevelopedHorses(board, color),
                undevelopedElephants: countUndevelopedElephants(board, color),
                undevelopedAdvisors: countUndevelopedAdvisors(board, color),
                developedHorses: countDevelopedHorses(board, color),
                opponentDevelopedHorses: countDevelopedHorses(board, otherColor(color)),
                rookMovesAvailable: countUndevelopedRooks(board, color) >= 1 && hasHomeRookDevelopment(board, color),
                horizontalRookMovesAvailable: hasHomeHorizontalRookDevelopment(board, color),
                ownCenteredCannon: hasCenteredCannon(board, color),
                opponentCenteredCannon: hasCenteredCannon(board, otherColor(color)),
                homeRookCannonExposures: getHomeRookCannonExposures(board, color),
                lastOwnMove: sameSideMoves[sameSideMoves.length - 1] || null,
                previousOwnMove: sameSideMoves.length > 1 ? sameSideMoves[sameSideMoves.length - 2] : null
            };
            const openingPlanMode = searchConfig.phase === 'opening'
                ? getOpeningPlanMode(openingContext)
                : 'balanced';
            const quickEntries = legalMoves.map(move => {
                const nextBoard = applyMoveToBoard(board, move);
                const moveKey = getMoveKey(move);
                const bookBias = suggestions.get(moveKey) || 0;
                const practicalBias = getPracticalOpeningBias(board, nextBoard, move, color, history, openingContext);
                const tacticalBias = getTacticalBias(board, nextBoard, move, color, history);
                const safetyPenalty = getImmediateRiskPenalty(board, nextBoard, move, color, searchConfig.stage);
                const reviewedBias = getReviewedPositionBias(board, color, move, history);
                const focusMove = isOpeningFocusMove(board, nextBoard, move, color, history, openingContext);
                const centerGain = Math.abs(4 - move.fromCol) - Math.abs(4 - move.toCol);
                const rookCenterBias = !move.captured &&
                    move.piece[1] === 'R' &&
                    move.toRow === move.fromRow &&
                    centerGain > 0
                    ? Math.round(centerGain * stageWeight(searchConfig.stage, 10, 34, 12))
                    : 0;
                const cannonCenterBias = !move.captured &&
                    move.piece[1] === 'C' &&
                    move.fromRow !== cannonRow(color) &&
                    move.toRow === move.fromRow
                    ? Math.round(centerGain * stageWeight(searchConfig.stage, 8, 28, 8))
                    : 0;
                let looseHorseBias = 0;
                if (urgentLooseHorseReliefs.size > 0) {
                    if (urgentLooseHorseReliefs.has(moveKey)) {
                        looseHorseBias += stageWeight(searchConfig.stage, 0, 138, 64);
                    } else if (!move.captured) {
                        if (move.piece[1] === 'S') {
                            looseHorseBias -= stageWeight(searchConfig.stage, 0, 124, 48);
                        } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                            looseHorseBias -= stageWeight(searchConfig.stage, 0, 96, 38);
                        } else if (move.piece[1] === 'C') {
                            looseHorseBias -= stageWeight(searchConfig.stage, 0, 54, 20);
                        } else if (move.piece[1] === 'R' &&
                            !isSquareAttacked(board, move.fromRow, move.fromCol, otherColor(color))) {
                            looseHorseBias -= stageWeight(searchConfig.stage, 0, 28, 12);
                        }
                    }
                }
                let looseCannonBias = 0;
                if (urgentLooseCannonReliefs.size > 0) {
                    if (urgentLooseCannonReliefs.has(moveKey)) {
                        looseCannonBias += stageWeight(searchConfig.stage, 0, 232, 86);
                        if (move.piece[1] === 'C' && move.fromRow !== cannonRow(color)) {
                            const homeDistanceBefore = Math.abs(homeRow(color) - move.fromRow);
                            const homeDistanceAfter = Math.abs(homeRow(color) - move.toRow);
                            if (homeDistanceAfter < homeDistanceBefore) {
                                looseCannonBias += stageWeight(searchConfig.stage, 0, 128, 44);
                            } else if (homeDistanceAfter > homeDistanceBefore) {
                                looseCannonBias -= stageWeight(searchConfig.stage, 0, 164, 56);
                            }
                        }
                    } else if (!move.captured) {
                        if (move.piece[1] === 'S') {
                            looseCannonBias -= stageWeight(searchConfig.stage, 0, 112, 40);
                        } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                            looseCannonBias -= stageWeight(searchConfig.stage, 0, 88, 30);
                        } else if (move.piece[1] === 'R') {
                            looseCannonBias -= stageWeight(searchConfig.stage, 0, 42, 16);
                        } else if (move.piece[1] === 'C') {
                            looseCannonBias -= stageWeight(searchConfig.stage, 0, 44, 16);
                            if (move.fromCol === move.toCol && Math.abs(move.toRow - move.fromRow) >= 2) {
                                looseCannonBias -= stageWeight(searchConfig.stage, 0, 196, 72);
                            }
                            if ((move.fromCol === 0 || move.fromCol === 8) && move.toCol === move.fromCol) {
                                looseCannonBias -= stageWeight(searchConfig.stage, 0, 126, 46);
                            }
                        }
                    }
                }
                let backRankHorseBias = 0;
                if (urgentBackRankHorseReliefs.size > 0) {
                    if (urgentBackRankHorseReliefs.has(moveKey)) {
                        backRankHorseBias += stageWeight(searchConfig.stage, 16, 148, 52);
                    } else if (!move.captured) {
                        if (move.piece[1] === 'S') {
                            backRankHorseBias -= stageWeight(searchConfig.stage, 0, 58, 22);
                        } else if (move.piece[1] === 'A' || move.piece[1] === 'E' || move.piece[1] === 'G') {
                            backRankHorseBias -= stageWeight(searchConfig.stage, 0, 44, 16);
                        } else if (move.piece[1] === 'C') {
                            const beforeMajorPressure = countThreatenedEnemyMajors(board, color);
                            const afterMajorPressure = countThreatenedEnemyMajors(nextBoard, color);
                            if (afterMajorPressure <= beforeMajorPressure) {
                                backRankHorseBias -= stageWeight(searchConfig.stage, 0, 42, 16);
                                if (move.toRow === move.fromRow) {
                                    backRankHorseBias -= stageWeight(searchConfig.stage, 0, 54, 20);
                                }
                            }
                        } else if (move.piece[1] === 'R') {
                            backRankHorseBias -= stageWeight(searchConfig.stage, 0, 34, 12);
                        }
                    }
                }
                const quietCenter = move.captured ? 0 : Math.max(0, 4 - Math.abs(4 - move.toCol)) * 3;
                const openingFocusBias = searchConfig.phase === 'opening' && !move.captured
                    ? focusMove
                        ? 28
                        : openingContext.undevelopedMajors >= 2
                            ? -112
                            : -54
                    : 0;
                return {
                    move,
                    nextBoard,
                    reviewedBias,
                    tacticalBias,
                    safetyPenalty,
                    quickScore: bookBias + practicalBias + reviewedBias + openingFocusBias + looseHorseBias + looseCannonBias + backRankHorseBias + quietCenter + rookCenterBias + cannonCenterBias + Math.round(tacticalBias * 0.9) - Math.round(safetyPenalty * 0.45),
                    policyBias: bookBias + practicalBias + reviewedBias + Math.round(openingFocusBias * 0.85) + Math.round(looseHorseBias * 0.85) + Math.round(looseCannonBias * 0.82) + Math.round(backRankHorseBias * 0.82) + Math.round(rookCenterBias * 0.8) + Math.round(cannonCenterBias * 0.85) + Math.round(tacticalBias * 0.55) - Math.round(safetyPenalty * 0.3)
                };
            }).sort((left, right) => right.quickScore - left.quickScore);

            const shortlistSource = urgentHomeRookRepairs.size > 0
                ? quickEntries.filter(entry => urgentHomeRookRepairs.has(getMoveKey(entry.move)))
                : quickEntries;
            const shortlistLimit = Math.min(shortlistSource.length, Math.max(searchConfig.rootLimit * 2, 12));
            const shortlist = shortlistSource.slice(0, shortlistLimit);
            const entries = shortlist.map(entry => {
                const nextBoard = entry.nextBoard;
                const continuationBias = getRootContinuationBias(board, nextBoard, entry.move, color, history, searchConfig.stage);
                const homeRookReliefBias = getHomeRookCannonReliefBias(board, nextBoard, entry.move, color, searchConfig.stage);
                const defensiveRepairBias = getDefensiveRepairBias(board, nextBoard, entry.move, color, searchConfig.stage);
                let captureBias = entry.move.captured
                    ? Math.round(pieceValue(entry.move.captured[1], searchConfig.stage) * 0.22 - pieceValue(entry.move.piece[1], searchConfig.stage) * 0.05)
                    : 0;
                if (entry.move.piece[1] === 'R' &&
                    entry.move.captured &&
                    entry.move.captured[1] === 'S' &&
                    entry.move.fromRow !== homeRow(color) &&
                    !isSquareAttacked(nextBoard, entry.move.toRow, entry.move.toCol, otherColor(color))) {
                    captureBias += Math.round(stageWeight(searchConfig.stage, 12, 36, 14));
                }
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
                const deepRookRaidPenalty = getDeepRookRaidPenalty(board, nextBoard, entry.move, color, searchConfig.stage);
                const replyThreats = getOpponentReplyThreats(nextBoard, entry.move, color, searchConfig.stage, history, positionHistory);
                const checkThreatPenalty = replyThreats.checkPenalty;
                const captureThreatPenalty = replyThreats.capturePenalty;
                const passivityPenalty = getRootPassivityPenalty(board, nextBoard, entry.move, color, searchConfig.stage, openingContext);
                const tacticalBias = entry.tacticalBias;
                return {
                    move: entry.move,
                    nextBoard,
                    reviewedBias: entry.reviewedBias,
                    sortScore: entry.quickScore + continuationBias + homeRookReliefBias + defensiveRepairBias + captureBias + checkBias + Math.round(tacticalBias * 0.35) - Math.round(safetyPenalty * 0.55) - tradePenalty - deepRookRaidPenalty - checkThreatPenalty - captureThreatPenalty - passivityPenalty,
                    policyBias: entry.policyBias + Math.round(continuationBias * 0.6) + Math.round(homeRookReliefBias * 0.92) + Math.round(defensiveRepairBias * 0.8) + captureBias + Math.round(checkBias * 0.7) + Math.round(tacticalBias * 0.25) - Math.round(safetyPenalty * 0.35) - tradePenalty - Math.round(deepRookRaidPenalty * 0.82) - Math.round(checkThreatPenalty * 0.85) - Math.round(captureThreatPenalty * 0.92) - Math.round(passivityPenalty * 0.9),
                    debug: {
                        quickScore: entry.quickScore,
                        continuationBias,
                        homeRookReliefBias,
                        defensiveRepairBias,
                        captureBias,
                        checkBias,
                        safetyPenalty,
                        tradePenalty,
                        deepRookRaidPenalty,
                        checkThreatPenalty,
                        captureThreatPenalty,
                        passivityPenalty,
                        tacticalBias
                    }
                };
            }).sort((left, right) => right.sortScore - left.sortScore);

            if (searchConfig.time >= 2200 && entries.length >= 2) {
                const probeCount = Math.min(
                    entries.length,
                    searchConfig.phase === 'opening'
                        ? (searchConfig.time >= 3600 ? 6 : 4)
                        : (searchConfig.time >= 3600 ? 8 : 5)
                );

                for (let index = 0; index < probeCount; index++) {
                    const entry = entries[index];
                    const replyProbePenalty = getRootReplyProbePenalty(
                        entry.nextBoard,
                        entry.move,
                        color,
                        history,
                        positionHistory,
                        searchConfig
                    );
                    if (replyProbePenalty > 0) {
                        entry.sortScore -= replyProbePenalty;
                        entry.policyBias -= Math.round(replyProbePenalty * 0.72);
                        if (entry.debug) {
                            entry.debug.replyProbePenalty = replyProbePenalty;
                        }
                    }
                }

                entries.sort((left, right) => right.sortScore - left.sortScore);
            }

            if (urgentHomeRookRepairs.size > 0) {
                const repairEntries = entries.filter(entry => urgentHomeRookRepairs.has(getMoveKey(entry.move)));
                if (repairEntries.length > 0) {
                    return repairEntries.slice(0, Math.min(searchConfig.rootLimit, repairEntries.length));
                }
            }

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
            let policyWeight = searchConfig.phase === 'opening' ? 1.9 : searchConfig.phase === 'middlegame' ? 1.15 : 1;
            if (searchConfig.time >= 2200) {
                policyWeight *= searchConfig.phase === 'opening' ? 0.7 : 0.82;
            }
            if (searchConfig.time >= 3600) {
                policyWeight *= searchConfig.phase === 'opening' ? 0.78 : 0.88;
            }
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
                const verifyCount = Math.min(
                    searchConfig.phase === 'middlegame'
                        ? (searchConfig.time >= 2200 ? 6 : 5)
                        : 4,
                    orderedRootEntries.length
                );
                const verifyDepth = Math.min(searchConfig.maxDepth, completedDepth + 1);
                let verifyBestMove = bestMove;
                let verifyBestScore = bestScore;
                let verifyBestPv = bestPv;
                let verifyPolicyWeight = searchConfig.phase === 'endgame'
                    ? 0.55
                    : searchConfig.phase === 'middlegame'
                        ? 0.25
                        : 0.35;
                if (searchConfig.time >= 2200) {
                    verifyPolicyWeight *= 0.8;
                }
                if (searchConfig.time >= 3600) {
                    verifyPolicyWeight *= 0.85;
                }

                for (let index = 0; index < verifyCount; index++) {
                    const entry = orderedRootEntries[index];
                    const result = negamax(entry.nextBoard, otherColor(color), verifyDepth - 1, -Infinity, Infinity, context, history.concat(getMoveKey(entry.move)), 1);
                    const score = -result.score + entry.policyBias * (policyWeight * verifyPolicyWeight);
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

            if (context.timedOut && searchConfig.time >= 2200 && orderedRootEntries.length >= 2) {
                const playoffCount = Math.min(searchConfig.time >= 3600 ? 5 : 4, orderedRootEntries.length);
                let playoffBestMove = bestMove;
                let playoffBestScore = -Infinity;

                for (let index = 0; index < playoffCount; index++) {
                    const entry = orderedRootEntries[index];
                    const sanityScore = getTimedOutRootSanityScore(
                        entry,
                        board,
                        color,
                        history,
                        positionHistory,
                        searchConfig
                    );

                    if (sameMove(entry.move, bestMove)) {
                        bestScore = Math.max(bestScore, sanityScore);
                    }

                    if (sanityScore > playoffBestScore) {
                        playoffBestScore = sanityScore;
                        playoffBestMove = entry.move;
                    }
                }

                if (playoffBestScore > bestScore + 48) {
                    bestMove = playoffBestMove;
                    bestScore = playoffBestScore;
                    bestPv = [playoffBestMove];
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

        function debugRootEntries(options) {
            const board = cloneBoard(options.board);
            const color = options.currentPlayer;
            const history = cloneMoveSequence(options.history || []);
            const positionHistory = clonePositionHistory(options.positionHistory || []);
            const legalMoves = filterPlayableMoves(board, color, getAllLegalMoves(board, color), positionHistory, history);
            const searchConfig = getPhaseConfig(board, history, options.timeBudgetMs);
            return buildRootEntries(board, color, history, positionHistory, searchConfig, legalMoves).map(entry => ({
                move: entry.move,
                sortScore: entry.sortScore,
                policyBias: entry.policyBias,
                debug: entry.debug || null
            }));
        }

        function debugPhaseConfig(options) {
            const board = cloneBoard(options.board);
            const history = cloneMoveSequence(options.history || []);
            return getPhaseConfig(board, history, options.timeBudgetMs);
        }

        return {
            computeBestMove,
            evaluateBoardForColor,
            pickFallbackMove,
            debugRootEntries,
            debugPhaseConfig
        };
    }

    return {
        createXiangqiEngineCore
    };
}));
