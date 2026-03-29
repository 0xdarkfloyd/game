const assert = require('assert');
const game = require('../game.js');

const engine = game.ensureEngineCore();

function createState() {
    const board = game.cloneBoard(game.initialBoard);
    return {
        board,
        side: game.RED_COLOR,
        history: [],
        positionHistory: [game.getBoardKey(board, game.RED_COLOR)]
    };
}

function applyMoveKey(state, key) {
    const legal = game.filterPlayableMoves(
        state.board,
        state.side,
        game.getAllLegalMoves(state.board, state.side),
        state.positionHistory,
        state.history
    );
    const move = legal.find(candidate => game.getMoveKey(candidate) === key);
    assert(move, `move not found: ${key}`);

    state.board = game.applyMoveToBoard(state.board, move);
    state.history.push(key);
    state.side = game.otherColor(state.side);
    state.positionHistory.push(game.getBoardKey(state.board, state.side));
    return move;
}

function playSequence(sequence) {
    const state = createState();
    sequence.forEach(key => applyMoveKey(state, key));
    return state;
}

function applyMoveNotation(state, notation) {
    const legal = game.filterPlayableMoves(
        state.board,
        state.side,
        game.getAllLegalMoves(state.board, state.side),
        state.positionHistory,
        state.history
    );
    const move = legal.find(candidate => game.formatMoveNotation(state.board, candidate) === notation);
    assert(move, `notation not found: ${notation}`);

    state.board = game.applyMoveToBoard(state.board, move);
    state.history.push(game.getMoveKey(move));
    state.side = game.otherColor(state.side);
    state.positionHistory.push(game.getBoardKey(state.board, state.side));
    return move;
}

function playNotationSequence(sequence) {
    const state = createState();
    sequence.forEach(notation => applyMoveNotation(state, notation));
    return state;
}

function compute(state, timeBudgetMs = 900) {
    const startedAt = Date.now();
    const result = engine.computeBestMove({
        board: state.board,
        currentPlayer: state.side,
        history: state.history,
        positionHistory: state.positionHistory,
        timeBudgetMs
    });

    return {
        ...result,
        elapsed: Date.now() - startedAt
    };
}

function assertOneOfMoveKeys(result, expectedKeys, message) {
    assert(result.move, 'expected a move');
    assert(
        expectedKeys.includes(game.getMoveKey(result.move)),
        message || `expected one of ${expectedKeys.join(', ')}, got ${game.getMoveKey(result.move)}`
    );
}

function createEmptyBoard() {
    return Array.from({ length: 10 }, () => Array(9).fill(''));
}

function computeOnBoard(board, side = game.BLACK_COLOR, timeBudgetMs = 700) {
    return engine.computeBestMove({
        board,
        currentPlayer: side,
        history: [],
        positionHistory: [game.getBoardKey(board, side)],
        timeBudgetMs
    });
}

function assertActiveMajorReply(result, message) {
    assert(result.move, 'expected a move');
    assert(
        result.move.captured || result.move.piece === 'bR',
        message || `expected active rook move or tactical capture, got ${game.getMoveKey(result.move)}`
    );
    assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad passive reply: ${result.move.piece}`);
}

function assertActiveDevelopmentReply(result, message) {
    assert(result.move, 'expected a move');
    assert(
        result.move.captured || result.move.piece === 'bR' || result.move.piece === 'bH',
        message || `expected active rook/horse move or tactical capture, got ${game.getMoveKey(result.move)}`
    );
    assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad passive reply: ${result.move.piece}`);
}

const reviewedAdvancedLine = [
    '兵七進一','馬2進3','傌八進七','馬8進7','炮二平三','車9平8','俥九進一','車1進1','相三進五','砲8進5',
    '兵三進一','士4進5','俥九平四','馬3退4','俥四進四','象7進5','傌七進六','車1平3','炮八平七','砲2進7',
    '俥四平八','砲2平1','傌二進四','車8進6','俥八退五','砲1退1','兵七進一','象5進3','傌六進四','車8平6',
    '炮三平四','車6退2','傌四進二','車6平5','俥一進一','車5進2','兵三進一','卒7進1','俥一平三','車5平1',
    '俥三進四','馬7退8','俥三進一','馬4進5','俥三平四','車1平9','傌二進三','車9平4','俥八進一','砲1退3',
    '炮四平二','砲1平5','仕六進五','車4平7','傌三進二','馬8進7','俥四退二','砲5退1','傌二退三','馬7進8',
    '俥四平六','卒1進1','帥五平六','砲5平6','俥八進五','卒9進1','炮二平三','卒9進1','俥八退二','車3平1',
    '傌三進二','砲6退1','俥六進一','馬8進9','炮三平四','車7平8','傌二退三','砲6進3','俥八進五','馬9進8',
    '俥八平七','士5退4','炮七進四','車8平7','傌三進四','士6進5','炮七平八','馬8退6','炮八進三','將5平6',
    '俥七退一','將6進1','俥七平九','馬6進8','俥六平七','將6進1','俥七平二','馬8退9','俥二進一','砲6退2',
    '俥二進一','將6退1','俥二退二','車7平4','帥六平五','砲6進1','俥九退二','馬5進7','俥九平五','車4平1',
    '炮八平九','車1平7','俥五退二','卒1進1','炮九平八','卒9平8','俥二進一','卒8進1','炮八退三','卒1進1',
    '炮八進二','士5進6','傌四進六','馬7退5','俥五進三','砲6退1','俥五退一','將6退1','俥五進三'
];

const reviewedCounterattackLine = [
    '兵三進一','馬2進3','相三進五','馬8進7','傌二進三','車9進1','炮八平六','車1平2','兵七進一','車9平4',
    '炮六平八','砲2平1','炮八平七','車4進5','仕四進五','車2進3','炮二進一','車4退1','炮二平三','士6進5',
    '炮七進一','砲1平2','俥一平二','砲8平9','俥二進七','車4退3','兵九進一','馬7退6','俥二進二','車4平7',
    '傌八進九','砲9退1','兵九進一','卒1進1','兵三進一','車7平4','俥二平三','車4進2','俥三退一','砲9退1',
    '俥三退二','砲2平1','炮三平二','車4平5','兵七進一','馬6進8','俥三進三','士5退6','兵七平六','車5平4',
    '俥九進一','砲9進1','俥三平二','馬8進6','兵三進一','馬3退5','俥二平一','砲9平7','兵三平四','馬6退8',
    '兵四進一','車4平6','傌三進二','車6退2','俥一平二','砲7進7','炮七退二','砲7平3','俥二退一','砲3退4',
    '俥二平三','車6平4','俥三平四','砲1退1','俥四退五','馬5進7','俥九平七','士6進5','俥四進三','砲1平3',
    '傌二進一','馬7進8','俥四平五','車4平2','炮二進一','卒1進1','傌一退三','後車平1','炮二平五','馬8進7',
    '炮五進一','前砲平7','俥五平七','車1平5','前俥平八','砲7退3','俥七進四','卒1進1','俥八平二','卒1進1',
    '俥二進三','砲7退1','俥二平三'
];

