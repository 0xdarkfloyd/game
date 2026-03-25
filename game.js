const RED_COLOR = 'r';
const BLACK_COLOR = 'b';
const MATE_SCORE = 900000;
const AI_THINK_DELAY_MS = 260;
const MOVE_ANIMATION_MS = 220;
const AI_WORKER_TIMEOUT_FLOOR_MS = 2600;
const AI_WORKER_TIMEOUT_PADDING_MS = 900;
const SEARCH_TIME_CHECK_INTERVAL = 32;
const ASSET_VERSION = '20260325-notation2';
const AI_LEVELS = {
    beginner: {
        label: '\u521d\u7d1a',
        opening: 1200,
        middlegame: 1350,
        endgame: 1500
    },
    intermediate: {
        label: '\u4e2d\u7d1a',
        opening: 2200,
        middlegame: 2600,
        endgame: 3000
    },
    advanced: {
        label: '\u9ad8\u7d1a',
        opening: 3600,
        middlegame: 4300,
        endgame: 5000
    }
};
const DEFAULT_AI_LEVEL = 'intermediate';
const RED_NUMERALS = ['', '\u4e00', '\u4e8c', '\u4e09', '\u56db', '\u4e94', '\u516d', '\u4e03', '\u516b', '\u4e5d'];
const BLACK_NUMERALS = ['', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
const OPENING_BOOK = {
    [`${RED_COLOR}|`]: [
        { fromRow: 7, fromCol: 7, toRow: 7, toCol: 4, name: '\u4e2d\u70ae' },
        { fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, name: '\u4ed9\u4eba\u6307\u8def' },
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u8d77\u99ac\u5c40' },
        { fromRow: 9, fromCol: 6, toRow: 7, toCol: 4, name: '\u98db\u76f8\u5c40' }
    ],
    [`${BLACK_COLOR}|6,2-5,2`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5c4f\u98a8\u99ac' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u55ae\u63d0\u99ac' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${RED_COLOR}|6,2-5,2/0,1-2,2`]: [
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u8d77\u53f3\u99ac' },
        { fromRow: 7, fromCol: 7, toRow: 7, toCol: 4, name: '\u8f49\u4e2d\u70ae' },
        { fromRow: 9, fromCol: 0, toRow: 9, toCol: 1, name: '\u8eca\u4e5d\u5e73\u516b' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,6`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u5c4f\u98a8\u99ac' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca9\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/7,7-7,4`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u5c4f\u98a8\u99ac' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca9\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,0-9,1`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/6,6-5,6`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u5c4f\u98a8\u99ac' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u5c4f\u98a8\u99ac' },
        { fromRow: 2, fromCol: 1, toRow: 2, toCol: 4, name: '\u9806\u70ae' }
    ],
    [`${RED_COLOR}|7,7-7,4/0,1-2,2`]: [
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u99ac\u4e8c\u9032\u4e09' },
        { fromRow: 9, fromCol: 8, toRow: 9, toCol: 7, name: '\u8eca\u4e00\u5e73\u4e8c' },
        { fromRow: 6, fromCol: 6, toRow: 5, toCol: 6, name: '\u5175\u4e03\u9032\u4e00' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,7-7,6`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 8, toRow: 1, toCol: 8, name: '\u8eca1\u90321' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u5c4f\u98a8\u99ac' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,1-7,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,7-7,6/3,2-4,2`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${RED_COLOR}|7,7-7,4/0,1-2,2/9,7-7,6/3,2-4,2/9,8-9,7`]: [
        { fromRow: 9, fromCol: 7, toRow: 3, toCol: 7, name: '\u76f4\u8eca\u904e\u6cb3' },
        { fromRow: 6, fromCol: 4, toRow: 5, toCol: 4, name: '\u4e2d\u5175\u9032\u4e00' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,7-7,6/3,2-4,2/9,8-9,7/9,7-3,7`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 0, fromCol: 4, toRow: 1, toCol: 4, name: '\u5c07\u9580\u7a69\u5b88' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/9,8-9,7`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,4-5,4`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2/9,7-7,6`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca9\u5e738' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,7-2,6/9,7-7,6/0,1-2,2/6,6-5,6`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,7-2,6/9,7-7,6/0,1-2,2/6,6-5,6/3,6-4,6/5,6-4,6`]: [
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' },
        { fromRow: 0, fromCol: 8, toRow: 1, toCol: 8, name: '\u8eca1\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,6/0,7-2,6/6,6-5,6`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,6/0,7-2,6/6,6-5,6/3,6-4,6/5,6-4,6`]: [
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' },
        { fromRow: 0, fromCol: 0, toRow: 1, toCol: 0, name: '\u8eca9\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2/0,7-2,6/9,1-7,2/3,6-4,6/7,2-5,3`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2/0,7-2,6/9,1-7,2/3,6-4,6/7,2-5,3/0,0-0,1/7,1-7,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,1-2,2/6,2-5,2/0,7-2,6/9,1-7,2/3,6-4,6/7,2-5,1`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,8/0,7-2,6/9,1-7,2`]: [
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca9\u5e738' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,8/0,7-2,6/9,1-7,2/0,0-0,1/7,7-7,6`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,8/0,7-2,6/9,1-7,2/0,0-0,1/7,7-7,6/3,6-4,6/7,8-9,7`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' }
    ],
    [`${BLACK_COLOR}|6,2-5,2/0,1-2,2/9,7-7,8/0,7-2,6/9,1-7,2/0,0-0,1/7,7-7,6/3,6-4,6/7,8-9,7/0,8-0,7/6,2-5,2`]: [
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${RED_COLOR}|7,7-7,4/0,7-2,6`]: [
        { fromRow: 9, fromCol: 1, toRow: 7, toCol: 2, name: '\u99ac\u516b\u9032\u4e03' },
        { fromRow: 9, fromCol: 0, toRow: 9, toCol: 1, name: '\u8eca\u4e5d\u5e73\u516b' },
        { fromRow: 6, fromCol: 2, toRow: 5, toCol: 2, name: '\u5175\u4e03\u9032\u4e00' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,7-2,6/6,2-5,2`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,7-2,6/6,2-5,2/0,1-2,2/9,1-7,2`]: [
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 0, fromCol: 0, toRow: 0, toCol: 1, name: '\u8eca1\u5e732' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,7-2,6/9,1-7,2/0,1-2,2/6,2-5,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|7,1-7,4/0,7-2,6/9,1-7,2/0,1-2,2/6,2-5,2/0,8-0,7/7,2-5,1`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/9,1-7,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|7,7-7,4/0,7-2,6/6,4-5,4`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5de6\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|9,7-7,6`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u8d77\u99ac\u5c0d\u5c4f\u98a8\u99ac' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u8d77\u99ac\u5c0d\u8d77\u99ac' }
    ],
    [`${RED_COLOR}|9,7-7,6/0,1-2,2`]: [
        { fromRow: 7, fromCol: 7, toRow: 7, toCol: 4, name: '\u8d77\u99ac\u8f49\u4e2d\u70ae' },
        { fromRow: 9, fromCol: 0, toRow: 9, toCol: 1, name: '\u8eca\u4e5d\u5e73\u516b' },
        { fromRow: 9, fromCol: 1, toRow: 7, toCol: 2, name: '\u96d9\u99ac' }
    ],
    [`${BLACK_COLOR}|6,6-5,6/0,1-2,2/9,7-7,6`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' }
    ],
    [`${BLACK_COLOR}|6,6-5,6/0,1-2,2/9,1-7,2`]: [
        { fromRow: 0, fromCol: 7, toRow: 2, toCol: 6, name: '\u53f3\u99ac\u51fa\u52d5' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|6,6-5,6/0,1-2,2/9,1-7,2/0,7-2,6/6,2-5,2`]: [
        { fromRow: 0, fromCol: 8, toRow: 0, toCol: 7, name: '\u8eca1\u5e732' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|6,6-5,6/0,7-2,6/9,1-7,2/0,1-2,2/7,7-7,5`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|6,6-5,6/0,7-2,6/9,1-7,2/0,1-2,2/7,7-7,5/3,6-4,6/7,1-7,0`]: [
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|9,6-7,4/0,7-2,6/9,7-7,5/3,4-4,4/7,7-7,5/0,1-2,2/9,8-9,7`]: [
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' }
    ],
    [`${BLACK_COLOR}|9,6-7,4/0,7-2,6/9,7-7,5/3,4-4,4/7,7-7,5/0,1-2,2/9,8-9,7/3,6-4,6/7,1-5,1`]: [
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|9,6-7,4/0,1-2,2/9,7-8,5/3,4-4,4/7,7-7,5/0,7-2,6/9,8-9,7`]: [
        { fromRow: 3, fromCol: 6, toRow: 4, toCol: 6, name: '\u53523\u90321' },
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' }
    ],
    [`${BLACK_COLOR}|9,6-7,4/0,1-2,2/9,7-8,5/3,4-4,4/7,7-7,5/0,7-2,6/9,8-9,7/3,6-4,6/7,1-5,1`]: [
        { fromRow: 3, fromCol: 4, toRow: 4, toCol: 4, name: '\u53525\u90321' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ],
    [`${BLACK_COLOR}|9,6-7,4`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u98db\u76f8\u5c0d\u5c4f\u98a8\u99ac' },
        { fromRow: 2, fromCol: 1, toRow: 2, toCol: 5, name: '\u904e\u5bae\u70ae' },
        { fromRow: 2, fromCol: 7, toRow: 2, toCol: 4, name: '\u5217\u70ae' }
    ],
    [`${RED_COLOR}|9,6-7,4/2,1-2,5`]: [
        { fromRow: 9, fromCol: 7, toRow: 7, toCol: 6, name: '\u8d77\u53f3\u99ac' },
        { fromRow: 9, fromCol: 8, toRow: 9, toCol: 7, name: '\u8eca\u4e00\u5e73\u4e8c' }
    ],
    [`${BLACK_COLOR}|9,6-7,4/2,1-2,5/9,7-7,6`]: [
        { fromRow: 0, fromCol: 1, toRow: 2, toCol: 2, name: '\u5c4f\u98a8\u99ac' },
        { fromRow: 3, fromCol: 2, toRow: 4, toCol: 2, name: '\u53527\u90321' }
    ]
};

const PIECE_LABELS = {
    rR: '\u4fe5',
    rH: '\u99ac',
    rE: '\u76f8',
    rA: '\u4ed5',
    rG: '\u5e25',
    rC: '\u70ae',
    rS: '\u5175',
    bR: '\u8eca',
    bH: '\u99ac',
    bE: '\u8c61',
    bA: '\u58eb',
    bG: '\u5c07',
    bC: '\u7832',
    bS: '\u5352'
};

const PIECE_VALUES = {
    G: 100000,
    R: 920,
    H: 430,
    E: 220,
    A: 220,
    C: 460,
    S: 110
};

const MOBILITY_WEIGHTS = {
    R: 6,
    H: 8,
    E: 1,
    A: 1,
    G: 0,
    C: 4,
    S: 2
};

const initialBoard = [
    ['bR', 'bH', 'bE', 'bA', 'bG', 'bA', 'bE', 'bH', 'bR'],
    ['', '', '', '', '', '', '', '', ''],
    ['', 'bC', '', '', '', '', '', 'bC', ''],
    ['bS', '', 'bS', '', 'bS', '', 'bS', '', 'bS'],
    ['', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['rS', '', 'rS', '', 'rS', '', 'rS', '', 'rS'],
    ['', 'rC', '', '', '', '', '', 'rC', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['rR', 'rH', 'rE', 'rA', 'rG', 'rA', 'rE', 'rH', 'rR']
];

const BOARD_SVG = buildBoardSvg();

let board = cloneBoard(initialBoard);
let humanColor = RED_COLOR;
let computerColor = BLACK_COLOR;
let aiLevel = DEFAULT_AI_LEVEL;
let currentPlayer = RED_COLOR;
let selectedCell = null;
let validMoves = [];
let lastMove = null;
let gameActive = true;
let aiThinking = false;
let statusMessage = '';
let moveHistory = [];
let moveLog = [];
let moveSequence = [];
let positionHistory = [];
let pendingAnimatedMove = null;
let audioContext = null;
const transpositionTable = new Map();
let aiWorker = null;
let aiRequestId = 0;
let pendingAiJob = null;
let searchDeadline = 0;
let searchNodeCounter = 0;
let searchTimedOut = false;
let engineCore = null;
let createEngineCoreFactory = typeof createXiangqiEngineCore === 'function' ? createXiangqiEngineCore : null;

if (!createEngineCoreFactory && typeof require === 'function') {
    try {
        ({ createXiangqiEngineCore: createEngineCoreFactory } = require('./engine-core.js'));
    } catch (error) {
        createEngineCoreFactory = null;
    }
}

function cloneBoard(source) {
    return source.map(row => row.slice());
}

function otherColor(color) {
    return color === 'r' ? 'b' : 'r';
}

function colorName(color) {
    return color === 'r' ? '\u7d05\u65b9' : '\u9ed1\u65b9';
}

function getAiLevelLabel(level = aiLevel) {
    return (AI_LEVELS[level] || AI_LEVELS[DEFAULT_AI_LEVEL]).label;
}

function isInsideBoard(row, col) {
    return row >= 0 && row < 10 && col >= 0 && col < 9;
}

function isInsidePalace(color, row, col) {
    if (col < 3 || col > 5) {
        return false;
    }
    return color === 'r' ? row >= 7 && row <= 9 : row >= 0 && row <= 2;
}

function hasCrossedRiver(color, row) {
    return color === 'r' ? row <= 4 : row >= 5;
}

function countPieces(activeBoard) {
    let count = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col]) {
                count++;
            }
        }
    }

    return count;
}

function cloneMoveLog(entries) {
    return entries.map(entry => ({ ...entry }));
}

function cloneMoveSequence(entries) {
    return entries.slice();
}

function clonePositionHistory(entries) {
    return entries.slice();
}

function getFileNumber(color, col) {
    return color === RED_COLOR ? 9 - col : col + 1;
}

function formatNumber(color, value) {
    return (color === RED_COLOR ? RED_NUMERALS : BLACK_NUMERALS)[value];
}

function getOpeningBookKey(color, historySequence) {
    return `${color}|${historySequence.join('/')}`;
}

function getMoveKey(move) {
    return `${move.fromRow},${move.fromCol}-${move.toRow},${move.toCol}`;
}

function parseMoveKey(moveKey) {
    const [fromPart, toPart] = moveKey.split('-');
    const [fromRow, fromCol] = fromPart.split(',').map(Number);
    const [toRow, toCol] = toPart.split(',').map(Number);
    return { fromRow, fromCol, toRow, toCol };
}

function mirrorCol(col) {
    return 8 - col;
}

function mirrorMoveDescriptor(move) {
    return {
        ...move,
        fromCol: mirrorCol(move.fromCol),
        toCol: mirrorCol(move.toCol)
    };
}

function mirrorMoveKey(moveKey) {
    return getMoveKey(mirrorMoveDescriptor(parseMoveKey(moveKey)));
}

function getStartStatusMessage() {
    return `${humanColor === RED_COLOR ? '\u4f60\u57f7\u7d05\u65b9\uff08\u5148\u624b\uff09' : '\u4f60\u57f7\u9ed1\u65b9\uff08\u5f8c\u624b\uff09'}\uff0c${computerColor === RED_COLOR ? '\u96fb\u8166\u57f7\u7d05\u65b9' : '\u96fb\u8166\u57f7\u9ed1\u65b9'}\u3002\u96e3\u5ea6\uff1a${getAiLevelLabel()}\u3002`;
}

function updateSideButtons() {
    if (typeof document === 'undefined') {
        return;
    }

    const redButton = document.getElementById('side-red');
    const blackButton = document.getElementById('side-black');
    if (!redButton || !blackButton) {
        return;
    }

    redButton.classList.toggle('active', humanColor === RED_COLOR);
    blackButton.classList.toggle('active', humanColor === BLACK_COLOR);
}

function updateDifficultyButtons() {
    if (typeof document === 'undefined') {
        return;
    }

    const locked = isDifficultyLocked();
    for (const [levelKey] of Object.entries(AI_LEVELS)) {
        const button = document.getElementById(`level-${levelKey}`);
        if (!button) {
            continue;
        }

        button.classList.toggle('active', aiLevel === levelKey);
        button.disabled = locked;
        button.setAttribute('aria-disabled', locked ? 'true' : 'false');
    }
}

function getBoardKey(activeBoard, color) {
    return `${color}|${activeBoard.map(row => row.map(cell => cell || '__').join('')).join('/')}`;
}

function getPieceTransform(shiftX = 0, shiftY = 0) {
    const adjustedX = humanColor === BLACK_COLOR ? -shiftX : shiftX;
    const adjustedY = humanColor === BLACK_COLOR ? -shiftY : shiftY;
    const translate = `translate3d(calc(-50% + ${adjustedX}px), calc(-50% + ${adjustedY}px), 0)`;
    return humanColor === BLACK_COLOR ? `${translate} rotate(180deg)` : translate;
}

function shouldLockDifficulty(moveCount, thinking, active = true) {
    return Boolean(active && (moveCount > 0 || thinking));
}

function isDifficultyLocked() {
    return shouldLockDifficulty(moveSequence.length, aiThinking, gameActive);
}

function ensureAudioContext() {
    if (typeof window === 'undefined') {
        return null;
    }

    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) {
        return null;
    }

    if (!audioContext) {
        audioContext = new AudioCtor();
    }

    if (audioContext.state === 'suspended') {
        audioContext.resume().catch(() => {});
    }

    return audioContext;
}

function playTone(frequency, duration, type, gainValue, startAt = 0) {
    const context = ensureAudioContext();
    if (!context) {
        return;
    }

    const now = context.currentTime + startAt;
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(now);
    oscillator.stop(now + duration + 0.02);
}

function playMoveSound(move) {
    if (move.captured) {
        playTone(196, 0.14, 'triangle', 0.07);
        playTone(156, 0.18, 'square', 0.035, 0.03);
        return;
    }

    playTone(330, 0.08, 'triangle', 0.05);
    playTone(440, 0.06, 'sine', 0.02, 0.04);
}

function playCheckSound() {
    playTone(587, 0.12, 'sawtooth', 0.045);
    playTone(784, 0.18, 'triangle', 0.03, 0.05);
}

function playWinSound() {
    playTone(523, 0.12, 'triangle', 0.04);
    playTone(659, 0.14, 'triangle', 0.04, 0.08);
    playTone(784, 0.22, 'triangle', 0.05, 0.16);
}

function sameMove(left, right) {
    return Boolean(left) && Boolean(right) &&
        left.fromRow === right.fromRow &&
        left.fromCol === right.fromCol &&
        left.toRow === right.toRow &&
        left.toCol === right.toCol;
}

function createMove(activeBoard, fromRow, fromCol, toRow, toCol) {
    return {
        fromRow,
        fromCol,
        toRow,
        toCol,
        piece: activeBoard[fromRow][fromCol],
        captured: activeBoard[toRow][toCol] || ''
    };
}

function applyMoveToBoard(activeBoard, move) {
    const nextBoard = cloneBoard(activeBoard);
    nextBoard[move.toRow][move.toCol] = nextBoard[move.fromRow][move.fromCol];
    nextBoard[move.fromRow][move.fromCol] = '';
    return nextBoard;
}

function findGeneral(activeBoard, color) {
    const target = `${color}G`;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col] === target) {
                return { row, col };
            }
        }
    }
    return null;
}

function clearPathStraight(activeBoard, fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) {
        return false;
    }

    if (fromRow === toRow) {
        const step = fromCol < toCol ? 1 : -1;
        for (let col = fromCol + step; col !== toCol; col += step) {
            if (activeBoard[fromRow][col]) {
                return false;
            }
        }
        return true;
    }

    if (fromCol === toCol) {
        const step = fromRow < toRow ? 1 : -1;
        for (let row = fromRow + step; row !== toRow; row += step) {
            if (activeBoard[row][fromCol]) {
                return false;
            }
        }
        return true;
    }

    return false;
}

function countPiecesBetween(activeBoard, fromRow, fromCol, toRow, toCol) {
    if (fromRow === toRow && fromCol === toCol) {
        return 0;
    }

    let count = 0;

    if (fromRow === toRow) {
        const step = fromCol < toCol ? 1 : -1;
        for (let col = fromCol + step; col !== toCol; col += step) {
            if (activeBoard[fromRow][col]) {
                count++;
            }
        }
    } else if (fromCol === toCol) {
        const step = fromRow < toRow ? 1 : -1;
        for (let row = fromRow + step; row !== toRow; row += step) {
            if (activeBoard[row][fromCol]) {
                count++;
            }
        }
    }

    return count;
}

function getPseudoMoves(activeBoard, row, col) {
    const piece = activeBoard[row][col];
    if (!piece) {
        return [];
    }

    const color = piece[0];
    const type = piece[1];
    const moves = [];

    const maybeAddMove = (toRow, toCol) => {
        if (!isInsideBoard(toRow, toCol)) {
            return;
        }

        const target = activeBoard[toRow][toCol];
        if (!target || target[0] !== color) {
            moves.push(createMove(activeBoard, row, col, toRow, toCol));
        }
    };

    if (type === 'R') {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of directions) {
            let nextRow = row + dr;
            let nextCol = col + dc;
            while (isInsideBoard(nextRow, nextCol)) {
                const target = activeBoard[nextRow][nextCol];
                if (!target) {
                    moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                } else {
                    if (target[0] !== color) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    }
                    break;
                }
                nextRow += dr;
                nextCol += dc;
            }
        }
        return moves;
    }

    if (type === 'H') {
        const horseOffsets = [
            [2, 1, 1, 0],
            [2, -1, 1, 0],
            [-2, 1, -1, 0],
            [-2, -1, -1, 0],
            [1, 2, 0, 1],
            [-1, 2, 0, 1],
            [1, -2, 0, -1],
            [-1, -2, 0, -1]
        ];

        for (const [dr, dc, legRow, legCol] of horseOffsets) {
            const blockRow = row + legRow;
            const blockCol = col + legCol;
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsideBoard(toRow, toCol) && !activeBoard[blockRow][blockCol]) {
                maybeAddMove(toRow, toCol);
            }
        }

        return moves;
    }

    if (type === 'E') {
        const elephantOffsets = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
        for (const [dr, dc] of elephantOffsets) {
            const toRow = row + dr;
            const toCol = col + dc;
            const eyeRow = row + dr / 2;
            const eyeCol = col + dc / 2;

            if (!isInsideBoard(toRow, toCol) || activeBoard[eyeRow][eyeCol]) {
                continue;
            }
            if ((color === 'r' && toRow < 5) || (color === 'b' && toRow > 4)) {
                continue;
            }

            maybeAddMove(toRow, toCol);
        }
        return moves;
    }

    if (type === 'A') {
        const advisorOffsets = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
        for (const [dr, dc] of advisorOffsets) {
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsidePalace(color, toRow, toCol)) {
                maybeAddMove(toRow, toCol);
            }
        }
        return moves;
    }

    if (type === 'G') {
        const generalOffsets = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of generalOffsets) {
            const toRow = row + dr;
            const toCol = col + dc;
            if (isInsidePalace(color, toRow, toCol)) {
                maybeAddMove(toRow, toCol);
            }
        }

        const scanStep = color === 'r' ? -1 : 1;
        let scanRow = row + scanStep;
        while (scanRow >= 0 && scanRow < 10) {
            const target = activeBoard[scanRow][col];
            if (target) {
                if (target === `${otherColor(color)}G`) {
                    moves.push(createMove(activeBoard, row, col, scanRow, col));
                }
                break;
            }
            scanRow += scanStep;
        }
        return moves;
    }

    if (type === 'C') {
        const directions = [[1, 0], [-1, 0], [0, 1], [0, -1]];
        for (const [dr, dc] of directions) {
            let nextRow = row + dr;
            let nextCol = col + dc;
            let jumped = false;

            while (isInsideBoard(nextRow, nextCol)) {
                const target = activeBoard[nextRow][nextCol];
                if (!jumped) {
                    if (!target) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    } else {
                        jumped = true;
                    }
                } else if (target) {
                    if (target[0] !== color) {
                        moves.push(createMove(activeBoard, row, col, nextRow, nextCol));
                    }
                    break;
                }

                nextRow += dr;
                nextCol += dc;
            }
        }
        return moves;
    }

    if (type === 'S') {
        const forward = color === 'r' ? -1 : 1;
        maybeAddMove(row + forward, col);
        if (hasCrossedRiver(color, row)) {
            maybeAddMove(row, col - 1);
            maybeAddMove(row, col + 1);
        }
    }

    return moves;
}

function pieceThreatensSquare(activeBoard, fromRow, fromCol, targetRow, targetCol) {
    if (fromRow === targetRow && fromCol === targetCol) {
        return false;
    }

    const piece = activeBoard[fromRow][fromCol];
    if (!piece) {
        return false;
    }

    const color = piece[0];
    const type = piece[1];
    const deltaRow = targetRow - fromRow;
    const deltaCol = targetCol - fromCol;

    if (type === 'R') {
        return (fromRow === targetRow || fromCol === targetCol) &&
            clearPathStraight(activeBoard, fromRow, fromCol, targetRow, targetCol);
    }

    if (type === 'H') {
        const horsePatterns = [
            [2, 1, 1, 0],
            [2, -1, 1, 0],
            [-2, 1, -1, 0],
            [-2, -1, -1, 0],
            [1, 2, 0, 1],
            [-1, 2, 0, 1],
            [1, -2, 0, -1],
            [-1, -2, 0, -1]
        ];
        return horsePatterns.some(([dr, dc, legRow, legCol]) => {
            if (deltaRow !== dr || deltaCol !== dc) {
                return false;
            }
            return !activeBoard[fromRow + legRow][fromCol + legCol];
        });
    }

    if (type === 'E') {
        const onOwnSide = color === 'r' ? targetRow >= 5 : targetRow <= 4;
        if (!onOwnSide || Math.abs(deltaRow) !== 2 || Math.abs(deltaCol) !== 2) {
            return false;
        }
        return !activeBoard[fromRow + deltaRow / 2][fromCol + deltaCol / 2];
    }

    if (type === 'A') {
        return Math.abs(deltaRow) === 1 &&
            Math.abs(deltaCol) === 1 &&
            isInsidePalace(color, targetRow, targetCol);
    }

    if (type === 'G') {
        if (Math.abs(deltaRow) + Math.abs(deltaCol) === 1 && isInsidePalace(color, targetRow, targetCol)) {
            return true;
        }
        return fromCol === targetCol &&
            activeBoard[targetRow][targetCol] &&
            activeBoard[targetRow][targetCol][1] === 'G' &&
            clearPathStraight(activeBoard, fromRow, fromCol, targetRow, targetCol);
    }

    if (type === 'C') {
        return (fromRow === targetRow || fromCol === targetCol) &&
            countPiecesBetween(activeBoard, fromRow, fromCol, targetRow, targetCol) === 1;
    }

    if (type === 'S') {
        const forward = color === 'r' ? -1 : 1;
        if (deltaRow === forward && deltaCol === 0) {
            return true;
        }
        return hasCrossedRiver(color, fromRow) &&
            deltaRow === 0 &&
            Math.abs(deltaCol) === 1;
    }

    return false;
}

function isSquareAttacked(activeBoard, row, col, attackerColor) {
    for (let scanRow = 0; scanRow < 10; scanRow++) {
        for (let scanCol = 0; scanCol < 9; scanCol++) {
            const piece = activeBoard[scanRow][scanCol];
            if (piece && piece[0] === attackerColor) {
                if (pieceThreatensSquare(activeBoard, scanRow, scanCol, row, col)) {
                    return true;
                }
            }
        }
    }
    return false;
}

function getAttackerValues(activeBoard, row, col, attackerColor) {
    const values = [];

    for (let scanRow = 0; scanRow < 10; scanRow++) {
        for (let scanCol = 0; scanCol < 9; scanCol++) {
            const piece = activeBoard[scanRow][scanCol];
            if (!piece || piece[0] !== attackerColor) {
                continue;
            }

            if (pieceThreatensSquare(activeBoard, scanRow, scanCol, row, col)) {
                values.push(PIECE_VALUES[piece[1]]);
            }
        }
    }

    values.sort((left, right) => left - right);
    return values;
}

function getExposurePenalty(activeBoard, row, col, piece) {
    if (!piece || piece[1] === 'G') {
        return 0;
    }

    const color = piece[0];
    const opponent = otherColor(color);
    const attackers = getAttackerValues(activeBoard, row, col, opponent);
    if (attackers.length === 0) {
        return 0;
    }

    const defenders = getAttackerValues(activeBoard, row, col, color);
    const pieceValue = PIECE_VALUES[piece[1]];
    let penalty = 0;

    if (defenders.length === 0) {
        penalty -= Math.round(pieceValue * 0.34);
    } else {
        const leastAttacker = attackers[0];
        const leastDefender = defenders[0];
        if (leastAttacker < pieceValue && leastAttacker <= leastDefender) {
            penalty -= Math.round((pieceValue - leastAttacker) * 0.45);
        } else if (attackers.length > defenders.length) {
            penalty -= Math.min(36, 10 * (attackers.length - defenders.length));
        }
    }

    if (piece[1] === 'R' || piece[1] === 'C') {
        penalty -= 10;
    } else if (piece[1] === 'H') {
        penalty -= 6;
    }

    return penalty;
}

function isInCheck(activeBoard, color) {
    const general = findGeneral(activeBoard, color);
    if (!general) {
        return true;
    }
    return isSquareAttacked(activeBoard, general.row, general.col, otherColor(color));
}

function getLegalMovesForPiece(activeBoard, row, col) {
    const piece = activeBoard[row][col];
    if (!piece) {
        return [];
    }

    const color = piece[0];
    return getPseudoMoves(activeBoard, row, col).filter(move => {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        return !isInCheck(nextBoard, color);
    });
}

function getAllLegalMoves(activeBoard, color) {
    const allMoves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (piece && piece[0] === color) {
                allMoves.push(...getLegalMovesForPiece(activeBoard, row, col));
            }
        }
    }
    return allMoves;
}

function getCapturingMoves(activeBoard, color) {
    const tacticalMoves = [];
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (piece && piece[0] === color) {
                const legalMoves = getLegalMovesForPiece(activeBoard, row, col);
                for (const move of legalMoves) {
                    if (move.captured) {
                        tacticalMoves.push(move);
                    }
                }
            }
        }
    }
    return tacticalMoves;
}

function ensureEngineCore() {
    if (engineCore || !createEngineCoreFactory) {
        return engineCore;
    }

    engineCore = createEngineCoreFactory({
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
    });

    return engineCore;
}

function getSearchTimeBudget(activeBoard, legalMoves) {
    const levelConfig = AI_LEVELS[aiLevel] || AI_LEVELS[DEFAULT_AI_LEVEL];
    const pieceCount = countPieces(activeBoard);

    if (pieceCount >= 28 || legalMoves.length >= 34) {
        return levelConfig.opening;
    }

    if (pieceCount >= 18) {
        return levelConfig.middlegame;
    }

    return levelConfig.endgame;
}

function beginSearchBudget(activeBoard, legalMoves) {
    searchDeadline = Date.now() + getSearchTimeBudget(activeBoard, legalMoves);
    searchNodeCounter = 0;
    searchTimedOut = false;
}

function shouldAbortSearch() {
    if (searchTimedOut || !searchDeadline) {
        return searchTimedOut;
    }

    searchNodeCounter++;
    if (searchNodeCounter % SEARCH_TIME_CHECK_INTERVAL !== 0) {
        return false;
    }

    if (Date.now() >= searchDeadline) {
        searchTimedOut = true;
        return true;
    }

    return false;
}

function countPieceType(activeBoard, color, type) {
    let count = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (activeBoard[row][col] === `${color}${type}`) {
                count++;
            }
        }
    }

    return count;
}

function countPiecesBetweenOnFile(activeBoard, col, startRow, endRow) {
    let blockers = 0;
    const step = startRow < endRow ? 1 : -1;

    for (let row = startRow + step; row !== endRow; row += step) {
        if (activeBoard[row][col]) {
            blockers++;
        }
    }

    return blockers;
}

function getPositionBonus(piece, row, col, pieceCount) {
    const color = piece[0];
    const type = piece[1];
    const centerDistance = Math.abs(4 - col);

    if (type === 'S') {
        const progress = color === 'r' ? 9 - row : row;
        const progressWeight = pieceCount >= 28 ? 7 : pieceCount >= 24 ? 8 : pieceCount >= 18 ? 10 : 12;
        const riverBonus = pieceCount >= 24 ? 12 : pieceCount >= 18 ? 18 : 26;
        let bonus = progress * progressWeight;
        if (hasCrossedRiver(color, row)) {
            bonus += riverBonus;
        }
        bonus += Math.max(0, 10 - centerDistance * 2);
        return bonus;
    }

    if (type === 'H' || type === 'C') {
        return Math.max(0, 22 - centerDistance * 4);
    }

    if (type === 'R') {
        return Math.max(0, 18 - centerDistance * 3);
    }

    if (type === 'E' || type === 'A') {
        const safeRank = color === 'r' ? row - 7 : 2 - row;
        return 12 - Math.abs(safeRank) * 4;
    }

    if (type === 'G') {
        return col === 4 ? 16 : 0;
    }

    return 0;
}

function evaluateKingSafety(activeBoard, color, pieceCount) {
    const general = findGeneral(activeBoard, color);
    if (!general) {
        return -2000;
    }

    const opponent = otherColor(color);
    const homeRow = color === RED_COLOR ? 9 : 0;
    const forward = color === RED_COLOR ? -1 : 1;
    const advisors = countPieceType(activeBoard, color, 'A');
    const elephants = countPieceType(activeBoard, color, 'E');
    let score = advisors * 16 + elephants * 14;

    if (general.row !== homeRow) {
        score -= 46;
    }
    if (general.col !== 4) {
        score -= 14;
    }

    const frontRow = general.row + forward;
    if (isInsideBoard(frontRow, general.col)) {
        if (!activeBoard[frontRow][general.col]) {
            score -= 18;
        }
    }

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece || piece[0] !== opponent) {
                continue;
            }

            const type = piece[1];
            const advanced = opponent === RED_COLOR ? row <= 5 : row >= 4;
            if (type === 'H' && advanced && Math.abs(row - general.row) <= 3 && Math.abs(col - general.col) <= 2) {
                score -= 14;
            }

            if (col === general.col) {
                const blockers = countPiecesBetweenOnFile(activeBoard, col, row, general.row);
                if (type === 'R' && blockers === 0) {
                    score -= 72;
                }
                if (type === 'C' && blockers === 1) {
                    score -= 64;
                }
            }

            if (advanced && Math.abs(col - general.col) <= 1) {
                if (type === 'R') {
                    score -= 22;
                } else if (type === 'C') {
                    score -= 16;
                }
            }
        }
    }

    if (pieceCount >= 24 && advisors + elephants <= 2) {
        score -= 20;
    }

    return score;
}

function evaluateBoard(activeBoard) {
    const pieceCount = countPieces(activeBoard);
    let score = 0;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece) {
                continue;
            }

            const baseScore = PIECE_VALUES[piece[1]] + getPositionBonus(piece, row, col, pieceCount);
            const mobility = getPseudoMoves(activeBoard, row, col).length * MOBILITY_WEIGHTS[piece[1]];
            const sign = piece[0] === computerColor ? 1 : -1;

            score += sign * (baseScore + mobility);

            if (piece[1] === 'S' && hasCrossedRiver(piece[0], row)) {
                score += sign * 18;
            }
        }
    }

    if (isInCheck(activeBoard, humanColor)) {
        score += 55;
    }
    if (isInCheck(activeBoard, computerColor)) {
        score -= 55;
    }

    score += evaluateOpeningDevelopment(activeBoard, computerColor);
    score -= evaluateOpeningDevelopment(activeBoard, humanColor);
    score += evaluateKingSafety(activeBoard, computerColor, pieceCount);
    score -= evaluateKingSafety(activeBoard, humanColor, pieceCount);

    return score;
}

function evaluateForColor(activeBoard, color) {
    const score = evaluateBoard(activeBoard);
    return color === computerColor ? score : -score;
}

function getSearchMoveLimit(pieceCount, depth, tacticalOnly = false) {
    if (tacticalOnly) {
        return pieceCount >= 24 ? 10 : 14;
    }

    if (pieceCount >= 28) {
        return depth >= 3 ? 13 : 16;
    }

    if (pieceCount >= 22) {
        return depth >= 4 ? 15 : 18;
    }

    if (pieceCount >= 16) {
        return depth >= 4 ? 16 : 22;
    }

    return 28;
}

function countUndevelopedMajors(activeBoard, color) {
    const homeRow = color === RED_COLOR ? 9 : 0;
    let count = 0;

    if (activeBoard[homeRow][0] === `${color}R`) {
        count++;
    }
    if (activeBoard[homeRow][8] === `${color}R`) {
        count++;
    }
    if (activeBoard[homeRow][1] === `${color}H`) {
        count++;
    }
    if (activeBoard[homeRow][7] === `${color}H`) {
        count++;
    }

    return count;
}

function countUndevelopedRooks(activeBoard, color) {
    const homeRow = color === RED_COLOR ? 9 : 0;
    let count = 0;

    if (activeBoard[homeRow][0] === `${color}R`) {
        count++;
    }
    if (activeBoard[homeRow][8] === `${color}R`) {
        count++;
    }

    return count;
}

function countDevelopedHorses(activeBoard, color) {
    const homeRow = color === RED_COLOR ? 9 : 0;
    let count = 0;

    if (activeBoard[homeRow][1] !== `${color}H`) {
        count++;
    }
    if (activeBoard[homeRow][7] !== `${color}H`) {
        count++;
    }

    return count;
}

function getRookDeploymentValue(activeBoard, color, row, col) {
    const homeRow = color === RED_COLOR ? 9 : 0;
    const enemyGeneral = findGeneral(activeBoard, otherColor(color));
    let score = row === homeRow ? 8 : 18;

    if (col === 4) {
        score += 10;
    } else if (Math.abs(col - 4) === 1) {
        score += 6;
    }

    if (enemyGeneral) {
        const blockers = countPiecesBetweenOnFile(activeBoard, col, row, enemyGeneral.row);
        if (col === enemyGeneral.col) {
            score += blockers === 0 ? 26 : blockers === 1 ? 12 : 0;
        }
        score += Math.max(0, 3 - Math.min(blockers, 3)) * 5;
    }

    return score;
}

function hasHomeRookDevelopment(activeBoard, color) {
    const homeRow = color === RED_COLOR ? 9 : 0;

    for (const rookCol of [0, 8]) {
        if (activeBoard[homeRow][rookCol] !== `${color}R`) {
            continue;
        }

        const rookMoves = getLegalMovesForPiece(activeBoard, homeRow, rookCol);
        if (rookMoves.some(move => !move.captured)) {
            return true;
        }
    }

    return false;
}

function evaluateOpeningDevelopment(activeBoard, color) {
    const pieceCount = countPieces(activeBoard);
    if (pieceCount < 24) {
        return 0;
    }

    const homeRow = color === RED_COLOR ? 9 : 0;
    const soldierRow = color === RED_COLOR ? 6 : 3;
    const cannonRow = color === RED_COLOR ? 7 : 2;
    const naturalHorseRow = color === RED_COLOR ? 7 : 2;
    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    const undevelopedRooks = countUndevelopedRooks(activeBoard, color);
    const developedHorses = countDevelopedHorses(activeBoard, color);
    let score = -undevelopedMajors * 14;

    if (undevelopedRooks === 2 && developedHorses === 2) {
        score -= 34;
    } else if (undevelopedRooks === 1 && developedHorses === 2) {
        score -= 12;
    }

    const general = findGeneral(activeBoard, color);
    if (general && (general.row !== homeRow || general.col !== 4)) {
        score -= 44;
    }

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = activeBoard[row][col];
            if (!piece || piece[0] !== color) {
                continue;
            }

            if (piece[1] === 'H') {
                if (row === naturalHorseRow && (col === 2 || col === 6)) {
                    score += 22;
                } else if (row !== homeRow) {
                    score += 6;
                }
                if (Math.abs(col - 4) <= 1 && Math.abs(row - homeRow) === 1) {
                    score -= 52;
                }
                if ((col === 0 || col === 8) && row !== homeRow) {
                    score -= 24;
                }
            }
            if (piece[1] === 'H' && row === homeRow && col !== 1 && col !== 7) {
                score -= 26;
            }

            if (piece[1] === 'R' && !(row === homeRow && (col === 0 || col === 8))) {
                score += getRookDeploymentValue(activeBoard, color, row, col);
            }
            if (piece[1] === 'R' && undevelopedRooks === 2 && developedHorses === 2 && row === homeRow) {
                score -= 18;
            }

            if (piece[1] === 'C' && row === cannonRow && col === 4) {
                score += 12;
            }
            if (piece[1] === 'C' && undevelopedRooks >= 1 && developedHorses === 2 && row === cannonRow && Math.abs(col - 4) >= 2) {
                score -= 18;
            }
            if (piece[1] === 'C' && undevelopedRooks >= 1) {
                const edgeDistance = Math.abs(col - 4);
                if (edgeDistance >= 4) {
                    score -= undevelopedRooks === 2 ? 42 : 24;
                } else if (edgeDistance >= 3 && row !== cannonRow) {
                    score -= undevelopedRooks === 2 ? 26 : 14;
                }
            }

            if ((piece[1] === 'A' || piece[1] === 'E') && undevelopedMajors >= 2 && row !== homeRow) {
                score -= 28;
            }
            if ((piece[1] === 'A' || piece[1] === 'E') && undevelopedRooks >= 1 && developedHorses === 2 && row !== homeRow) {
                score -= 24;
            }

            if (piece[1] === 'C' && undevelopedMajors >= 2) {
                const cannonAdvanced = color === RED_COLOR ? row <= 4 : row >= 5;
                if (cannonAdvanced) {
                    score -= 50;
                }
            }

            if (piece[1] === 'C' && row !== cannonRow && undevelopedRooks >= 1) {
                const edgeDistance = Math.abs(col - 4);
                score -= 16 + edgeDistance * 6;
                if (undevelopedRooks === 2 && developedHorses >= 1 && col !== 4) {
                    score -= 18;
                }
            }

            if (piece[1] === 'S' && row !== soldierRow) {
                const advance = Math.abs(row - soldierRow);
                if (col === 4) {
                    score += undevelopedMajors >= 3 ? -10 - advance * 4 : 2;
                } else {
                    score -= undevelopedMajors >= 2 ? 18 + advance * 8 : 6 + advance * 3;
                }

                if ((col === 0 || col === 8) && undevelopedMajors >= 2) {
                    score -= 12;
                }
            }

            if (piece[1] === 'C' && row !== cannonRow && undevelopedMajors >= 2) {
                score -= 14;
            }

            if (undevelopedRooks === 2 && developedHorses === 2) {
                if (piece[1] === 'S' && row !== soldierRow) {
                    score -= col === 4 ? 10 : 18;
                }
                if ((piece[1] === 'H' || piece[1] === 'C') && !((piece[1] === 'H' && row === naturalHorseRow && (col === 2 || col === 6)))) {
                    score -= 10;
                }
                if ((piece[1] === 'A' || piece[1] === 'E') && row !== homeRow) {
                    score -= 22;
                }
            }
        }
    }

    return score;
}

function getOpeningMoveBonus(activeBoard, move) {
    if (countPieces(activeBoard) < 24) {
        return 0;
    }

    const color = move.piece[0];
    const homeRow = color === RED_COLOR ? 9 : 0;
    const soldierRow = color === RED_COLOR ? 6 : 3;
    const cannonRow = color === RED_COLOR ? 7 : 2;
    const naturalHorseRow = color === RED_COLOR ? 7 : 2;
    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    const undevelopedRooks = countUndevelopedRooks(activeBoard, color);
    const developedHorses = countDevelopedHorses(activeBoard, color);
    let score = 0;

    if (move.piece[1] === 'H' && move.fromRow === homeRow) {
        score += 30;
    }
    if (move.piece[1] === 'H' && !move.captured) {
        const forward = color === RED_COLOR ? move.toRow < move.fromRow : move.toRow > move.fromRow;
        if (!forward && move.fromRow !== homeRow) {
            score -= undevelopedMajors >= 2 ? 46 : 20;
        }
        if (move.toRow === homeRow && move.toCol !== move.fromCol) {
            score -= 28;
        }
        if (move.toRow === homeRow && (move.toCol === 1 || move.toCol === 7) && undevelopedRooks >= 1) {
            score -= undevelopedRooks === 2 ? 58 : 34;
        }
        if ((move.toCol === 0 || move.toCol === 8) && move.toRow !== homeRow && undevelopedRooks >= 1) {
            score -= undevelopedRooks === 2 ? 46 : 24;
        }
        if (move.fromRow === naturalHorseRow && (move.fromCol === 2 || move.fromCol === 6) &&
            Math.abs(move.toCol - 4) <= 1 && Math.abs(move.toRow - homeRow) === 1) {
            score -= undevelopedRooks >= 1 ? 88 : 56;
        }
    }

    if (move.piece[1] === 'R' && move.fromRow === homeRow) {
        score += 20 + getRookDeploymentValue(activeBoard, color, move.toRow, move.toCol);
        if (undevelopedRooks === 2 && developedHorses === 2) {
            score += move.toRow === homeRow ? 78 : 40;
        }
    }

    if (move.piece[1] === 'C' && move.fromRow === cannonRow && move.toRow === cannonRow && move.toCol === 4) {
        score += 24;
    }
    if (move.piece[1] === 'C' && undevelopedMajors >= 2) {
        const cannonAdvanced = color === RED_COLOR ? move.toRow <= 4 : move.toRow >= 5;
        if (cannonAdvanced) {
            score -= move.captured ? 64 : 54;
        }
        if (!move.captured && Math.abs(move.toRow - move.fromRow) >= 3) {
            score -= 18;
        }
    }
    if (move.piece[1] === 'C' && move.fromRow === cannonRow && move.toRow === cannonRow && move.toCol !== 4) {
        const edgeDistance = Math.abs(4 - move.toCol);
        if (edgeDistance >= 3 && undevelopedRooks >= 1) {
            score -= 26 + edgeDistance * 6;
        }
        if (undevelopedRooks === 2 && developedHorses < 2) {
            score -= 18;
        }
    }
    if (move.piece[1] === 'C' && move.fromRow === cannonRow && move.toRow !== cannonRow && move.toCol !== 4 && undevelopedRooks >= 1 && !move.captured) {
        score -= undevelopedRooks === 2 ? 34 : 22;
    }
    if (move.piece[1] === 'C' && !move.captured && undevelopedRooks >= 1) {
        const edgeDistance = Math.abs(4 - move.toCol);
        if (edgeDistance >= 4) {
            score -= undevelopedRooks === 2 ? 72 : 44;
        } else if (move.fromRow === cannonRow && move.toCol !== 4 && move.toRow !== cannonRow) {
            score -= undevelopedRooks === 2 ? 36 : 20;
        }
    }
    if (undevelopedRooks >= 1 && developedHorses === 2 && !move.captured) {
        if (move.piece[1] === 'R' && move.fromRow === homeRow) {
            score += move.toRow === homeRow ? 52 : 28;
        } else if (move.piece[1] === 'A' || move.piece[1] === 'E') {
            score -= undevelopedRooks === 2 ? 68 : 36;
        } else if (move.piece[1] === 'H' || move.piece[1] === 'C') {
            score -= undevelopedRooks === 2 ? 58 : 28;
        } else if (move.piece[1] === 'S') {
            score -= move.fromCol === 4 ? 24 : 42;
        }
    }

    if (move.piece[1] === 'S') {
        if (move.fromRow === soldierRow && move.fromCol === 4) {
            score += undevelopedMajors >= 3 ? -12 : 6;
        } else if (move.fromRow === soldierRow) {
            score -= undevelopedMajors >= 3 ? 28 : 16;
        } else {
            score -= undevelopedMajors >= 2 ? 34 : 14;
        }

        if (undevelopedRooks === 2 && developedHorses === 2) {
            score -= move.fromCol === 4 ? 18 : 32;
        }
    }

    if (move.piece[1] === 'A' || move.piece[1] === 'E') {
        if (undevelopedMajors >= 2) {
            score -= 42;
        }
        if (!move.captured && undevelopedRooks >= 1 && developedHorses >= 2) {
            score -= move.fromRow === homeRow ? 26 : 54;
        }
    }

    if (move.piece[1] === 'G') {
        score -= 60;
    }

    if (move.piece[1] === 'C' && !move.captured && move.fromRow === cannonRow && move.toRow !== cannonRow && undevelopedMajors >= 2) {
        score -= 30;
    }

    if (undevelopedRooks === 2 && developedHorses === 2 && !move.captured) {
        if (move.piece[1] === 'H') {
            score -= 34;
        }
        if (move.piece[1] === 'C') {
            score -= 26;
        }
    }

    return score;
}

function getSideHistoryMoves(historySequence, color) {
    return historySequence
        .filter((_, index) => (index % 2 === 0) === (color === RED_COLOR))
        .map(parseMoveKey);
}

function getRootOpeningAdjustment(activeBoard, move, color, historySequence, openingContext = null) {
    const pieceCount = countPieces(activeBoard);
    if (pieceCount < 24 || !historySequence || historySequence.length < 2) {
        return 0;
    }

    const recentSideMoves = getSideHistoryMoves(historySequence, color);
    if (recentSideMoves.length === 0) {
        return 0;
    }

    const undevelopedMajors = countUndevelopedMajors(activeBoard, color);
    const undevelopedRooks = countUndevelopedRooks(activeBoard, color);
    const developedHorses = countDevelopedHorses(activeBoard, color);
    const homeRow = color === RED_COLOR ? 9 : 0;
    const cannonRow = color === RED_COLOR ? 7 : 2;
    const rookDevelopmentAvailable = openingContext
        ? openingContext.rookDevelopmentAvailable
        : undevelopedRooks >= 1 && hasHomeRookDevelopment(activeBoard, color);
    const lastOwnMove = recentSideMoves[recentSideMoves.length - 1];
    const previousOwnMove = recentSideMoves.length > 1 ? recentSideMoves[recentSideMoves.length - 2] : null;
    let score = 0;

    const samePieceAsLastMove = lastOwnMove.toRow === move.fromRow && lastOwnMove.toCol === move.fromCol;
    const samePieceAsPreviousMove = previousOwnMove &&
        previousOwnMove.toRow === move.fromRow &&
        previousOwnMove.toCol === move.fromCol;

    if (!move.captured && samePieceAsLastMove) {
        if (move.piece[1] === 'H' || move.piece[1] === 'C') {
            score -= undevelopedMajors >= 2 ? 58 : 32;
        } else if (move.piece[1] === 'R') {
            score -= undevelopedMajors >= 2 ? 34 : 18;
        } else if (move.piece[1] === 'S') {
            score -= undevelopedMajors >= 2 ? 46 : 24;
        } else if (move.piece[1] === 'A' || move.piece[1] === 'E') {
            score -= undevelopedMajors >= 2 ? 54 : 28;
        }

        if (isExactReverseMove(lastOwnMove, move)) {
            if (move.piece[1] === 'H' || move.piece[1] === 'C') {
                score -= undevelopedRooks >= 1 ? 76 : 48;
            } else {
                score -= move.piece[1] === 'A' || move.piece[1] === 'E' ? 64 : 42;
            }
        }
    }

    if (!move.captured && samePieceAsPreviousMove) {
        if (move.piece[1] === 'H' || move.piece[1] === 'C') {
            score -= undevelopedMajors >= 2 ? 24 : 12;
        } else if (move.piece[1] === 'R') {
            score -= 12;
        } else if (move.piece[1] === 'S') {
            score -= undevelopedMajors >= 2 ? 18 : 8;
        } else if (move.piece[1] === 'A' || move.piece[1] === 'E') {
            score -= undevelopedMajors >= 2 ? 22 : 10;
        }
    }

    if (!move.captured && move.piece[1] === 'C' && recentSideMoves.length >= 2) {
        const lastMovedPiece = activeBoard[lastOwnMove.toRow][lastOwnMove.toCol];
        if (lastMovedPiece === `${color}C` && samePieceAsLastMove) {
            score -= 22;
        }
    }

    if (!move.captured && move.piece[1] === 'C' && undevelopedRooks >= 1) {
        const edgeDistance = Math.abs(4 - move.toCol);
        if (edgeDistance >= 4) {
            score -= undevelopedRooks === 2 ? 88 : 54;
        } else if (move.fromRow === cannonRow && move.toCol !== 4 && move.toRow !== cannonRow) {
            score -= undevelopedRooks === 2 ? 52 : 28;
        }
    }

    if (undevelopedRooks === 2 && developedHorses === 2 && !move.captured) {
        if (move.piece[1] === 'R' && move.fromRow === homeRow) {
            score += move.toRow === move.fromRow ? 72 : 32;
            score += getRookDeploymentValue(activeBoard, color, move.toRow, move.toCol);
        }
        if (move.piece[1] === 'S') {
            score -= move.fromCol === 4 ? 32 : 52;
        }
        if (move.piece[1] === 'H' || move.piece[1] === 'C') {
            score -= 58;
        }
        if (move.piece[1] === 'A' || move.piece[1] === 'E') {
            score -= 72;
        }
    }

    if (rookDevelopmentAvailable && !move.captured) {
        if (move.piece[1] === 'R' && move.fromRow === homeRow) {
            score += undevelopedRooks === 2 ? 34 : 18;
        } else if (undevelopedRooks === 2 && developedHorses === 2) {
            score -= move.piece[1] === 'S' ? 30 : 46;
        } else if (undevelopedRooks === 1 && (move.piece[1] === 'H' || move.piece[1] === 'C' || move.piece[1] === 'A' || move.piece[1] === 'E')) {
            score -= 18;
        }
    }

    if (!move.captured && move.piece[1] === 'H' && move.toRow === homeRow && undevelopedRooks >= 1) {
        score -= undevelopedRooks === 2 ? 66 : 34;
    }
    if (!move.captured &&
        move.piece[1] === 'H' &&
        move.fromRow === (color === RED_COLOR ? 7 : 2) &&
        (move.fromCol === 2 || move.fromCol === 6) &&
        Math.abs(move.toCol - 4) <= 1 &&
        Math.abs(move.toRow - homeRow) === 1 &&
        undevelopedRooks >= 1) {
        score -= undevelopedRooks === 2 ? 74 : 42;
    }

    return score;
}

function getRootTacticalAdjustment(activeBoard, nextBoard, move, color) {
    const opponent = otherColor(color);
    const capturedValue = move.captured ? PIECE_VALUES[move.captured[1]] : 0;
    const moverValue = PIECE_VALUES[move.piece[1]];
    const attacked = isSquareAttacked(nextBoard, move.toRow, move.toCol, opponent);
    const defended = isSquareAttacked(nextBoard, move.toRow, move.toCol, color);
    const attackerValues = getAttackerValues(nextBoard, move.toRow, move.toCol, opponent);
    const defenderValues = getAttackerValues(nextBoard, move.toRow, move.toCol, color);
    let score = 0;

    if (isInCheck(nextBoard, opponent)) {
        score += 42;
    }

    if (attacked) {
        if (!defended) {
            if (!move.captured) {
                score -= Math.round(moverValue * 0.34);
            } else if (capturedValue < moverValue) {
                score -= Math.round((moverValue - capturedValue) * 0.5);
            } else {
                score -= 18;
            }
        } else if (!move.captured && move.piece[1] === 'R') {
            score -= 20;
        }
    }

    if (attackerValues.length > 0) {
        if (defenderValues.length === 0) {
            score -= Math.round(moverValue * 0.28);
        } else {
            const leastAttacker = attackerValues[0];
            const leastDefender = defenderValues[0];
            if (leastAttacker < moverValue && leastAttacker <= leastDefender) {
                score -= Math.round((moverValue - leastAttacker) * 0.5);
            }
        }

        if (move.captured && capturedValue < attackerValues[0]) {
            score -= Math.round((attackerValues[0] - capturedValue) * 0.25);
        }
    }

    if (move.piece[1] === 'R' || move.piece[1] === 'H' || move.piece[1] === 'C') {
        const fromAttacked = isSquareAttacked(activeBoard, move.fromRow, move.fromCol, opponent);
        if (!move.captured && !fromAttacked && attacked && !defended) {
            score -= 28;
        }
    }

    return score;
}

function scoreMove(activeBoard, move, ttMove) {
    if (sameMove(move, ttMove)) {
        return 10000000;
    }

    const pieceCount = countPieces(activeBoard);
    const capturedValue = move.captured ? PIECE_VALUES[move.captured[1]] : 0;
    const moverValue = PIECE_VALUES[move.piece[1]];
    let score = capturedValue * 14 - moverValue;

    if (move.captured && move.captured[1] === 'G') {
        score += MATE_SCORE;
    }
    if (move.piece[1] === 'S') {
        score += pieceCount < 20 ? 10 : 4;
    }
    if (move.piece[1] === 'R') {
        score += 10;
    }
    score += Math.max(0, 5 - Math.abs(4 - move.toCol)) * 6;
    score += getOpeningMoveBonus(activeBoard, move);
    return score;
}

function orderMoves(activeBoard, moves, ttMove) {
    return moves
        .slice()
        .sort((left, right) => scoreMove(activeBoard, right, ttMove) - scoreMove(activeBoard, left, ttMove));
}

function isPerpetualCheckViolation(activeBoard, move, color, history = positionHistory) {
    if (!history || history.length < 5) {
        return false;
    }

    const nextBoard = applyMoveToBoard(activeBoard, move);
    const opponent = otherColor(color);
    if (!isInCheck(nextBoard, opponent)) {
        return false;
    }

    const nextKey = getBoardKey(nextBoard, opponent);
    return repeatsRecentCyclePosition(nextKey, history);
}

function getThreatenedTargetKeys(activeBoard, row, col) {
    const piece = activeBoard[row][col];
    if (!piece) {
        return [];
    }

    const color = piece[0];
    const targets = [];

    for (let targetRow = 0; targetRow < 10; targetRow++) {
        for (let targetCol = 0; targetCol < 9; targetCol++) {
            const target = activeBoard[targetRow][targetCol];
            if (!target || target[0] === color || target[1] === 'G') {
                continue;
            }

            if (pieceThreatensSquare(activeBoard, row, col, targetRow, targetCol)) {
                targets.push(`${targetRow},${targetCol}`);
            }
        }
    }

    return targets;
}

function isExactReverseMove(previousMove, move) {
    return previousMove &&
        previousMove.fromRow === move.toRow &&
        previousMove.fromCol === move.toCol &&
        previousMove.toRow === move.fromRow &&
        previousMove.toCol === move.fromCol;
}

function repeatsRecentCyclePosition(nextKey, history = positionHistory) {
    return Boolean(history) &&
        history.length >= 5 &&
        nextKey === history[history.length - 4];
}

function isPerpetualChaseViolation(activeBoard, move, color, history = positionHistory, historySequence = moveSequence) {
    if (!history || history.length < 5 || !historySequence || historySequence.length < 2 || move.captured) {
        return false;
    }

    const nextBoard = applyMoveToBoard(activeBoard, move);
    const opponent = otherColor(color);
    const nextKey = getBoardKey(nextBoard, opponent);
    if (!repeatsRecentCyclePosition(nextKey, history)) {
        return false;
    }

    const sideMoves = historySequence.filter((_, index) => (index % 2 === 0) === (color === RED_COLOR));
    if (sideMoves.length === 0) {
        return false;
    }

    const previousMove = parseMoveKey(sideMoves[sideMoves.length - 1]);
    if (!isExactReverseMove(previousMove, move)) {
        return false;
    }

    const currentTargets = getThreatenedTargetKeys(nextBoard, move.toRow, move.toCol);
    if (currentTargets.length > 0) {
        return true;
    }
    return false;
}

function filterPlayableMoves(activeBoard, color, moves, history = positionHistory, historySequence = moveSequence) {
    return moves.filter(move =>
        !isPerpetualCheckViolation(activeBoard, move, color, history) &&
        !isPerpetualChaseViolation(activeBoard, move, color, history, historySequence)
    );
}

function findOpeningBookMove(activeBoard, color, historySequence) {
    const legalMoves = getAllLegalMoves(activeBoard, color);
    const legalByKey = new Map(legalMoves.map(move => [getMoveKey(move), move]));
    const directCandidates = OPENING_BOOK[getOpeningBookKey(color, historySequence)] || [];

    for (const candidate of directCandidates) {
        const key = getMoveKey(candidate);
        if (legalByKey.has(key)) {
            return legalByKey.get(key);
        }
    }

    const mirroredSequence = historySequence.map(mirrorMoveKey);
    const mirroredCandidates = OPENING_BOOK[getOpeningBookKey(color, mirroredSequence)] || [];

    for (const candidate of mirroredCandidates) {
        const mirroredCandidate = mirrorMoveDescriptor(candidate);
        const key = getMoveKey(mirroredCandidate);
        if (legalByKey.has(key)) {
            return legalByKey.get(key);
        }
    }

    return null;
}

function quiescence(activeBoard, color, alpha, beta, depth) {
    const standPat = evaluateForColor(activeBoard, color);
    if (shouldAbortSearch()) {
        return { score: standPat, aborted: true };
    }
    if (standPat >= beta || depth === 0) {
        return { score: standPat };
    }

    if (standPat > alpha) {
        alpha = standPat;
    }

    const inCheck = isInCheck(activeBoard, color);
    const tacticalMoves = orderMoves(
        activeBoard,
        getAllLegalMoves(activeBoard, color).filter(move => inCheck || move.captured)
    ).slice(0, getSearchMoveLimit(countPieces(activeBoard), depth, true));

    if (tacticalMoves.length === 0) {
        return {
            score: inCheck ? -MATE_SCORE - depth : standPat
        };
    }

    let bestScore = standPat;

    for (const move of tacticalMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        const result = quiescence(nextBoard, otherColor(color), -beta, -alpha, depth - 1);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
        }
        if (score > alpha) {
            alpha = score;
        }
        if (alpha >= beta) {
            break;
        }
        if (result.aborted) {
            return { score: bestScore, aborted: true };
        }
    }

    return { score: bestScore };
}

function negamax(activeBoard, color, depth, alpha, beta) {
    const originalAlpha = alpha;
    const redGeneral = findGeneral(activeBoard, RED_COLOR);
    const blackGeneral = findGeneral(activeBoard, BLACK_COLOR);
    if (!redGeneral) {
        return { score: color === BLACK_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }
    if (!blackGeneral) {
        return { score: color === RED_COLOR ? MATE_SCORE + depth : -MATE_SCORE - depth };
    }
    if (shouldAbortSearch()) {
        return { score: evaluateForColor(activeBoard, color), aborted: true };
    }

    const ttKey = getBoardKey(activeBoard, color);
    const cached = transpositionTable.get(ttKey);
    if (cached && cached.depth >= depth) {
        if (cached.flag === 'exact') {
            return { score: cached.score, bestMove: cached.bestMove };
        }
        if (cached.flag === 'lower') {
            alpha = Math.max(alpha, cached.score);
        } else if (cached.flag === 'upper') {
            beta = Math.min(beta, cached.score);
        }
        if (alpha >= beta) {
            return { score: cached.score, bestMove: cached.bestMove };
        }
    }

    if (depth === 0) {
        return quiescence(activeBoard, color, alpha, beta, QUIESCENCE_DEPTH);
    }

    const legalMoves = orderMoves(activeBoard, getAllLegalMoves(activeBoard, color), cached?.bestMove);
    if (legalMoves.length === 0) {
        return { score: isInCheck(activeBoard, color) ? -MATE_SCORE - depth : -3000 - depth };
    }

    const pieceCount = countPieces(activeBoard);
    const candidateMoves = legalMoves.slice(0, getSearchMoveLimit(pieceCount, depth));
    let bestMove = candidateMoves[0];
    let bestScore = -Infinity;

    for (const move of candidateMoves) {
        const nextBoard = applyMoveToBoard(activeBoard, move);
        const result = negamax(nextBoard, otherColor(color), depth - 1, -beta, -alpha);
        const score = -result.score;

        if (score > bestScore) {
            bestScore = score;
            bestMove = move;
        }
        if (score > alpha) {
            alpha = score;
        }
        if (alpha >= beta) {
            break;
        }
        if (result.aborted) {
            return {
                score: bestScore === -Infinity ? score : bestScore,
                bestMove,
                aborted: true
            };
        }
    }

    let flag = 'exact';
    if (bestScore <= originalAlpha) {
        flag = 'upper';
    } else if (bestScore >= beta) {
        flag = 'lower';
    }

    transpositionTable.set(ttKey, {
        depth,
        score: bestScore,
        bestMove,
        flag
    });

    return { score: bestScore, bestMove };
}

function chooseSearchDepth(activeBoard, legalMoves) {
    const pieceCount = countPieces(activeBoard);

    if (pieceCount >= 28 || legalMoves.length >= 34) {
        return 4;
    }

    if (pieceCount >= 18) {
        return 5;
    }

    return 6;
}

function getRootCandidateLimit(pieceCount, legalMoveCount) {
    if (pieceCount >= 24) {
        return Math.min(8, legalMoveCount);
    }

    if (pieceCount >= 20) {
        return Math.min(6, legalMoveCount);
    }

    if (pieceCount >= 16) {
        return Math.min(4, legalMoveCount);
    }

    return legalMoveCount;
}

function getFallbackMove(activeBoard, color, historySequence = moveSequence) {
    const engine = ensureEngineCore();
    if (engine) {
        return engine.pickFallbackMove(
            cloneBoard(activeBoard),
            color,
            cloneMoveSequence(historySequence),
            clonePositionHistory(positionHistory)
        );
    }

    const legalMoves = filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionHistory, historySequence);
    return legalMoves[0] || null;
}

function searchRootEntries(rootEntries, color, depth) {
    let bestMove = rootEntries[0]?.move || null;
    let bestScore = -Infinity;

    for (const entry of rootEntries) {
        const result = negamax(entry.nextBoard, otherColor(color), depth - 1, -Infinity, Infinity);
        const score = -result.score + entry.adjustment;

        if (score > bestScore) {
            bestScore = score;
            bestMove = entry.move;
        }

        if (result.aborted) {
            return { bestMove, bestScore, aborted: true };
        }
    }

    return { bestMove, bestScore };
}

function applyPracticalOpeningChoice(activeBoard, color, legalMoves, candidateMove) {
    if (!candidateMove || countPieces(activeBoard) < 24 || candidateMove.captured || candidateMove.piece[1] === 'R') {
        return candidateMove;
    }

    const undevelopedRooks = countUndevelopedRooks(activeBoard, color);
    const developedHorses = countDevelopedHorses(activeBoard, color);
    const homeRow = color === RED_COLOR ? 9 : 0;
    const naturalHorseRow = color === RED_COLOR ? 7 : 2;
    if (undevelopedRooks === 0 || developedHorses < 2) {
        return candidateMove;
    }

    const rookMoves = legalMoves
        .filter(move => move.piece[1] === 'R' && move.fromRow === homeRow && !move.captured)
        .sort((left, right) => scoreMove(activeBoard, right) - scoreMove(activeBoard, left));

    if (rookMoves.length === 0) {
        return candidateMove;
    }

    if (candidateMove.piece[1] === 'S' && (candidateMove.fromCol === 0 || candidateMove.fromCol === 8)) {
        return rookMoves[0];
    }
    if (candidateMove.piece[1] === 'C' &&
        !candidateMove.captured &&
        candidateMove.fromRow === (color === RED_COLOR ? 7 : 2)) {
        return rookMoves[0];
    }
    if ((candidateMove.piece[1] === 'A' || candidateMove.piece[1] === 'E') && !candidateMove.captured) {
        return rookMoves[0];
    }
    if (candidateMove.piece[1] === 'H' &&
        candidateMove.fromRow === naturalHorseRow &&
        (candidateMove.fromCol === 2 || candidateMove.fromCol === 6)) {
        return rookMoves[0];
    }

    return candidateMove;
}

function disposeAiWorker() {
    if (aiWorker) {
        aiWorker.terminate();
        aiWorker = null;
    }
}

function cancelPendingAiJob() {
    aiRequestId++;
    if (pendingAiJob) {
        if (pendingAiJob.timeoutId) {
            clearTimeout(pendingAiJob.timeoutId);
        }
        pendingAiJob = null;
        disposeAiWorker();
    }
}

function ensureAiWorker() {
    if (typeof Worker === 'undefined' || typeof window === 'undefined') {
        return null;
    }

    if (aiWorker) {
        return aiWorker;
    }

    try {
        aiWorker = new Worker(`ai-worker.js?v=${ASSET_VERSION}`);
    } catch (error) {
        aiWorker = null;
        return null;
    }

    aiWorker.onmessage = event => {
        const data = event.data || {};
        if (!pendingAiJob || data.requestId !== pendingAiJob.requestId) {
            return;
        }

        const job = pendingAiJob;
        pendingAiJob = null;
        clearTimeout(job.timeoutId);
        job.resolve(data.result && data.result.move ? data.result.move : job.fallbackMove);
    };

    aiWorker.onerror = () => {
        if (!pendingAiJob) {
            disposeAiWorker();
            return;
        }

        const job = pendingAiJob;
        pendingAiJob = null;
        clearTimeout(job.timeoutId);
        disposeAiWorker();
        job.resolve(job.fallbackMove);
    };

    return aiWorker;
}

function requestComputerMove(activeBoard, color, historySequence = moveSequence) {
    const fallbackMove = getFallbackMove(activeBoard, color, historySequence);
    const worker = ensureAiWorker();
    const legalMoves = filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionHistory, historySequence);
    const timeBudgetMs = getSearchTimeBudget(activeBoard, legalMoves);

    if (!worker || typeof window === 'undefined') {
        return Promise.resolve(fallbackMove);
    }

    cancelPendingAiJob();

    return new Promise(resolve => {
        const requestId = ++aiRequestId;
        const timeoutId = window.setTimeout(() => {
            if (!pendingAiJob || pendingAiJob.requestId !== requestId) {
                return;
            }

            const job = pendingAiJob;
            pendingAiJob = null;
            disposeAiWorker();
            resolve(job.fallbackMove);
        }, Math.max(AI_WORKER_TIMEOUT_FLOOR_MS, timeBudgetMs + AI_WORKER_TIMEOUT_PADDING_MS));

        pendingAiJob = {
            requestId,
            resolve,
            timeoutId,
            fallbackMove
        };

        worker.postMessage({
            requestId,
            board: cloneBoard(activeBoard),
            currentPlayer: color,
            history: cloneMoveSequence(historySequence),
            positionHistory: clonePositionHistory(positionHistory),
            timeBudgetMs
        });
    });
}

function chooseComputerMove(activeBoard, color = computerColor, historySequence = moveSequence) {
    const engine = ensureEngineCore();
    if (!engine) {
        return getFallbackMove(activeBoard, color, historySequence);
    }

    const result = engine.computeBestMove({
        board: cloneBoard(activeBoard),
        currentPlayer: color,
        history: cloneMoveSequence(historySequence),
        positionHistory: clonePositionHistory(positionHistory),
        timeBudgetMs: getSearchTimeBudget(
            activeBoard,
            filterPlayableMoves(activeBoard, color, getAllLegalMoves(activeBoard, color), positionHistory, historySequence)
        )
    });

    return result.move || getFallbackMove(activeBoard, color, historySequence);
}

function getPiecePrefix(activeBoard, piece, row, col) {
    const color = piece[0];
    const peerRows = [];

    for (let scanRow = 0; scanRow < 10; scanRow++) {
        if (activeBoard[scanRow][col] === piece) {
            peerRows.push(scanRow);
        }
    }

    if (peerRows.length <= 1) {
        return '';
    }

    peerRows.sort((left, right) => color === 'r' ? left - right : right - left);
    const index = peerRows.indexOf(row);

    if (peerRows.length === 2) {
        return index === 0 ? '\u524d' : '\u5f8c';
    }

    if (peerRows.length === 3) {
        return ['\u524d', '\u4e2d', '\u5f8c'][index] || '';
    }

    return formatNumber(color, index + 1);
}

function getMoveAction(color, move) {
    if (move.fromCol === move.toCol) {
        const forward = color === 'r' ? move.toRow < move.fromRow : move.toRow > move.fromRow;
        return forward ? '\u9032' : '\u9000';
    }

    if (move.fromRow === move.toRow) {
        return '\u5e73';
    }

    const forward = color === 'r' ? move.toRow < move.fromRow : move.toRow > move.fromRow;
    return forward ? '\u9032' : '\u9000';
}

function getMoveTarget(color, pieceType, move) {
    if (move.fromRow === move.toRow || pieceType === 'H' || pieceType === 'E' || pieceType === 'A') {
        return formatNumber(color, getFileNumber(color, move.toCol));
    }

    return formatNumber(color, Math.abs(move.toRow - move.fromRow));
}

function formatMoveNotation(activeBoard, move) {
    const piece = move.piece;
    const color = piece[0];
    const pieceName = PIECE_LABELS[piece];
    const prefix = getPiecePrefix(activeBoard, piece, move.fromRow, move.fromCol);
    const source = prefix || `${pieceName}${formatNumber(color, getFileNumber(color, move.fromCol))}`;
    const action = getMoveAction(color, move);
    const target = getMoveTarget(color, piece[1], move);

    return prefix
        ? `${prefix}${pieceName}${action}${target}`
        : `${source}${action}${target}`;
}

function appendMoveLog(notation, color) {
    if (color === RED_COLOR) {
        moveLog.push({ red: notation, black: '' });
        return;
    }

    if (moveLog.length === 0 || moveLog[moveLog.length - 1].black) {
        moveLog.push({ red: '', black: notation });
        return;
    }

    moveLog[moveLog.length - 1].black = notation;
}

function getGameState(activeBoard, sideToMove) {
    const redGeneral = findGeneral(activeBoard, RED_COLOR);
    const blackGeneral = findGeneral(activeBoard, BLACK_COLOR);

    if (!redGeneral) {
        return { winner: BLACK_COLOR, message: '\u9ed1\u65b9\u52dd\uff1a\u7d05\u5e25\u88ab\u5403\u3002' };
    }
    if (!blackGeneral) {
        return { winner: RED_COLOR, message: '\u7d05\u65b9\u52dd\uff1a\u9ed1\u5c07\u88ab\u5403\u3002' };
    }

    const rawLegalMoves = getAllLegalMoves(activeBoard, sideToMove);
    const legalMoves = filterPlayableMoves(activeBoard, sideToMove, rawLegalMoves, positionHistory, moveSequence);
    if (legalMoves.length > 0) {
        return null;
    }

    if (rawLegalMoves.length > 0) {
        return {
            winner: otherColor(sideToMove),
            message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u9577\u5c07/\u9577\u6349\u7981\u624b\u3002`
        };
    }

    if (isInCheck(activeBoard, sideToMove)) {
        return {
            winner: otherColor(sideToMove),
            message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u88ab\u5c07\u6b7b\u3002`
        };
    }

    return {
        winner: otherColor(sideToMove),
        message: `${colorName(otherColor(sideToMove))}\u52dd\uff1a${colorName(sideToMove)}\u7121\u5b50\u53ef\u52d5\u3002`
    };
}

function buildBoardSvg() {
    const stroke = '#6b2d14';
    const lines = [];

    for (let row = 0; row < 10; row++) {
        const y = row + 0.5;
        lines.push(`<line x1="0.5" y1="${y}" x2="8.5" y2="${y}" />`);
    }

    lines.push('<line x1="0.5" y1="0.5" x2="0.5" y2="9.5" />');
    lines.push('<line x1="8.5" y1="0.5" x2="8.5" y2="9.5" />');

    for (let col = 1; col <= 7; col++) {
        const x = col + 0.5;
        lines.push(`<line x1="${x}" y1="0.5" x2="${x}" y2="4.5" />`);
        lines.push(`<line x1="${x}" y1="5.5" x2="${x}" y2="9.5" />`);
    }

    lines.push('<line x1="3.5" y1="0.5" x2="5.5" y2="2.5" />');
    lines.push('<line x1="5.5" y1="0.5" x2="3.5" y2="2.5" />');
    lines.push('<line x1="3.5" y1="7.5" x2="5.5" y2="9.5" />');
    lines.push('<line x1="5.5" y1="7.5" x2="3.5" y2="9.5" />');

    const markerSpecs = [
        { row: 2, col: 1, left: true, right: true },
        { row: 2, col: 7, left: true, right: true },
        { row: 3, col: 0, left: false, right: true },
        { row: 3, col: 2, left: true, right: true },
        { row: 3, col: 4, left: true, right: true },
        { row: 3, col: 6, left: true, right: true },
        { row: 3, col: 8, left: true, right: false },
        { row: 6, col: 0, left: false, right: true },
        { row: 6, col: 2, left: true, right: true },
        { row: 6, col: 4, left: true, right: true },
        { row: 6, col: 6, left: true, right: true },
        { row: 6, col: 8, left: true, right: false },
        { row: 7, col: 1, left: true, right: true },
        { row: 7, col: 7, left: true, right: true }
    ];

    const markers = markerSpecs.map(drawMarker).join('');

    return `
<div class="board-surface">
    <svg class="board-svg" viewBox="0 0 9 10" aria-hidden="true" preserveAspectRatio="none">
        <rect x="0.12" y="0.12" width="8.76" height="9.76" rx="0.12" fill="none" stroke="${stroke}" stroke-width="0.06" />
        <g fill="none" stroke="${stroke}" stroke-width="0.05" stroke-linecap="round">
            ${lines.join('')}
        </g>
        <g fill="none" stroke="${stroke}" stroke-width="0.035" stroke-linecap="square">
            ${markers}
        </g>
        <text x="2.3" y="5.08" text-anchor="middle" fill="${stroke}" font-size="0.44" font-family="KaiTi, STKaiti, serif" letter-spacing="0.08em">
            \u695a\u6cb3
        </text>
        <text x="6.7" y="5.08" text-anchor="middle" fill="${stroke}" font-size="0.44" font-family="KaiTi, STKaiti, serif" letter-spacing="0.08em">
            \u6f22\u754c
        </text>
    </svg>
    <div class="board-grid"></div>
</div>`.trim();
}

function drawMarker({ row, col, left, right }) {
    const x = col + 0.5;
    const y = row + 0.5;
    const short = 0.12;
    const long = 0.22;
    const gap = 0.1;
    const segments = [];

    const appendCorner = (baseX, verticalSign, horizontalSign) => {
        segments.push(
            `<path d="M ${baseX} ${y + verticalSign * gap} l 0 ${verticalSign * short} M ${baseX} ${y + verticalSign * gap} l ${horizontalSign * long} 0" />`
        );
    };

    if (left) {
        appendCorner(x - gap, -1, 1);
        appendCorner(x - gap, 1, 1);
    }
    if (right) {
        appendCorner(x + gap, -1, -1);
        appendCorner(x + gap, 1, -1);
    }

    return segments.join('');
}

function createBoard() {
    if (typeof document === 'undefined') {
        return;
    }

    const boardElement = document.getElementById('board');
    boardElement.classList.toggle('flipped', humanColor === BLACK_COLOR);
    boardElement.innerHTML = BOARD_SVG;
    const gridElement = boardElement.querySelector('.board-grid');

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = String(row);
            cell.dataset.col = String(col);

            if (selectedCell && selectedCell.row === row && selectedCell.col === col) {
                cell.classList.add('selected');
            }
            if (lastMove && (
                (lastMove.fromRow === row && lastMove.fromCol === col) ||
                (lastMove.toRow === row && lastMove.toCol === col)
            )) {
                cell.classList.add('last-move');
            }

            const matchingMove = validMoves.find(move => move.toRow === row && move.toCol === col);
            if (matchingMove) {
                cell.classList.add(matchingMove.captured ? 'capture-move' : 'empty-move');
            }

            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = `piece ${piece[0] === 'r' ? 'red' : 'black'}`;
                pieceElement.textContent = PIECE_LABELS[piece];
                pieceElement.style.pointerEvents = 'none';
                cell.appendChild(pieceElement);
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            gridElement.appendChild(cell);
        }
    }

    animatePendingMove(boardElement);
}

function animatePendingMove(boardElement) {
    if (typeof window === 'undefined' || !pendingAnimatedMove) {
        return;
    }

    const move = pendingAnimatedMove;
    pendingAnimatedMove = null;

    const fromCell = boardElement.querySelector(`.cell[data-row="${move.fromRow}"][data-col="${move.fromCol}"]`);
    const toCell = boardElement.querySelector(`.cell[data-row="${move.toRow}"][data-col="${move.toCol}"]`);
    const pieceElement = toCell ? toCell.querySelector('.piece') : null;
    if (!fromCell || !toCell || !pieceElement) {
        playMoveSound(move);
        return;
    }

    const fromRect = fromCell.getBoundingClientRect();
    const toRect = toCell.getBoundingClientRect();
    const shiftX = fromRect.left - toRect.left;
    const shiftY = fromRect.top - toRect.top;

    pieceElement.style.transition = 'none';
    pieceElement.style.transform = getPieceTransform(shiftX, shiftY);
    pieceElement.style.zIndex = '4';

    window.requestAnimationFrame(() => {
        pieceElement.style.transition = `transform ${MOVE_ANIMATION_MS}ms cubic-bezier(0.22, 1, 0.36, 1)`;
        pieceElement.style.transform = getPieceTransform();
    });

    playMoveSound(move);

    window.setTimeout(() => {
        pieceElement.style.transition = '';
        pieceElement.style.transform = '';
        pieceElement.style.zIndex = '';
    }, MOVE_ANIMATION_MS + 40);
}

function renderMoveLog() {
    if (typeof document === 'undefined') {
        return;
    }

    const moveLogElement = document.getElementById('move-log');
    if (!moveLogElement) {
        return;
    }

    if (moveLog.length === 0) {
        moveLogElement.innerHTML = '<div class="move-log-empty">\u5c0d\u5c40\u5c1a\u672a\u958b\u59cb\u8a18\u8b5c\u3002</div>';
        return;
    }

    moveLogElement.innerHTML = '';

    moveLog.forEach((entry, index) => {
        const rowElement = document.createElement('div');
        rowElement.className = 'move-row';

        const indexElement = document.createElement('div');
        indexElement.className = 'move-index';
        indexElement.textContent = `${index + 1}.`;

        const redElement = document.createElement('div');
        redElement.className = `move-entry${entry.red ? '' : ' empty'}`;
        redElement.textContent = entry.red || '--';

        const blackElement = document.createElement('div');
        blackElement.className = `move-entry${entry.black ? '' : ' empty'}`;
        blackElement.textContent = entry.black || '--';

        rowElement.appendChild(indexElement);
        rowElement.appendChild(redElement);
        rowElement.appendChild(blackElement);
        moveLogElement.appendChild(rowElement);
    });

    moveLogElement.scrollTop = moveLogElement.scrollHeight;
}

function clearSelection() {
    selectedCell = null;
    validMoves = [];
}

function selectPiece(row, col) {
    selectedCell = { row, col };
    validMoves = filterPlayableMoves(board, board[row][col][0], getLegalMovesForPiece(board, row, col), positionHistory, moveSequence);
    createBoard();
}

function snapshotState() {
    return {
        board: cloneBoard(board),
        currentPlayer,
        lastMove: lastMove ? { ...lastMove } : null,
        gameActive,
        aiThinking,
        statusMessage,
        moveLog: cloneMoveLog(moveLog),
        moveSequence: cloneMoveSequence(moveSequence),
        positionHistory: clonePositionHistory(positionHistory)
    };
}

function restoreState(snapshot) {
    cancelPendingAiJob();
    board = cloneBoard(snapshot.board);
    currentPlayer = snapshot.currentPlayer;
    lastMove = snapshot.lastMove ? { ...snapshot.lastMove } : null;
    gameActive = snapshot.gameActive;
    aiThinking = snapshot.aiThinking;
    statusMessage = snapshot.statusMessage;
    moveLog = cloneMoveLog(snapshot.moveLog || []);
    moveSequence = cloneMoveSequence(snapshot.moveSequence || []);
    positionHistory = clonePositionHistory(snapshot.positionHistory || []);
    pendingAnimatedMove = null;
    clearSelection();
    createBoard();
    renderMoveLog();
    updateSideButtons();
    updateStatus();
}

function updateStatus() {
    if (typeof document === 'undefined') {
        return;
    }

    const turnElement = document.getElementById('turn');
    const statusElement = document.getElementById('status');
    updateDifficultyButtons();

    if (gameActive) {
        const suffix = aiThinking ? ' \u96fb\u8166\u601d\u8003\u4e2d...' : '';
        turnElement.textContent = `${colorName(currentPlayer)}\u56de\u5408`;
        statusElement.textContent = `${statusMessage}${suffix}`.trim();
    } else {
        turnElement.textContent = '\u5c0d\u5c40\u7d50\u675f';
        statusElement.textContent = statusMessage;
    }
}

function finalizeMove() {
    const gameState = getGameState(board, currentPlayer);
    if (gameState) {
        gameActive = false;
        aiThinking = false;
        statusMessage = gameState.message;
        createBoard();
        renderMoveLog();
        updateStatus();
        playWinSound();
        if (typeof window !== 'undefined') {
            window.setTimeout(() => window.alert(gameState.message), 20);
        }
        return;
    }

    statusMessage = isInCheck(board, currentPlayer)
        ? `${colorName(currentPlayer)}\u88ab\u5c07\u8ecd\u3002`
        : currentPlayer === humanColor
            ? getStartStatusMessage()
            : `${colorName(computerColor)}\u6b63\u5728\u627e\u6b65\u3002`;

    createBoard();
    renderMoveLog();
    updateStatus();

    if (isInCheck(board, currentPlayer)) {
        playCheckSound();
    }

    if (gameActive && currentPlayer === computerColor) {
        aiThinking = true;
        updateStatus();
        if (typeof window !== 'undefined') {
            window.setTimeout(computerMove, AI_THINK_DELAY_MS);
        }
    }
}

function performMove(move) {
    moveHistory.push(snapshotState());
    appendMoveLog(formatMoveNotation(board, move), currentPlayer);
    moveSequence.push(getMoveKey(move));
    pendingAnimatedMove = { ...move };
    board = applyMoveToBoard(board, move);
    lastMove = move;
    currentPlayer = otherColor(currentPlayer);
    positionHistory.push(getBoardKey(board, currentPlayer));
    clearSelection();
    finalizeMove();
}

function handleCellClick(row, col) {
    if (!gameActive || aiThinking || currentPlayer !== humanColor) {
        return;
    }

    const piece = board[row][col];
    if (!selectedCell) {
        if (piece && piece[0] === humanColor) {
            selectPiece(row, col);
        }
        return;
    }

    const chosenMove = validMoves.find(move => move.toRow === row && move.toCol === col);
    if (chosenMove) {
        performMove(chosenMove);
        return;
    }

    if (piece && piece[0] === humanColor) {
        selectPiece(row, col);
        return;
    }

    clearSelection();
    createBoard();
}

async function computerMove() {
    if (!gameActive || currentPlayer !== computerColor) {
        aiThinking = false;
        updateStatus();
        return;
    }

    try {
        const requestBoard = cloneBoard(board);
        const requestHistory = cloneMoveSequence(moveSequence);
        const move = await requestComputerMove(requestBoard, computerColor, requestHistory);

        if (!gameActive || currentPlayer !== computerColor) {
            return;
        }

        const legalMoves = filterPlayableMoves(board, computerColor, getAllLegalMoves(board, computerColor), positionHistory, moveSequence);
        const chosenMove = move
            ? legalMoves.find(candidate => sameMove(candidate, move)) || getFallbackMove(board, computerColor, moveSequence)
            : null;

        if (!chosenMove) {
            finalizeMove();
            return;
        }

        performMove(chosenMove);
    } catch (error) {
        const fallbackMove = getFallbackMove(board, computerColor, moveSequence);
        if (gameActive && currentPlayer === computerColor && fallbackMove) {
            performMove(fallbackMove);
            return;
        }
    } finally {
        aiThinking = false;
        updateStatus();
    }
}

function undoMove() {
    if (aiThinking || moveHistory.length === 0) {
        return;
    }

    let steps = currentPlayer === humanColor ? 2 : 1;
    steps = Math.min(steps, moveHistory.length);

    let snapshot = null;
    while (steps > 0) {
        snapshot = moveHistory.pop();
        steps--;
    }

    if (snapshot) {
        restoreState(snapshot);
    }
}

function setHumanSide(color) {
    if (color !== RED_COLOR && color !== BLACK_COLOR) {
        return;
    }

    humanColor = color;
    computerColor = otherColor(color);
    resetGame();
}

function setAiLevel(level) {
    if (!AI_LEVELS[level] || aiLevel === level || isDifficultyLocked()) {
        return;
    }

    aiLevel = level;
    cancelPendingAiJob();
    aiThinking = false;
    statusMessage = getStartStatusMessage();
    updateDifficultyButtons();
    updateStatus();

    if (gameActive && currentPlayer === computerColor && typeof window !== 'undefined') {
        aiThinking = true;
        updateStatus();
        window.setTimeout(computerMove, AI_THINK_DELAY_MS);
    }
}

function resetGame() {
    cancelPendingAiJob();
    board = cloneBoard(initialBoard);
    currentPlayer = RED_COLOR;
    selectedCell = null;
    validMoves = [];
    lastMove = null;
    gameActive = true;
    aiThinking = false;
    moveHistory = [];
    moveLog = [];
    moveSequence = [];
    positionHistory = [getBoardKey(board, currentPlayer)];
    pendingAnimatedMove = null;
    transpositionTable.clear();
    statusMessage = getStartStatusMessage();
    createBoard();
    renderMoveLog();
    updateSideButtons();
    updateDifficultyButtons();
    updateStatus();

    if (currentPlayer === computerColor && typeof window !== 'undefined') {
        aiThinking = true;
        updateStatus();
        window.setTimeout(computerMove, AI_THINK_DELAY_MS);
    }
}

if (typeof window !== 'undefined') {
    window.resetGame = resetGame;
    window.undoMove = undoMove;
    window.setHumanSide = setHumanSide;
    window.setAiLevel = setAiLevel;
    resetGame();
}

if (typeof module !== 'undefined') {
    module.exports = {
        AI_LEVELS,
        BLACK_COLOR,
        DEFAULT_AI_LEVEL,
        PIECE_LABELS,
        RED_COLOR,
        initialBoard,
        applyMoveToBoard,
        chooseComputerMove,
        cloneBoard,
        cloneMoveSequence,
        clonePositionHistory,
        createMove,
        evaluateBoard,
        ensureEngineCore,
        findGeneral,
        findOpeningBookMove,
        filterPlayableMoves,
        formatMoveNotation,
        getBoardKey,
        getPieceTransform,
        getSearchTimeBudget,
        getMoveKey,
        getAllLegalMoves,
        getGameState,
        getLegalMovesForPiece,
        hasCrossedRiver,
        isInCheck,
        isPerpetualCheckViolation,
        isPerpetualChaseViolation,
        otherColor,
        repeatsRecentCyclePosition,
        setAiLevel,
        setHumanSide,
        shouldLockDifficulty,
        undoMove
    };
}