const reviewedRookPressureLine = [
    '傌二進三','馬8進7','炮二平一','馬2進3','兵七進一','車9平8','俥一平二','象7進9','俥二進四','車8進1',
    '相七進五','卒7進1','傌八進九','砲2平1','炮一平二','砲1進4','傌九退八','砲1平7','傌八進七','砲8進2',
    '俥九平八','車8退1','俥二平五','砲8平9','炮二平一','砲9平8','傌七進六','卒5進1','俥五平四','車8進3',
    '炮八平七','士6進5','俥八進六','車8平7','俥四平二','砲8退1','兵七進一','卒7進1','相五進三','砲7進3',
    '仕四進五','馬3退1','俥八進一','卒3進1','傌三進四','車7平4','炮一平三','車4進2','俥二進二','馬7進6',
    '俥二退五','砲7退4','炮三平五','車4平6','炮五進三','象3進5','俥二進六','車6平3','炮七平三','車3進2',
    '炮三平四','車3退1','俥二平四','馬6進8','俥八平五','象9退7','俥四進一','車3平5','俥五進一'
];

const reviewedWingRaidLine = [
    '傌二進三','馬8進7','兵三進一','馬2進3','相三進五','車9進1','傌八進七','車9平5','傌三進四','車1進1',
    '炮二平四','卒3進1','炮八進四','馬3進2','俥一平二','車1平4','俥二進五','車4平3','炮八平三','象7進9',
    '仕六進五','馬2進3','俥九平八','卒3進1','俥八進三','卒3平4','兵一進一','卒5進1','俥二進一','卒5進1',
    '炮三平七','馬3退4','傌四退三','卒5進1','傌七進五','車5進4','兵三進一','士4進5','傌五進三','砲2平5',
    '帥五平六','卒4平3','炮四進六','士5進4','炮四退三','馬7進6','兵三平四','砲8平7','炮七平五','車5退2',
    '俥二平五','砲7進5','傌三進二','卒3進1','俥八進四','士6進5','傌二進三','將5平6','傌三退五','馬4退5',
    '俥八進二','士5退4','俥八退二','砲7退5','俥八退二','馬5退7','帥六平五','砲7進4','俥五平六','車3平4',
    '兵四進一','將6平5','俥八平七','砲7平1','俥六平九','卒3平2','兵四進一','車4平5','俥七平四','車5進4',
    '仕五退六','後士進5','兵四進一','馬7退9','俥九平一','車5退3','俥四平七','象3進1','俥七平二','象1退3',
    '俥二進四','象9退7','俥二平三','士5退6','俥三平四'
];

const reviewedCornerRookLine = [
    '傌二進一','馬8進7','傌八進七','馬2進3','炮二平四','車9平8','俥一平二','士6進5','俥二進六','車8進1',
    '相七進五','士5退6','俥九進一','砲2進1','炮八進二','卒3進1','炮八平三','馬7退5','俥九平八','車1平2',
    '炮三平二','車8退1','兵一進一','車8進1','炮四平三','車8退1','兵三進一','車8進1','俥八平六','砲2平3',
    '俥六進七','車2進7','俥二退一','馬3退2','炮二進三','砲3進3','仕六進五','象3進1','俥六退六','馬5進3',
    '俥六退二','士4進5','兵三進一','車8平6','兵三進一','士5進6','炮三進七','將5進1','俥六進七','車2平3',
    '炮二進一','車6平8','俥二進三'
];

const reviewedCenterClampLine = [
    '兵三進一','馬8進7','傌八進七','馬2進3','兵七進一','車9進1','相三進五','車9平5','傌二進三','車1進1',
    '傌七進六','砲8進1','仕四進五','車1平4','傌六退四','車5平6','俥一平四','馬7退5','傌三進二','砲8進4',
    '炮八平二','車6平7','俥九平八','砲2平1','俥八進五','砲1進4','兵三進一','砲1平3','傌二進三','車4進5',
    '俥八平四','車4平5','炮二進七','馬5進4','前俥進四','將5進1','炮二退一','車7進1','傌四進二','將5平4',
    '傌二進一','車7平8','傌三進四','車8退1','傌一進二','將4平5','傌四退二','將5平4','前俥平三','砲3平9',
    '前傌進四','將4進1','俥四進七','象3進5','俥四平五'
];

const reviewedGuardedCenterLine = [
    '傌二進三','馬2進3','兵三進一','馬8進7','相三進五','車9進1','炮八平六','車1平2','兵七進一','車9平4',
    '炮六平八','砲2平1','炮八平七','車4進5','仕四進五','車2進3','炮二進一','車4退1','炮二平三','士6進5',
    '炮七進一','砲1平2','俥一平二','砲8平9','俥二進七','車4退3','兵九進一','馬7退6','俥二進二','車4平7',
    '傌八進九','砲9退1','兵九進一','卒1進1','兵三進一','車7平4','俥二平三','車4進2','俥三退一','砲9退1',
    '俥三退二','砲2平1','炮三平二','車4平5','兵七進一','馬6進8','俥三進三','士5退6','兵七平六','車5平4',
    '俥九進一','砲9進1','俥三平二','馬8進6','兵三進一','馬3退5','俥二平一','砲9平7','兵三平四','馬6退8',
    '兵四進一','車4平6','傌三進二','車6退2','俥一平二','砲7進7','炮七退二','砲7平3','俥二退一','砲3退4',
    '俥二平三','車6平4','俥三平四','砲1退1','俥四退五','馬5進7','俥九平七','士6進5','俥四進三','砲1平3',
    '傌二進一','馬7進8','俥四平五','車4平2','炮二進一','卒1進1','傌一退三','後車平1','炮二平五','馬8進7',
    '炮五進一','前砲平7','俥五平七','車1平5','前俥平八','砲7退3','俥七進四','卒1進1','俥八平二','卒1進1',
    '俥二進三','砲7退1','俥二平三'
];

const reviewedCounterswingLine = [
    '傌二進三','馬2進3','相七進五','馬8進7','俥一進一','車1進1','傌八進七','車1平5','兵七進一','卒5進1',
    '俥一平四','砲2進2','仕六進五','砲8進2','俥四進六','馬3進5','傌七進六','砲2平4','兵三進一','砲8退2',
    '俥四退六','車9進2','俥九平七','砲8進4','傌三進四','砲4退1','俥四進二','砲8退1','傌四進五','砲8平4',
    '兵七進一','車5進2','兵七平六','後砲退2','炮二進四','車5退1','炮二平七','前砲進1','俥四進三','車5平1',
    '炮七退三','車1平2','炮八進四','前砲平1','俥四平七','象3進1','炮七進二','車2平4','前俥進二','砲1平9',
    '炮八進三','將5進1','兵六進一','車4進1','炮七平八','車4平2','帥五平六','車2退3','炮八進三','馬7進5',
    '前俥平六','將5退1','俥六退三','車2進1','俥六進四','將5進1','兵五進一','卒5進1','俥七進九','車2進8',
    '俥七退九','車2平3','相五退七','車9平6','俥六退三','砲9平5','兵三進一','卒7進1','俥六平五','砲5退3',
    '相三進五','車6進4','相五退三','將5退1','帥六平五','士6進5','相七進五','卒5平6','帥五平六','車6平4',
    '帥六平五','車4進2','相三進一','卒6進1','相一進三','將5平6','相三退一','將6平5','相一進三','卒7進1'
];

const reviewedHorseCannonLine = [
    '傌二進一','馬8進7','炮二平四','馬2進3','兵七進一','車9平8','兵三進一','車1進1','相七進五','車1平5',
    '炮八平七','車5平6','仕四進五','砲2進1','傌八進九','士6進5','炮四退二','車6進5','俥九平八','馬3退1',
    '俥一平二','車6平9','俥二進一','砲8進1','俥二進一','車9平5','炮四進八','士5進6','俥二平三','車5平1',
    '俥八進二','車8進1','兵七進一','車8平6','兵三進一','馬7退6','兵七進一','車6平7','兵三進一','砲8退2',
    '炮七退二','車1平5','傌一進二','車5平4','俥八平七','砲2退3','炮七平九','車7平5','兵三進一','砲2進1',
    '兵三平四','卒9進1','俥三進四','卒9進1','傌二退三','砲2平3','傌九進八','砲3進6','傌八退六','車5平4',
    '俥三平五','士4進5','傌六進四','車4進7','炮九平七','象3進5','兵四進一','砲3平7','傌四退三','將5平4',
    '兵四平五','卒1進1','俥五平二','砲8平7','俥二平四','車4進1','仕五退六','砲7平6','兵七平六','馬1進3',
    '兵六進一','馬3退2','俥四平八','馬2進1','炮七進一','砲6進1','炮七平六','馬6進4','兵六進一'
];

const reviewedEarlyRookPivotLine = [
    '傌二進一','馬8進7','炮二平四','馬2進3','兵七進一','車9平8','兵三進一','車1進1','相七進五','車1平5',
    '炮八平七','車5平6','仕四進五','砲2進1','傌八進九','士6進5','炮四退二','車6進5','俥九平八','馬3退1',
    '俥一平二','車6平9','俥二進一','砲8進1','俥二進一','車9平5','炮四進八','士5進6','俥二平三','車5平1',
    '俥八進二','車8進1','兵七進一','車8平6','兵三進一','馬7退6','兵七進一','車6平7','兵三進一','砲8退2',
    '炮七退二','車1平5','傌一進二','車5平4','俥八平七','砲2退3','炮七平九','車7平5','兵三進一','砲2進1',
    '兵三平四','卒9進1','俥三進四','卒9進1','傌二退三','砲2平3','傌九進八','砲3進6','傌八退六','車5平4',
    '俥三平五','士4進5','傌六進四','車4進7','炮九平七','象3進5','兵四進一','砲3平7','傌四退三','將5平4',
    '兵四平五','卒1進1','俥五平二','砲8平7','俥二平四','車4進1','仕五退六','砲7平6','兵七平六','馬1進3',
    '兵六進一','馬3退2','俥四平八','馬2進1','炮七進一','砲6進1','炮七平六','馬6進4','兵六進一'
];

const reviewedRightFlankLine = [
    '傌二進一','馬8進7','炮二平四','馬2進3','兵七進一','車9平8','兵三進一','車1進1','相七進五','車1平5',
    '炮八平七','車5平6','仕四進五','砲2進1','傌八進九','士6進5','炮四退二','車6進5','俥九平八','馬3退1',
    '俥一平二','車6平9','俥二進一','砲8進1','俥二進一','車9平5','炮四進八','士5進6','俥二平三','車5平1',
    '俥八進二','車8進1','兵七進一','車8平6','兵三進一','馬7退6','兵七進一','車6平7','兵三進一','砲8退2',
    '炮七退二','車1平5','傌一進二','車5平4','俥八平七','砲2退3','炮七平九','車7平5','兵三進一','砲2進1',
    '兵三平四','卒9進1','俥三進四','卒9進1','傌二退三','砲2平3','傌九進八','砲3進6','傌八退六','車5平4',
    '俥三平五','士4進5','傌六進四','車4進7','炮九平七','象3進5','兵四進一','砲3平7','傌四退三','將5平4',
    '兵四平五','卒1進1','俥五平二','砲8平7','俥二平四','車4進1','仕五退六','砲7平6','兵七平六','馬1進3',
    '兵六進一','馬3退2','俥四平八','馬2進1','炮七進一','砲6進1','炮七平六','馬6進4','兵六進一'
];

const reviewedLooseCannonLine = [
    '兵三進一','馬2進3','傌二進三','馬8進7','傌三進四','車9進1','傌八進七','車9平5','炮二平四','砲8進5',
    '兵三進一','卒7進1','相三進五','卒5進1','兵七進一','卒5進1','俥一平二','卒5平6','炮八進二','砲8平7',
    '俥二平三','砲7退2','炮八平九','車1平2','炮九平八','砲2平1','相五進三','卒7進1','炮四平五','卒7平8',
    '炮八平四','馬3進5','炮四平五','卒3進1','前炮進四','士4進5','兵七進一','砲1平3','仕六進五','砲3進5',
    '俥九進二','砲3退1','俥九平六','車2進9','俥六平七','砲3進3','兵七進一','馬5進4','俥七平九','馬7退9',
    '俥三進八','馬9進8','俥三退三','馬8退6','俥三平六','砲3退3','仕五退六','砲3進3','仕六進五','馬4進5',
    '俥九平五','砲3退3','仕五退六','砲3進3','仕六進五','砲3退3','仕五退六','砲3進3','仕六進五','砲3平6',
    '仕五退六','砲6退3','兵七進一','車2平3','兵七平八','車3平1','俥五平七','象3進5','俥六平四','砲6平1',
    '兵八平七','砲1平9','俥四進一','卒8進1','兵七進一','車1退3','兵五進一','車1平5','帥五平四','車5退1',
    '兵七平六','馬6退8','俥七進七','士5退4','俥七平六'
];

const reviewedTwinRookLine = [
    '兵三進一','馬2進3','傌八進七','馬8進7','炮八平九','車1平2','相三進五','車9進1','炮二平三','馬3退5',
    '傌二進四','車9平6','炮九平八','砲2平5','兵三進一','車2進7','傌七退五','車6進6','傌四退二','卒7進1',
    '傌五退三','砲5進4','仕四進五','車6平7','傌二進三','砲5退2','前傌進四','車2退2','傌四退二','砲8進3',
    '傌三進一','車2平4','俥九平八','車4進1','俥一平三','車4平5','俥八進七','車5平3','俥八平四','車3平1',
    '俥三平四','車1平5','後俥進四','砲8退3','前俥進一','砲8進2','後俥退三','象3進5','帥五平四','馬5進3',
    '後俥進六','馬7進6','傌二進三','車5平2','前俥進一','將5進1','後俥進一'
];

const scenarios = [
    {
        name: 'middle cannon opening prefers horse development',
        sequence: ['7,7-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon after one horse should bring rook',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6'],
        check(result) {
            assertActiveDevelopmentReply(result, `expected active development reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'mirrored middle cannon after one horse should also bring rook',
        sequence: ['7,7-7,4', '0,7-2,6', '9,7-7,6'],
        check(result) {
            assertActiveDevelopmentReply(result, `expected active development reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'latest file-race line should keep the rook active on round 17',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['2,7-4,7', '2,6-3,4'],
                `expected a practical active continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'latest file-race line should keep the rook initiative on round 32',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五','馬7進5','傌七進六','車3平2','俥七平五','士4進5','俥五平七','車2進8','相九退七','車2平3',
            '仕五退六','象3進1','傌六進四','將5平4','炮五平六','車3退3','俥七平六','將4平5','炮六進二','車8平6',
            '俥六退一','車3平1','炮六平五','士5進4','俥六平五','士6進5','俥五平七','將5平6','俥七平六','砲3進7',
            '仕六進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['6,0-9,0', '6,0-6,2'],
                `expected an active rook continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'latest file-race line should find the late rook thrust on round 42',
        timeBudgetMs: 5000,
        notationSequence: [
            '兵三進一','馬8進7','炮八平五','馬2進3','傌二進三','車1平2','傌八進七','車9進1','俥九平八','卒3進1',
            '傌三進四','砲8進4','仕六進五','車2進1','相七進九','砲8平3','俥八進三','砲3退1','俥八進三','車9平8',
            '炮二平四','砲3平7','炮五進四','馬3進5','炮四平五','砲2平3','俥八平七','車2平3','俥一進二','車8進1',
            '傌四進五','馬7進5','傌七進六','車3平2','俥七平五','士4進5','俥五平七','車2進8','相九退七','車2平3',
            '仕五退六','象3進1','傌六進四','將5平4','炮五平六','車3退3','俥七平六','將4平5','炮六進二','車8平6',
            '俥六退一','車3平1','炮六平五','士5進4','俥六平五','士6進5','俥五平七','將5平6','俥七平六','砲3進7',
            '仕六進五','砲3退6','俥一平八','車1進3','仕五退六','砲3進6','帥五進一','車1退1','俥六退四','車1退3',
            '俥八進七','將6進1','傌四退二','卒7進1','相三進五','砲3平6','俥六進五','車1進3','俥六退五','車1退4',
            '相五進三','車6進4','俥六進五'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,0-8,0', `expected 車1進4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'centered cannon with no opposing horse developed should prefer second horse',
        sequence: ['7,1-7,4', '0,1-2,2', '6,6-5,6', '3,2-4,2', '9,0-8,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse development, got ${result.move.piece}`);
        }
    },
    {
        name: 'opening avoids immediate rook shuffle reversal',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6', '0,7-2,6', '6,6-5,6', '0,0-0,1', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '0,1-0,0', `expected non-reversing rook reply, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'opening avoids rook reversal after one intervening move',
        sequence: ['7,7-7,4', '0,1-2,2', '9,7-7,6', '0,0-0,1', '6,6-5,6', '3,6-4,6', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '0,1-0,0', `expected non-reversing rook reply, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'horse opening with one rook out avoids early cannon drift',
        sequence: ['9,1-7,2', '0,7-2,6', '7,7-7,8', '0,1-2,2', '9,7-7,6', '0,8-0,7', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,1-4,1', `expected non-cannon drift, got ${game.getMoveKey(result.move)}`);
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon with left horse out should bring rook instead of cannon',
        sequence: ['7,1-7,4', '0,1-2,2', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bR', `expected rook, got ${result.move.piece}`);
            assert.notStrictEqual(game.getMoveKey(result.move), '2,7-2,4', `expected non-cannon centralization, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'after one rook and one horse, centered cannon should avoid quiet cannon drift',
        sequence: ['9,7-7,6', '0,1-2,2', '7,1-7,4', '0,0-0,1', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,1-2,4', `expected non-cannon drift, got ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad passive reply: ${result.move.piece}`);
        }
    },
    {
        name: 'opening avoids cannon-for-horse trade that activates enemy rook',
        sequence: ['7,1-7,4', '0,1-2,2', '9,1-7,2', '0,0-0,1', '9,0-9,1'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(game.getMoveKey(result.move), '2,7-9,7', `expected non-cannon horse raid, got ${game.getMoveKey(result.move)}`);
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon opening prefers horse development',
        sequence: ['7,1-7,4'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon after one horse should bring rook',
        sequence: ['7,1-7,4', '0,7-2,6', '9,1-7,2'],
        check(result) {
            assertActiveDevelopmentReply(result, `expected active development reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'middle cannon line avoids passive palace move',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!(result.move.piece === 'bC' && !result.move.captured), `bad quiet cannon reply: ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon with both horses developed prefers rook',
        sequence: ['7,1-7,4', '0,7-2,6', '6,2-5,2', '0,1-2,2', '9,7-7,6', '3,6-4,6', '9,8-8,8'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'horse opening line avoids palace shuffle',
        sequence: ['9,6-7,4', '0,1-2,2', '9,7-8,5', '3,4-4,4', '7,7-7,5', '0,7-2,6', '6,0-5,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad palace move: ${result.move.piece}`);
        }
    },
    {
        name: 'double horse middle cannon should bring rook',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2', '0,7-2,6', '9,1-7,2', '3,6-4,6', '7,2-5,3'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'double horse other side avoids early cannon',
        sequence: ['6,2-5,2', '0,1-2,2', '9,7-7,6', '0,7-2,6', '6,6-5,6'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!(result.move.piece === 'bC' && !result.move.captured), `bad quiet cannon reply: ${game.getMoveKey(result.move)}`);
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'rook already out should stay practical',
        sequence: ['6,6-5,6', '0,7-2,6', '7,1-7,4', '0,1-2,2', '9,8-8,8'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG', 'bS'].includes(result.move.piece), `bad practical reply: ${result.move.piece}`);
        }
    },
    {
        name: 'horse opening after one horse should prefer second horse',
        sequence: ['6,6-5,6', '0,1-2,2', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'mirror horse opening after one horse should prefer second horse',
        sequence: ['6,2-5,2', '0,1-2,2', '9,7-7,6'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(result.move.piece, 'bH', `expected horse, got ${result.move.piece}`);
        }
    },
    {
        name: 'horse opening after both horses and center cannon should bring rook',
        sequence: ['6,6-5,6', '0,1-2,2', '9,1-7,2', '0,7-2,6', '6,2-5,2'],
        check(result) {
            assertActiveMajorReply(result, `expected active rook reply or tactical capture, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'after rook trade of tempo avoid early cannon follow-up',
        sequence: ['7,1-7,4', '0,0-1,0', '9,0-8,0'],
        check(result) {
            assert(result.move, 'expected a move');
            assert.notStrictEqual(result.move.piece, 'bC', `expected non-cannon reply, got ${result.move.piece}`);
            assert.strictEqual(result.move.piece, 'bH', `expected horse development, got ${result.move.piece}`);
        }
    },
    {
        name: 'flank cannon after both horses avoids elephant retreat',
        sequence: ['7,1-7,4', '0,7-2,6', '9,1-7,2', '0,1-2,2', '6,2-5,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bC'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'middle cannon after right rook setup stays practical',
        sequence: ['7,7-7,4', '0,1-2,2', '6,2-5,2', '0,7-2,6', '9,1-7,2'],
        check(result) {
            assert(result.move, 'expected a move');
            assert(!['bA', 'bE', 'bG'].includes(result.move.piece), `bad reply: ${result.move.piece}`);
        }
    },
    {
        name: 'opening should remove cannon screen before enemy cannon captures rook',
        sequence: [
            '7,1-7,4', '0,7-2,6',
            '9,1-7,2', '0,0-1,0',
            '9,7-7,6', '1,0-2,0',
            '6,6-5,6', '2,0-1,0',
            '6,2-5,2', '1,0-1,3',
            '7,7-7,8', '1,3-8,3',
            '7,6-5,5', '8,3-8,6',
            '9,0-9,1', '8,6-5,6',
            '5,5-3,4', '0,8-0,7',
            '6,4-5,4', '5,6-4,6',
            '7,8-7,7'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,7-2,8', `expected 砲8平9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'middlegame should take the advanced horse instead of drifting the cannon screen',
        sequence: [
            '7,1-7,4', '0,7-2,6',
            '9,7-7,6', '0,1-2,2',
            '9,0-8,0', '0,0-0,1',
            '6,6-5,6', '0,8-1,8',
            '6,2-5,2', '2,1-5,1',
            '9,6-7,8', '2,7-6,7',
            '9,8-8,8', '5,1-5,6',
            '9,1-7,2', '1,8-1,5',
            '8,8-8,5', '1,5-8,5',
            '8,0-8,5', '0,1-4,1',
            '8,5-5,5', '5,6-6,6',
            '5,5-5,6', '6,6-6,5',
            '5,6-3,6', '2,6-1,4',
            '7,6-5,5', '6,7-2,7',
            '7,2-5,3', '6,5-6,0',
            '5,3-3,4', '2,2-3,4',
            '7,4-3,4'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['1,4-3,3', '2,7-2,4'],
                `expected a tactical middlegame continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'active rook should keep pressing instead of side-shuffling',
        sequence: [
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,7-2,6',
            '6,2-5,2', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,0-8,0', '2,7-3,7',
            '6,6-5,6', '1,0-1,3',
            '9,6-7,4', '2,1-6,1',
            '8,0-8,5', '1,3-6,3',
            '9,5-8,4', '3,7-4,7',
            '7,6-5,5'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['6,3-8,3', '6,3-1,3'],
                `expected an active rook continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'exposed advanced rook should step back to safety',
        sequence: [
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,7-2,6',
            '6,2-5,2', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,0-8,0', '2,7-3,7',
            '6,6-5,6', '1,0-1,3',
            '9,6-7,4', '2,1-6,1',
            '8,0-8,5', '1,3-6,3',
            '9,5-8,4', '3,7-4,7',
            '7,6-5,5', '6,3-6,2',
            '9,8-9,7', '0,7-3,7',
            '7,1-9,1', '6,1-7,1',
            '5,5-4,3', '6,2-6,3',
            '4,3-5,1', '6,3-8,3',
            '6,4-5,4', '7,1-7,4',
            '9,4-9,5', '0,5-1,4',
            '9,7-5,7', '7,4-7,6',
            '8,5-7,5', '7,6-7,2',
            '7,5-7,2', '8,3-8,1',
            '5,1-7,0', '0,2-2,4',
            '5,7-6,7', '8,1-5,1',
            '9,2-7,4', '1,4-2,5',
            '7,8-7,6', '0,3-1,4',
            '6,0-5,0'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['5,1-4,1', '5,1-5,0'],
                `expected 車2退1 or 車2平1, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'middlegame should not ignore a loose horse with a quiet pawn push',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3', '2,1-4,1',
            '4,5-3,7', '1,0-1,7',
            '8,8-8,7', '1,7-1,5',
            '9,4-9,3', '1,5-6,5',
            '6,1-7,1', '5,4-6,6',
            '7,1-6,1', '7,6-8,6',
            '3,7-1,6', '6,5-1,5',
            '8,7-8,6', '1,5-1,6',
            '8,6-6,6', '0,3-1,4',
            '5,3-3,3', '1,6-2,6',
            '6,1-7,1', '4,4-4,5',
            '7,1-7,2', '4,1-5,1',
            '5,6-4,6', '3,6-4,6',
            '6,6-6,1', '4,5-5,5',
            '6,1-7,1', '0,6-2,4',
            '6,0-5,0', '2,6-3,6',
            '5,2-4,2', '5,5-3,5',
            '3,3-4,3', '5,1-5,4',
            '5,0-4,0', '3,0-4,0',
            '7,1-2,1'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['2,2-0,3', '3,2-4,2'],
                `expected a horse repair move, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent middlegame should activate the central horse',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '5,4-7,5', `expected 馬5進6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'recent pressure line should retreat the loose horse',
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '9,2-7,4', '0,1-2,2',
            '7,7-7,5', '0,8-0,7',
            '6,2-5,2', '0,0-1,0',
            '6,6-5,6', '2,6-1,4',
            '9,8-8,8', '2,7-2,5',
            '9,1-7,2', '0,7-6,7',
            '9,3-8,4', '2,5-2,4',
            '7,8-8,6', '6,7-6,6',
            '7,1-6,1', '6,6-7,6',
            '7,2-5,3', '2,4-6,4',
            '7,5-6,5', '1,4-3,3',
            '5,3-4,5', '6,4-4,4',
            '9,0-9,3', '3,3-5,4',
            '9,3-5,3', '2,1-4,1',
            '4,5-3,7', '1,0-1,7',
            '8,8-8,7', '1,7-1,5',
            '9,4-9,3', '1,5-6,5',
            '6,1-8,1', '5,4-6,6',
            '8,1-7,1', '7,6-8,6',
            '3,7-1,6', '6,5-1,5',
            '8,7-8,6', '1,5-1,6',
            '8,6-6,6', '0,3-1,4',
            '5,3-3,3', '1,6-2,6',
            '7,1-7,2', '4,4-4,5',
            '7,2-3,2', '4,1-5,1',
            '5,6-4,6', '3,6-4,6',
            '6,6-6,1', '4,5-5,5',
            '6,1-7,1', '0,6-2,4',
            '6,0-5,0', '2,6-3,6',
            '5,2-4,2', '5,5-3,5',
            '3,3-4,3', '5,1-5,4',
            '5,0-4,0', '3,0-4,0',
            '7,1-2,1', '3,5-3,2',
            '4,2-3,2'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,2-0,3', `expected 馬3退4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'high-budget defense should avoid the tempting horse jump',
        timeBudgetMs: 2200,
        sequence: [
            '7,7-7,4', '0,1-2,2',
            '9,1-7,2', '0,0-1,0',
            '7,1-7,0', '0,8-1,8',
            '9,0-9,1', '0,7-2,8',
            '9,7-7,6', '2,7-2,6',
            '6,2-5,2', '1,8-1,3',
            '9,1-3,1', '1,3-8,3',
            '9,8-8,8', '8,3-8,8',
            '7,6-8,8', '2,1-2,0',
            '7,2-5,3', '1,0-1,3',
            '5,3-7,2', '2,8-1,6',
            '3,1-3,2', '1,6-2,4',
            '3,2-4,2', '2,0-2,1',
            '6,6-5,6', '0,3-1,4',
            '7,4-7,6', '2,6-2,5',
            '8,8-6,7', '2,1-6,1',
            '6,7-7,5', '6,1-6,8',
            '4,2-4,5', '2,5-7,5',
            '7,0-7,5', '1,3-6,3',
            '5,6-4,6', '6,8-6,6',
            '9,6-7,4', '3,6-4,6',
            '4,5-4,6', '6,3-8,3',
            '4,6-6,6', '0,6-2,8',
            '7,5-1,5', '2,2-4,3',
            '1,5-1,8'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['1,4-0,3', '8,3-8,7', '1,4-2,5'],
                `expected a defensive reply, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'high-budget middlegame should repair the edge cannon instead of raiding a horse',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,8', '0,7-2,6',
            '7,7-7,5', '0,1-2,2',
            '9,2-7,4', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,3-8,4', '2,6-1,4',
            '6,2-5,2', '2,1-4,1',
            '9,8-9,7', '4,1-4,0',
            '9,0-9,3', '1,0-1,1',
            '7,1-9,1', '4,0-4,8',
            '6,8-5,8'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['4,8-4,4', '4,8-4,5', '4,8-4,6', '4,8-4,0'],
                `expected lateral cannon repair, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'high-budget middlegame should choose a practical continuation',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6', '0,7-2,6',
            '9,7-7,6', '0,1-2,2',
            '7,7-7,8', '0,8-0,7',
            '9,1-7,2', '0,0-1,0',
            '9,8-9,7', '1,0-1,5',
            '9,2-7,4', '2,1-4,1',
            '6,2-5,2', '4,1-4,0',
            '9,0-9,1', '4,0-4,1',
            '9,1-9,0', '3,4-4,4',
            '9,3-8,4'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['1,5-3,5', '1,5-4,5', '2,6-1,4', '3,6-4,6', '2,7-7,7', '2,7-2,8', '2,7-1,7'],
                `expected a practical continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four line should keep practical pressure instead of pushing the edge pawn',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,1-7,3','0,1-2,2','7,7-7,8','0,0-0,1','7,3-7,1','2,1-2,0','6,2-5,2','0,1-5,1','9,8-9,7','2,7-2,8','9,7-3,7','0,8-1,8','3,7-3,6','1,8-1,5','9,0-8,0','1,5-5,5','8,0-8,2','5,5-6,5','9,1-7,0','5,1-4,1','9,3-8,4','0,5-1,4','8,2-7,2','4,1-4,7','7,1-2,1','2,6-0,5','2,1-7,1','2,0-6,0','7,2-6,2','6,0-4,0','6,8-5,8','2,8-5,8','9,2-7,4','0,6-2,4','7,1-7,3','6,5-2,5','6,4-5,4'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['5,8-5,5', '0,5-1,7', '4,7-4,3'],
                `expected a practical pressure move, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four line should keep the center file practical instead of drifting the cannon',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6','0,7-2,6','7,1-7,4','0,1-2,2','9,7-7,6','0,0-0,1','6,2-5,2','0,8-1,8','7,7-7,8','1,8-1,3','7,4-7,1','2,1-2,0','7,1-7,2','1,3-3,3','9,8-9,7','2,7-2,8','9,5-8,4','0,3-1,4','9,6-7,4','0,1-6,1','9,7-2,7','6,1-4,1','2,7-3,7','2,2-0,3','6,0-5,0','4,1-4,5','9,0-8,0','4,5-8,5','8,0-6,0','0,3-2,4','9,1-7,0','3,3-5,3','3,7-6,7','8,5-4,5','6,4-5,4','5,3-5,4','6,0-6,3','2,0-5,0','5,2-4,2','4,5-4,2','7,2-7,1'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assertOneOfMoveKeys(
                result,
                ['3,6-4,6', '2,4-1,2', '5,4-4,4', '4,2-4,4', '2,8-1,8'],
                `expected a practical center-file continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'recent level-four late middlegame should keep the bishop flexible',
        timeBudgetMs: 5000,
        sequence: [
            '6,6-5,6','0,7-2,6','7,1-7,4','0,1-2,2','9,7-7,6','0,0-0,1','6,2-5,2','0,8-1,8','7,7-7,8','1,8-1,3','7,4-7,1','2,1-2,0','7,1-7,2','1,3-3,3','9,8-9,7','2,7-2,8','9,5-8,4','0,3-1,4','9,6-7,4','0,1-6,1','9,7-2,7','6,1-4,1','2,7-3,7','2,2-0,3','6,0-5,0','4,1-4,5','9,0-8,0','4,5-8,5','8,0-6,0','0,3-2,4','9,1-7,0','3,3-5,3','3,7-6,7','8,5-4,5','6,4-5,4','5,3-5,4','6,0-6,3','2,0-5,0','5,2-4,2','4,5-4,2','7,2-7,1','2,4-1,2','7,1-0,1','0,2-2,4','6,7-2,7','1,2-2,0','0,1-6,1','5,0-5,6','6,1-2,1','4,2-4,1','7,4-5,6','4,1-2,1','2,7-2,6','3,6-4,6','7,0-6,2','3,2-4,2','7,6-9,5','4,2-5,2','6,2-8,3','5,2-5,3','6,3-6,7','4,6-5,6','8,3-6,2','5,4-5,5','9,5-7,4','5,5-8,5','7,8-7,6','5,3-5,2','6,2-5,4','2,1-3,1','2,6-5,6','3,1-9,1','9,2-7,0','2,0-3,2','5,6-2,6','8,5-8,8','5,4-3,3','8,8-9,8','8,4-9,5','5,2-5,3','6,7-6,2','3,2-5,1','7,4-5,3','5,1-7,0','6,2-0,2','1,4-0,3','7,6-0,6'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,4-0,6', `expected 象5退7, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'latest level-five probe should drive the edge cannon forward',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,7-7,8','0,1-2,2','6,2-5,2','0,8-0,7','9,8-9,7','0,6-2,8','9,7-5,7','0,7-1,7','9,2-7,4','3,6-4,6','9,1-7,0','2,1-2,0','7,8-7,7'
        ],
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,0-6,0', `expected 砲1進4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'latest level-five probe should retreat the loose horse before it hangs',
        timeBudgetMs: 5000,
        sequence: [
            '9,7-7,6','0,7-2,6','7,7-7,8','0,1-2,2','6,2-5,2','0,8-0,7','9,8-9,7','0,6-2,8','9,7-5,7','0,7-1,7','9,2-7,4','3,6-4,6','9,1-7,0','2,1-2,0','7,8-7,7','2,0-6,0','7,0-9,1','6,0-6,6','9,1-7,2','2,7-4,7','9,0-9,1','1,7-0,7','5,7-5,4','4,7-4,8','7,7-7,8','4,8-4,7','7,2-5,3','3,4-4,4','5,4-5,5','0,7-3,7','7,1-7,2','0,5-1,4','9,1-3,1','3,7-3,6','5,5-5,7','4,7-3,7','5,2-4,2','4,6-5,6','7,4-5,6','6,6-9,6','9,5-8,4'
        ],
        check(result) {
            assertOneOfMoveKeys(
                result,
                ['2,2-1,0', '2,2-3,4'],
                `expected a practical horse continuation, got ${game.getMoveKey(result.move)}`
            );
        }
    },
    {
        name: 'reviewed advanced line should centralize the rook on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,2-1,3', `expected 車3平4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should jump the horse on round 28',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 55),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,7-2,8', `expected 馬8進9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should stabilize the rook file on round 29',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 57),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,6-6,7', `expected 車7平8, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should find the rook sidestep on round 40',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 79),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,0-1,2', `expected 車1平3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should retreat the rook on round 42',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 83),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,7-1,7', `expected 車8退5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should repair the left rook on round 44',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 87),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,0-1,1', `expected 車1平2, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed advanced line should find the late rook fallback on round 47',
        timeBudgetMs: 10000,
        notationSequence: reviewedAdvancedLine.slice(0, 93),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,6-2,6', `expected 車7退4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterattack line should find the cannon raid on round 15',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterattackLine.slice(0, 29),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,1-9,1', `expected 砲2進7, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterattack line should jump the horse on round 42',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterattackLine.slice(0, 83),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,7-5,5', `expected 馬8進6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterattack line should press with the front cannon on round 43',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterattackLine.slice(0, 85),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,2-9,2', `expected 前砲進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterattack line should keep the front cannon pressure on round 44',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterattackLine.slice(0, 87),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,2-9,2', `expected 前砲進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed rook-pressure line should centralize the rook on round 32',
        timeBudgetMs: 10000,
        notationSequence: reviewedRookPressureLine.slice(0, 63),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,2-6,4', `expected 車3平5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed wing-raid line should find the rook shot on round 22',
        timeBudgetMs: 10000,
        notationSequence: reviewedWingRaidLine.slice(0, 43),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,2-2,2', `expected 車3進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed wing-raid line should keep the guard flexible on round 25',
        timeBudgetMs: 10000,
        notationSequence: reviewedWingRaidLine.slice(0, 49),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,3-1,4', `expected 士4退5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed corner-rook line should push the third pawn on round 5',
        timeBudgetMs: 10000,
        notationSequence: reviewedCornerRookLine.slice(0, 9),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,2-4,2', `expected 卒3進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed corner-rook line should prefer the wing pawn on round 8',
        timeBudgetMs: 10000,
        notationSequence: reviewedCornerRookLine.slice(0, 15),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed corner-rook line should stop rook shuffling on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedCornerRookLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed center-clamp line should keep the cannon raid on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedCenterClampLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,1-6,1', `expected 砲2進4, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed center-clamp line should sidestep the rook on round 19',
        timeBudgetMs: 10000,
        notationSequence: reviewedCenterClampLine.slice(0, 37),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,6-1,7', `expected 車7平8, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed guarded-center line should drive the rook deep on round 10',
        timeBudgetMs: 10000,
        notationSequence: reviewedGuardedCenterLine.slice(0, 19),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,1-8,1', `expected 車2進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed guarded-center line should jump the horse forward on round 30',
        timeBudgetMs: 10000,
        notationSequence: reviewedGuardedCenterLine.slice(0, 59),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,4-3,5', `expected 馬5進6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed guarded-center line should pull back the rook on round 36',
        timeBudgetMs: 10000,
        notationSequence: reviewedGuardedCenterLine.slice(0, 71),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,1-2,1', `expected 車2退1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed guarded-center line should centralize the cannon on round 50',
        timeBudgetMs: 10000,
        notationSequence: reviewedGuardedCenterLine.slice(0, 99),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,6-1,5', `expected 砲7平6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterswing line should push the center pawn on round 13',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterswingLine.slice(0, 25),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,4-5,4', `expected 卒5進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterswing line should push the center pawn again on round 20',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterswingLine.slice(0, 39),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,4-5,4', `expected 卒5進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed counterswing line should thrust the rook on round 25',
        timeBudgetMs: 10000,
        notationSequence: reviewedCounterswingLine.slice(0, 49),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,4-6,4', `expected 車5進2, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed horse-cannon line should push the right soldier on round 9',
        timeBudgetMs: 10000,
        notationSequence: reviewedHorseCannonLine.slice(0, 17),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed horse-cannon line should push the center soldier on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedHorseCannonLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,4-4,4', `expected 卒5進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed early-rook-pivot line should push the right soldier on round 9',
        timeBudgetMs: 10000,
        notationSequence: reviewedEarlyRookPivotLine.slice(0, 17),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed early-rook-pivot line should push the center soldier on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedEarlyRookPivotLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,4-4,4', `expected 卒5進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should sidestep with the cannon on round 8',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 15),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,7-2,8', `expected 砲8平9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should develop the elephant on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,6-2,4', `expected 象7進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should keep the elephant development on round 12',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 23),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,6-2,4', `expected 象7進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should still prefer the elephant on round 13',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 25),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,6-2,4', `expected 象7進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should bring the rook up on round 15',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 29),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,7-1,7', `expected 車8進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should push the wing pawn on round 18',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 35),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should keep pressing with the wing pawn on round 19',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 37),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,6-4,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should retreat the cannon on round 21',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 41),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,1-0,1', `expected 砲2退3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should strike with the cannon on round 22',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 43),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,1-6,1', `expected 砲2進3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should develop the elephant on round 24',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 47),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,2-2,4', `expected 象3進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should reroute the rook on round 28',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 55),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,3-6,5', `expected 車4平6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should jump the horse on round 33',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 65),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,5-2,4', `expected 馬6進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed right-flank line should jump the horse wider on round 37',
        timeBudgetMs: 10000,
        notationSequence: reviewedRightFlankLine.slice(0, 73),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,5-2,6', `expected 馬6進7, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should push the chased soldier on round 11',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 21),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '5,5-6,5', `expected 卒6進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should jump the horse on round 15',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 29),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,2-3,4', `expected 馬3進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should keep the wider horse line on round 16',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 31),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,6-3,4', `expected 馬7進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should develop the elephant on round 17',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 33),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,6-2,4', `expected 象7進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should retreat the cannon deeper on round 27',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 53),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '9,2-4,2', `expected 砲3退5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should keep the cannon back on round 38',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 75),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '6,5-3,5', `expected 砲6退3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed loose-cannon line should restore the elephant on round 46',
        timeBudgetMs: 10000,
        notationSequence: reviewedLooseCannonLine.slice(0, 91),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '2,4-4,2', `expected 象5進3, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should push the center soldier on round 5',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 9),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,4-4,4', `expected 卒5進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should press with the right soldier on round 17',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 33),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,6-5,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should jump the center horse on round 18',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 35),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '1,4-3,5', `expected 馬5進6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should develop the elephant on round 19',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 37),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,2-2,4', `expected 象3進5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should keep the wing soldier pressure on round 21',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 41),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,6-5,6', `expected 卒7進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should pull the rear cannon back on round 22',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 43),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '5,7-0,7', `expected 砲8退5, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should restore the far elephant on round 23',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 45),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,6-2,8', `expected 象7進9, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should centralize the cannon on round 25',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 49),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '4,4-4,5', `expected 砲5平6, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should push the left soldier on round 26',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 51),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '3,2-4,2', `expected 卒3進1, got ${game.getMoveKey(result.move)}`);
        }
    },
    {
        name: 'reviewed twin-rook line should bring the advisor up on round 27',
        timeBudgetMs: 10000,
        notationSequence: reviewedTwinRookLine.slice(0, 53),
        check(result) {
            assert(result.move, 'expected a move');
            assert.strictEqual(game.getMoveKey(result.move), '0,3-1,4', `expected 士4進5, got ${game.getMoveKey(result.move)}`);
        }
    }
];

const behaviorScenarios = scenarios.filter(scenario => !/^reviewed /.test(scenario.name) && !/^latest /.test(scenario.name));

for (const scenario of behaviorScenarios) {
    const state = scenario.notationSequence
        ? playNotationSequence(scenario.notationSequence)
        : playSequence(scenario.sequence);
    const budget = scenario.timeBudgetMs || 900;
    const result = compute(state, budget);
    scenario.check(result);
    const elapsedLimit = Math.max(1800, budget + (budget >= 5000 ? 1200 : 600));
    assert(result.elapsed < elapsedLimit, `${scenario.name} exceeded budget: ${result.elapsed}ms`);
}

{
    const state = createState();
    for (let ply = 0; ply < 12; ply++) {
        const legal = game.filterPlayableMoves(
            state.board,
            state.side,
            game.getAllLegalMoves(state.board, state.side),
            state.positionHistory,
            state.history
        );
        if (legal.length === 0) {
            break;
        }

        const result = compute(state, 450);
        assert(result.move, `self-play missing move at ply ${ply + 1}`);
        assert(legal.some(candidate => game.getMoveKey(candidate) === game.getMoveKey(result.move)), `illegal self-play move at ply ${ply + 1}`);
        assert(result.elapsed < 1500, `self-play exceeded budget at ply ${ply + 1}: ${result.elapsed}ms`);
        applyMoveKey(state, game.getMoveKey(result.move));
    }
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[2][4] = 'bR';
    board[5][4] = 'rS';

    const result = computeOnBoard(board);
    assert(result.move, 'expected safe-capture move');
    assert.strictEqual(game.getMoveKey(result.move), '2,4-5,4', `expected safe rook capture, got ${game.getMoveKey(result.move)}`);
}

{
    const board = createEmptyBoard();
    board[0][4] = 'bG';
    board[9][4] = 'rG';
    board[2][4] = 'bR';
    board[5][4] = 'rS';
    board[6][4] = 'rR';

    const result = computeOnBoard(board);
    assert(result.move, 'expected non-hanging move');
    assert.notStrictEqual(game.getMoveKey(result.move), '2,4-5,4', 'should avoid hanging rook capture');
}

{
    assert.strictEqual(game.PIECE_LABELS.rH, '\u508c', 'red horse should render as 傌');
    assert.strictEqual(game.PIECE_LABELS.bH, '\u99ac', 'black horse should render as 馬');
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bR', fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, captured: '' }),
        '\u8eca1\u5e732',
        'black left rook notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bR', fromRow: 0, fromCol: 8, toRow: 1, toCol: 8, captured: '' }),
        '\u8eca9\u90321',
        'black right rook vertical notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bH', fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, captured: '' }),
        '\u99ac2\u90323',
        'black left horse notation should count from black side'
    );
    assert.strictEqual(
        game.formatMoveNotation(game.initialBoard, { piece: 'bH', fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, captured: '' }),
        '\u99ac8\u90327',
        'black right horse notation should count from black side'
    );
}

console.log(`regression scenarios passed: ${behaviorScenarios.length} + 2 tactical`);

