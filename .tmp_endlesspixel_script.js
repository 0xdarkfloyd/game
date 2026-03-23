// ==================== 配置常量（独立抽离）====================
const CONFIG = {
    BOARD_WIDTH: 9,
    BOARD_HEIGHT: 10,
    CELL_SIZE: 0,
    PIECE_SIZE: 0,
    AI_DIFFICULTY: { // AI难度配置
        EASY: { depth: 1, thinkTime: 300 },
        NORMAL: { depth: 3, thinkTime: 800 },
        HARD: { depth: 5, thinkTime: 1500 }
    },
    CURRENT_DIFFICULTY: 'NORMAL', // 默认难度
    SOUND_ENABLED: true // 是否开启音效
};

// 棋子价值表（优化版，增加位置权重）
const PIECE_VALUES = {
    '帅': 10000, '将': 10000,
    '車': 900, '车': 900,
    '马': 450, '馬': 450,
    '炮': 400, '炮': 400,
    '相': 200, '象': 200,
    '仕': 200, '士': 200,
    '兵': 100, '卒': 100
};

// 位置权重表（不同棋子在不同位置的价值加成）
const POSITION_WEIGHTS = {
    '车': [[1, 1, 1, 2, 3, 2, 1, 1, 1], [1, 2, 2, 2, 3, 2, 2, 2, 1]],
    '马': [[1, 2, 3, 2, 1, 2, 3, 2, 1], [2, 3, 4, 3, 2, 3, 4, 3, 2]],
    '炮': [[1, 1, 1, 1, 2, 1, 1, 1, 1], [1, 2, 1, 2, 3, 2, 1, 2, 1]],
    '兵': [[0, 0, 0, 0, 0, 0, 0, 0, 0], [1, 1, 1, 1, 1, 1, 1, 1, 1], [2, 2, 2, 2, 2, 2, 2, 2, 2]]
};

// 初始棋子位置
const initialPieces = {
    red: {
        '车': [[0, 9], [8, 9]],
        '马': [[1, 9], [7, 9]],
        '相': [[2, 9], [6, 9]],
        '仕': [[3, 9], [5, 9]],
        '帅': [[4, 9]],
        '炮': [[1, 7], [7, 7]],
        '兵': [[0, 6], [2, 6], [4, 6], [6, 6], [8, 6]]
    },
    black: {
        '車': [[0, 0], [8, 0]],
        '馬': [[1, 0], [7, 0]],
        '象': [[2, 0], [6, 0]],
        '士': [[3, 0], [5, 0]],
        '将': [[4, 0]],
        '炮': [[1, 2], [7, 2]],
        '卒': [[0, 3], [2, 3], [4, 3], [6, 3], [8, 3]]
    }
};

// ==================== 游戏状态管理（单例模式）====================
const GameState = {
    pieces: {},
    selectedPiece: null,
    currentTurn: 'red',
    moveHistory: [],
    aiThinking: false,
    gameOver: false,
    timer: null,
    timeElapsed: 0,
    showHints: false,
    moveCount: 0, // 新增：步数统计
    drawCheckCount: 0, // 新增：和棋判定计数
    lastCaptureTurn: 0, // 新增：最后吃子回合

    // 重置状态
    reset() {
        this.pieces = {};
        this.selectedPiece = null;
        this.currentTurn = 'red';
        this.moveHistory = [];
        this.aiThinking = false;
        this.gameOver = false;
        this.timeElapsed = 0;
        this.showHints = false;
        this.moveCount = 0;
        this.drawCheckCount = 0;
        this.lastCaptureTurn = 0;
    }
};

// ==================== 工具函数 ====================
const Utils = {
    // 获取指定位置的棋子
    getPieceAtPosition(x, y) {
        return Object.values(GameState.pieces).find(
            p => p.position[0] === x && p.position[1] === y
        );
    },

    // 播放音效
    playSound(type) {
        if (!CONFIG.SOUND_ENABLED) return;
        const sounds = {
            move: new Audio('sounds/move.mp3'),
            capture: new Audio('sounds/capture.mp3'),
            win: new Audio('sounds/win.mp3'),
            click: new Audio('sounds/click.mp3')
        };
        if (sounds[type]) sounds[type].play().catch(e => console.log('音效播放失败:', e));
    },

    // 防抖函数
    debounce(func, wait) {
        let timeout;
        return function (...args) {
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(this, args), wait);
        };
    },

    // 计算两点之间的距离
    calculateDistance(pos1, pos2) {
        return Math.sqrt(Math.pow(pos1[0] - pos2[0], 2) + Math.pow(pos1[1] - pos2[1], 2));
    }
};

// ==================== 棋盘渲染 ====================
const BoardRenderer = {
    // 自适应计算尺寸
    calculateSizes() {
        const board = document.getElementById('board');
        const containerWidth = board.parentElement.clientWidth;
        const containerHeight = board.parentElement.clientHeight;

        // 自适应计算单元格大小
        CONFIG.CELL_SIZE = Math.min(
            containerWidth / CONFIG.BOARD_WIDTH,
            containerHeight / CONFIG.BOARD_HEIGHT
        );
        CONFIG.PIECE_SIZE = Math.min(CONFIG.CELL_SIZE * 0.8, CONFIG.CELL_SIZE * 0.8);

        // 移动端适配
        if (window.innerWidth < 500) {
            CONFIG.CELL_SIZE *= 0.95;
        }
    },

    // 初始化棋盘
    init() {
        const board = document.getElementById('board');
        this.calculateSizes();

        // 清空棋盘
        board.innerHTML = `
            <div class="river">楚河 · 汉界</div>
            <div class="move-hint" id="moveHint"></div>
            <div class="move-count">步数: <span id="moveCount">0</span></div>
        `;

        // 绘制横线
        this.drawHorizontalLines(board);

        // 绘制竖线
        this.drawVerticalLines(board);

        // 绘制九宫格斜线
        this.drawDiagonalLines(board);
    },

    // 绘制横线
    drawHorizontalLines(board) {
        for (let i = 0; i < CONFIG.BOARD_HEIGHT; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line horizontal';
            line.style.top = `${i * CONFIG.CELL_SIZE}px`;
            line.style.width = `${CONFIG.BOARD_WIDTH * CONFIG.CELL_SIZE}px`;

            // 九宫格横线特殊处理
            if ((i === 7 || i === 8 || i === 1 || i === 2) && window.innerWidth >= 300) {
                line.style.width = `${CONFIG.CELL_SIZE * 5}px`;
                line.style.left = `${CONFIG.CELL_SIZE * 2}px`;
            }

            board.appendChild(line);
        }
    },

    // 绘制竖线
    drawVerticalLines(board) {
        for (let j = 0; j < CONFIG.BOARD_WIDTH; j++) {
            const line = document.createElement('div');
            line.className = 'grid-line vertical';
            line.style.left = `${j * CONFIG.CELL_SIZE}px`;

            // 河界竖线断开
            if (j === 0 || j === 8) {
                line.style.height = `${CONFIG.BOARD_HEIGHT * CONFIG.CELL_SIZE}px`;
                board.appendChild(line);
            } else {
                // 上半部分
                const topLine = line.cloneNode();
                topLine.style.height = `${(CONFIG.BOARD_HEIGHT / 2 - 0.5) * CONFIG.CELL_SIZE}px`;
                topLine.style.top = '0';
                board.appendChild(topLine);

                // 下半部分
                const bottomLine = line.cloneNode();
                bottomLine.style.height = `${(CONFIG.BOARD_HEIGHT / 2 - 0.5) * CONFIG.CELL_SIZE}px`;
                bottomLine.style.top = `${(CONFIG.BOARD_HEIGHT / 2 + 0.5) * CONFIG.CELL_SIZE}px`;
                board.appendChild(bottomLine);
            }
        }
    },

    // 绘制九宫格斜线
    drawDiagonalLines(board) {
        if (window.innerWidth < 300) return;

        // 红方九宫格
        const redDiag1 = this.createDiagonalLine(3 * CONFIG.CELL_SIZE, 7 * CONFIG.CELL_SIZE, 45);
        const redDiag2 = this.createDiagonalLine(5 * CONFIG.CELL_SIZE, 7 * CONFIG.CELL_SIZE, -45);

        // 黑方九宫格
        const blackDiag1 = this.createDiagonalLine(3 * CONFIG.CELL_SIZE, 2 * CONFIG.CELL_SIZE, -45);
        const blackDiag2 = this.createDiagonalLine(5 * CONFIG.CELL_SIZE, 2 * CONFIG.CELL_SIZE, 45);

        board.appendChild(redDiag1);
        board.appendChild(redDiag2);
        board.appendChild(blackDiag1);
        board.appendChild(blackDiag2);
    },

    // 创建斜线元素
    createDiagonalLine(x, y, angle) {
        const line = document.createElement('div');
        line.className = 'grid-line diagonal';
        line.style.width = `${Math.sqrt(2) * CONFIG.CELL_SIZE * 2}px`;
        line.style.height = '1px';
        line.style.left = `${x}px`;
        line.style.top = `${y}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 0';
        return line;
    },

    // 更新步数显示
    updateMoveCount() {
        document.getElementById('moveCount').textContent = GameState.moveCount;
    }
};

// ==================== 棋子管理 ====================
const PieceManager = {
    // 初始化所有棋子
    init() {
        GameState.pieces = {};
        const board = document.getElementById('board');

        // 创建红方棋子
        this.createPieces('red', board);

        // 创建黑方棋子
        this.createPieces('black', board);
    },

    // 创建指定颜色的棋子
    createPieces(color, board) {
        const piecesConfig = color === 'red' ? initialPieces.red : initialPieces.black;

        for (const [name, positions] of Object.entries(piecesConfig)) {
            positions.forEach((pos, index) => {
                const id = `${color}-${name}-${index}`;
                const piece = this.createPieceElement(id, name, color, pos);
                GameState.pieces[id] = {
                    id,
                    element: piece,
                    name,
                    color,
                    position: [...pos],
                    originalPosition: [...pos],
                    hasMoved: false // 新增：标记是否移动过
                };
                board.appendChild(piece);
            });
        }
    },

    // 创建单个棋子元素
    createPieceElement(id, name, color, position) {
        const piece = document.createElement('div');
        piece.id = id;
        piece.className = `piece ${color}`;
        piece.textContent = name;
        piece.dataset.x = position[0];
        piece.dataset.y = position[1];
        piece.style.transition = 'all 0.2s ease'; // 新增：移动动画

        // 设置位置
        this.updatePosition(piece, position);

        // 点击事件
        piece.addEventListener('click', () => {
            Utils.playSound('click');
            GameController.handlePieceClick(id);
        });

        return piece;
    },

    // 更新棋子位置
    updatePosition(pieceElement, position) {
        const [x, y] = position;
        pieceElement.style.left = `${x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2}px`;
        pieceElement.style.top = `${y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2}px`;
        pieceElement.style.transform = 'translate(-50%, -50%)';
        pieceElement.dataset.x = x;
        pieceElement.dataset.y = y;
    },

    // 显示可移动位置提示
    showValidMoves(piece) {
        this.hideValidMoves(); // 先清空旧提示

        const board = document.getElementById('board');
        const baseHint = document.getElementById('moveHint');

        for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
            for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
                if (GameRules.isValidMove(piece, piece.position[0], piece.position[1], x, y)) {
                    const hint = baseHint.cloneNode();
                    hint.id = `hint-${x}-${y}`;
                    hint.style.left = `${x * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2}px`;
                    hint.style.top = `${y * CONFIG.CELL_SIZE + CONFIG.CELL_SIZE / 2}px`;
                    hint.style.display = 'block';
                    hint.style.width = `${CONFIG.PIECE_SIZE * 0.3}px`;
                    hint.style.height = `${CONFIG.PIECE_SIZE * 0.3}px`;

                    // 点击提示点移动
                    hint.addEventListener('click', () => {
                        Utils.playSound('click');
                        GameController.attemptMove(piece, [x, y]);
                    });

                    board.appendChild(hint);
                }
            }
        }
    },

    // 隐藏可移动位置提示
    hideValidMoves() {
        document.querySelectorAll('.move-hint').forEach(hint => {
            if (hint.id !== 'moveHint') hint.remove();
        });
    }
};

// ==================== 游戏规则 ====================
const GameRules = {
    // 检查移动是否有效
    isValidMove(piece, startX, startY, endX, endY) {
        // 不能移动到原位置
        if (startX === endX && startY === endY) return false;

        // 目标位置有己方棋子
        const targetPiece = Utils.getPieceAtPosition(endX, endY);
        if (targetPiece && targetPiece.color === piece.color) return false;

        // 根据棋子类型检查规则
        switch (piece.name) {
            case '帅': case '将': return this.isValidKingMove(piece, startX, startY, endX, endY);
            case '仕': case '士': return this.isValidAdvisorMove(piece, startX, startY, endX, endY);
            case '相': case '象': return this.isValidElephantMove(piece, startX, startY, endX, endY);
            case '马': case '馬': return this.isValidHorseMove(piece, startX, startY, endX, endY);
            case '车': case '車': return this.isValidChariotMove(piece, startX, startY, endX, endY);
            case '炮': return this.isValidCannonMove(piece, startX, startY, endX, endY);
            case '兵': case '卒': return this.isValidSoldierMove(piece, startX, startY, endX, endY);
            default: return false;
        }
    },

    // 帅/将移动规则
    isValidKingMove(piece, startX, startY, endX, endY) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);

        // 只能走一步（横竖）
        if (dx + dy !== 1) return false;

        // 只能在九宫格内
        const isRedKing = piece.color === 'red';
        if ((isRedKing && (endX < 3 || endX > 5 || endY < 7 || endY > 9)) ||
            (!isRedKing && (endX < 3 || endX > 5 || endY < 0 || endY > 2))) {
            return false;
        }

        // 检查将帅是否照面
        if (this.isKingsFacingEachOther(piece, endX, endY)) {
            return false;
        }

        return true;
    },

    // 检查将帅是否照面
    isKingsFacingEachOther(movingKing, targetX, targetY) {
        const enemyKing = Object.values(GameState.pieces).find(
            p => p.color !== movingKing.color && (p.name === '帅' || p.name === '将')
        );

        if (!enemyKing) return false;

        // 移动后的将/帅位置
        const kingX = (movingKing.name === '帅' || movingKing.name === '将') ? targetX : movingKing.position[0];
        const kingY = (movingKing.name === '帅' || movingKing.name === '将') ? targetY : movingKing.position[1];

        // 不在同一列，不会照面
        if (kingX !== enemyKing.position[0]) return false;

        // 检查中间是否有棋子阻隔
        const minY = Math.min(kingY, enemyKing.position[1]);
        const maxY = Math.max(kingY, enemyKing.position[1]);

        for (let y = minY + 1; y < maxY; y++) {
            if (Utils.getPieceAtPosition(kingX, y)) {
                return false; // 有阻隔，不会照面
            }
        }

        return true; // 无阻隔，照面了
    },

    // 仕/士移动规则
    isValidAdvisorMove(piece, startX, startY, endX, endY) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);

        // 只能斜走一步
        if (dx !== 1 || dy !== 1) return false;

        // 只能在九宫格内
        const isRed = piece.color === 'red';
        if ((isRed && (endX < 3 || endX > 5 || endY < 7 || endY > 9)) ||
            (!isRed && (endX < 3 || endX > 5 || endY < 0 || endY > 2))) {
            return false;
        }

        return true;
    },

    // 相/象移动规则
    isValidElephantMove(piece, startX, startY, endX, endY) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);

        // 只能斜走两步
        if (dx !== 2 || dy !== 2) return false;

        // 不能过河
        const isRed = piece.color === 'red';
        if ((isRed && endY < 5) || (!isRed && endY > 4)) {
            return false;
        }

        // 检查象眼是否有棋子
        const midX = startX + (endX - startX) / 2;
        const midY = startY + (endY - startY) / 2;

        if (Utils.getPieceAtPosition(midX, midY)) {
            return false;
        }

        return true;
    },

    // 马移动规则
    isValidHorseMove(piece, startX, startY, endX, endY) {
        const dx = Math.abs(endX - startX);
        const dy = Math.abs(endY - startY);

        // 马走日（1+2）
        if (!((dx === 2 && dy === 1) || (dx === 1 && dy === 2))) {
            return false;
        }

        // 检查马腿是否被绊
        let blockX, blockY;
        if (dx === 2) {
            blockX = startX + (endX - startX) / 2;
            blockY = startY;
        } else {
            blockX = startX;
            blockY = startY + (endY - startY) / 2;
        }

        if (Utils.getPieceAtPosition(blockX, blockY)) {
            return false;
        }

        return true;
    },

    // 车移动规则
    isValidChariotMove(piece, startX, startY, endX, endY) {
        // 只能横竖走
        if (startX !== endX && startY !== endY) return false;

        // 检查路径是否有棋子阻隔
        const stepX = startX === endX ? 0 : (endX - startX) / Math.abs(endX - startX);
        const stepY = startY === endY ? 0 : (endY - startY) / Math.abs(endY - startY);

        let x = startX + stepX;
        let y = startY + stepY;

        while (x !== endX || y !== endY) {
            if (Utils.getPieceAtPosition(x, y)) {
                return false;
            }
            x += stepX;
            y += stepY;
        }

        return true;
    },

    // 炮移动规则
    isValidCannonMove(piece, startX, startY, endX, endY) {
        // 只能横竖走
        if (startX !== endX && startY !== endY) return false;

        // 统计路径上的棋子数
        let obstacleCount = 0;
        const stepX = startX === endX ? 0 : (endX - startX) / Math.abs(endX - startX);
        const stepY = startY === endY ? 0 : (endY - startY) / Math.abs(endY - startY);

        let x = startX + stepX;
        let y = startY + stepY;

        while (x !== endX || y !== endY) {
            if (Utils.getPieceAtPosition(x, y)) {
                obstacleCount++;
                if (obstacleCount > 1) break;
            }
            x += stepX;
            y += stepY;
        }

        const targetPiece = Utils.getPieceAtPosition(endX, endY);

        // 不吃子：路径上无棋子
        if (!targetPiece) {
            return obstacleCount === 0;
        }
        // 吃子：路径上必须有且仅有一个棋子
        else {
            return obstacleCount === 1;
        }
    },

    // 兵/卒移动规则
    isValidSoldierMove(piece, startX, startY, endX, endY) {
        const dx = endX - startX;
        const dy = endY - startY;

        // 只能走一步
        if (Math.abs(dx) + Math.abs(dy) !== 1) return false;

        const isRed = piece.color === 'red';

        // 未过河：只能前进
        if ((isRed && startY > 4 && dy >= 0) || (!isRed && startY < 5 && dy <= 0)) {
            return false;
        }

        // 过河后：可以横向移动
        if ((isRed && startY <= 4 && dx !== 0) || (!isRed && startY >= 5 && dx !== 0)) {
            return true;
        }

        // 前进方向检查
        return (isRed && dy < 0) || (!isRed && dy > 0);
    },

    // 检查胜负（优化版）
    checkWin() {
        // 红方帅是否存在
        const redKingExists = Object.values(GameState.pieces).some(p =>
            p.color === 'red' && p.name === '帅'
        );
        // 黑方将是否存在
        const blackKingExists = Object.values(GameState.pieces).some(p =>
            p.color === 'black' && p.name === '将'
        );

        // 返回具体获胜方
        if (!redKingExists) return 'black';
        if (!blackKingExists) return 'red';
        return null;
    },

    // 检查和棋
    checkDraw() {
        // 1. 超过60步未吃子
        if (GameState.moveCount - GameState.lastCaptureTurn >= 60) {
            return '六十步无吃子，判定和棋';
        }

        // 2. 双方都只剩将帅
        const redPieces = Object.values(GameState.pieces).filter(p => p.color === 'red').length;
        const blackPieces = Object.values(GameState.pieces).filter(p => p.color === 'black').length;

        if (redPieces === 1 && blackPieces === 1) {
            return '双方只剩将帅，判定和棋';
        }

        // 3. 重复局面三次
        if (GameState.drawCheckCount >= 3) {
            return '重复局面三次，判定和棋';
        }

        return null;
    }
};

// ==================== AI智能模块（Minimax + α-β剪枝）====================
const AIController = {
    // 评估当前局面价值
    evaluateBoard() {
        let score = 0;

        // 遍历所有棋子计算价值
        Object.values(GameState.pieces).forEach(piece => {
            const multiplier = piece.color === 'black' ? 1 : -1; // 黑方为正，红方为负
            let pieceValue = PIECE_VALUES[piece.name] || 0;

            // 位置价值加成
            if (POSITION_WEIGHTS[piece.name]) {
                const [x, y] = piece.position;
                const yIndex = piece.color === 'red' ? Math.min(y, 2) : Math.min(9 - y, 2);
                const posWeight = POSITION_WEIGHTS[piece.name][yIndex][x] || 0;
                pieceValue += posWeight * 10;
            }

            // 靠近对方老将加成
            const enemyKing = Object.values(GameState.pieces).find(
                p => p.color !== piece.color && (p.name === '帅' || p.name === '将')
            );

            if (enemyKing) {
                const distance = Utils.calculateDistance(piece.position, enemyKing.position);
                pieceValue += Math.max(0, 50 - distance * 5);
            }

            score += multiplier * pieceValue;
        });

        return score;
    },

    // Minimax算法 + α-β剪枝
    minimax(depth, alpha, beta, isMaximizing) {
        // 递归终止条件
        const winner = GameRules.checkWin();
        if (depth === 0 || winner) {
            if (winner === 'black') return 100000 + depth; // 黑方赢
            if (winner === 'red') return -100000 - depth; // 红方赢
            return this.evaluateBoard(); // 评估当前局面
        }

        const currentColor = isMaximizing ? 'black' : 'red';
        const pieces = Object.values(GameState.pieces).filter(p => p.color === currentColor);

        let bestScore = isMaximizing ? -Infinity : Infinity;

        // 遍历所有可能的移动
        for (const piece of pieces) {
            for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
                for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
                    if (!GameRules.isValidMove(piece, piece.position[0], piece.position[1], x, y)) {
                        continue;
                    }

                    // 模拟移动
                    const originalPos = [...piece.position];
                    const targetPiece = Utils.getPieceAtPosition(x, y);
                    let capturedPiece = null;

                    // 记录被吃的棋子
                    if (targetPiece) {
                        capturedPiece = { ...targetPiece };
                        delete GameState.pieces[targetPiece.id];
                    }

                    // 移动棋子
                    piece.position = [x, y];

                    // 递归调用
                    const score = this.minimax(depth - 1, alpha, beta, !isMaximizing);

                    // 回溯
                    piece.position = originalPos;
                    if (capturedPiece) {
                        GameState.pieces[capturedPiece.id] = capturedPiece;
                    }

                    // 更新最佳分数
                    if (isMaximizing) {
                        bestScore = Math.max(score, bestScore);
                        alpha = Math.max(alpha, bestScore);
                    } else {
                        bestScore = Math.min(score, bestScore);
                        beta = Math.min(beta, bestScore);
                    }

                    // α-β剪枝
                    if (beta <= alpha) break;
                }
                if (beta <= alpha) break;
            }
        }

        return bestScore;
    },

    // 生成AI的最佳移动
    findBestMove() {
        const difficulty = CONFIG.AI_DIFFICULTY[CONFIG.CURRENT_DIFFICULTY];
        let bestScore = -Infinity;
        let bestMoves = [];

        // 获取所有黑方棋子
        const blackPieces = Object.values(GameState.pieces).filter(p => p.color === 'black');

        // 遍历所有可能的移动
        for (const piece of blackPieces) {
            for (let x = 0; x < CONFIG.BOARD_WIDTH; x++) {
                for (let y = 0; y < CONFIG.BOARD_HEIGHT; y++) {
                    if (!GameRules.isValidMove(piece, piece.position[0], piece.position[1], x, y)) {
                        continue;
                    }

                    // 模拟移动
                    const originalPos = [...piece.position];
                    const targetPiece = Utils.getPieceAtPosition(x, y);
                    let capturedPiece = null;

                    if (targetPiece) {
                        capturedPiece = { ...targetPiece };
                        delete GameState.pieces[targetPiece.id];
                    }

                    piece.position = [x, y];

                    // 计算局面分数
                    const score = this.minimax(difficulty.depth - 1, -Infinity, Infinity, false);

                    // 回溯
                    piece.position = originalPos;
                    if (capturedPiece) {
                        GameState.pieces[capturedPiece.id] = capturedPiece;
                    }

                    // 更新最佳移动
                    if (score > bestScore) {
                        bestScore = score;
                        bestMoves = [{ piece, to: [x, y], score }];
                    } else if (score === bestScore) {
                        bestMoves.push({ piece, to: [x, y], score });
                    }
                }
            }
        }

        // 从最佳移动中随机选一个（增加不确定性）
        if (bestMoves.length > 0) {
            return bestMoves[Math.floor(Math.random() * bestMoves.length)];
        }

        return null;
    },

    // 执行AI移动
    makeMove() {
        if (GameState.gameOver) return;

        GameState.aiThinking = true;
        document.getElementById('thinking').style.display = 'block';

        const difficulty = CONFIG.AI_DIFFICULTY[CONFIG.CURRENT_DIFFICULTY];

        setTimeout(() => {
            const bestMove = this.findBestMove();

            if (bestMove) {
                // 模拟选中棋子
                setTimeout(() => {
                    bestMove.piece.element.classList.add('selected');

                    // 执行移动
                    setTimeout(() => {
                        GameController.attemptMove(bestMove.piece, bestMove.to);
                        GameState.aiThinking = false;
                        document.getElementById('thinking').style.display = 'none';
                    }, 500);
                }, 300);
            } else {
                GameState.aiThinking = false;
                document.getElementById('thinking').style.display = 'none';
            }
        }, difficulty.thinkTime);
    },

    // 设置AI难度
    setDifficulty(difficulty) {
        if (CONFIG.AI_DIFFICULTY[difficulty]) {
            CONFIG.CURRENT_DIFFICULTY = difficulty;
            document.getElementById('difficultyStatus').textContent =
                difficulty === 'EASY' ? '简单' :
                    difficulty === 'NORMAL' ? '中等' : '困难';
        }
    }
};

// ==================== 游戏控制器（核心逻辑）====================
const GameController = {
    // 初始化游戏
    init() {
        // 初始化状态
        GameState.reset();

        // 初始化棋盘
        BoardRenderer.init();

        // 初始化棋子
        PieceManager.init();

        // 初始化事件监听
        this.initEventListeners();

        // 更新状态
        this.updateStatus();
        this.startTimer();

        // 初始化AI难度
        AIController.setDifficulty('NORMAL');
    },

    // 初始化事件监听
    initEventListeners() {
        const board = document.getElementById('board');

        // 点击棋盘空白处移动
        board.addEventListener('click', Utils.debounce((e) => {
            if (GameState.aiThinking || GameState.gameOver || !GameState.selectedPiece) return;

            // 忽略点击到特定元素
            if (e.target.classList.contains('piece') ||
                e.target.classList.contains('river') ||
                e.target.classList.contains('move-hint') ||
                e.target.classList.contains('move-count')) {
                return;
            }

            // 计算点击的棋盘坐标
            const rect = board.getBoundingClientRect();
            const x = Math.round((e.clientX - rect.left) / CONFIG.CELL_SIZE);
            const y = Math.round((e.clientY - rect.top) / CONFIG.CELL_SIZE);

            // 检查坐标有效性
            if (x >= 0 && x < CONFIG.BOARD_WIDTH && y >= 0 && y < CONFIG.BOARD_HEIGHT) {
                this.attemptMove(GameState.selectedPiece, [x, y]);
            }
        }, 100));

        // 悔棋按钮
        document.getElementById('undoBtn')?.addEventListener('click', () => {
            if (confirm('确定要悔棋吗？')) {
                this.undoMove();
            }
        });

        // 重置按钮
        document.getElementById('resetBtn')?.addEventListener('click', () => {
            if (confirm('确定要重新开始游戏吗？')) {
                this.resetGame();
            }
        });

        // 提示开关
        document.getElementById('hintToggle')?.addEventListener('click', () => {
            GameState.showHints = !GameState.showHints;
            document.getElementById('hintToggle').textContent =
                GameState.showHints ? '隐藏提示' : '显示提示';

            if (GameState.showHints && GameState.selectedPiece) {
                PieceManager.showValidMoves(GameState.selectedPiece);
            } else {
                PieceManager.hideValidMoves();
            }
        });

        // 音效开关
        document.getElementById('soundToggle')?.addEventListener('click', () => {
            CONFIG.SOUND_ENABLED = !CONFIG.SOUND_ENABLED;
            document.getElementById('soundToggle').textContent =
                CONFIG.SOUND_ENABLED ? '关闭音效' : '开启音效';
        });

        // 难度选择
        document.querySelectorAll('.difficulty-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                AIController.setDifficulty(btn.dataset.level);
            });
        });

        // 窗口大小变化时重新渲染
        window.addEventListener('resize', Utils.debounce(() => {
            if (!GameState.gameOver) {
                BoardRenderer.init();
                // 重新定位所有棋子
                Object.values(GameState.pieces).forEach(piece => {
                    PieceManager.updatePosition(piece.element, piece.position);
                });
            }
        }, 300));
    },

    // 处理棋子点击
    handlePieceClick(pieceId) {
        if (GameState.aiThinking || GameState.gameOver) return;

        const piece = GameState.pieces[pieceId];

        // 点击的是当前回合的棋子
        if (piece.color === GameState.currentTurn) {
            // 取消之前的选择
            if (GameState.selectedPiece) {
                GameState.selectedPiece.element.classList.remove('selected');
                PieceManager.hideValidMoves();
            }

            // 选择新棋子
            GameState.selectedPiece = piece;
            piece.element.classList.add('selected');

            // 显示可移动位置
            if (GameState.showHints) {
                PieceManager.showValidMoves(piece);
            }
        }
        // 点击的是对方棋子或空位置，尝试移动
        else if (GameState.selectedPiece) {
            this.attemptMove(GameState.selectedPiece, piece ? piece.position : null);
        }
    },

    // 尝试移动棋子
    attemptMove(piece, targetPos) {
        if (!piece || !targetPos) return;

        const [startX, startY] = piece.position;
        const [endX, endY] = targetPos;

        // 检查移动有效性
        if (!GameRules.isValidMove(piece, startX, startY, endX, endY)) {
            return;
        }

        // 记录移动历史
        const targetPiece = Utils.getPieceAtPosition(endX, endY);
        GameState.moveHistory.push({
            piece: { ...piece },
            from: [startX, startY],
            to: [endX, endY],
            captured: targetPiece ? { ...targetPiece } : null,
            turn: GameState.moveCount
        });

        // 执行移动
        this.executeMove(piece, [endX, endY], targetPiece);

        // 更新步数
        GameState.moveCount++;
        BoardRenderer.updateMoveCount();

        // 检查和棋
        const drawReason = GameRules.checkDraw();
        if (drawReason) {
            setTimeout(() => {
                alert(drawReason);
                this.resetGame();
            }, 100);
            return;
        }

        // 检查是否获胜
        const winner = GameRules.checkWin();
        if (winner) {
            setTimeout(() => {
                Utils.playSound('win');
                const winnerText = winner === 'red' ? '红方（玩家）' : '黑方（AI）';
                alert(`${winnerText}获胜！\n总步数：${GameState.moveCount}\n耗时：${document.getElementById('timer').textContent}`);
                this.resetGame();
            }, 100);
            return;
        }

        // 切换回合
        this.switchTurn();
    },

    // 执行移动
    executeMove(piece, targetPos, targetPiece) {
        const [endX, endY] = targetPos;

        // 标记棋子已移动
        piece.hasMoved = true;

        // 吃子
        if (targetPiece) {
            Utils.playSound('capture');
            GameState.lastCaptureTurn = GameState.moveCount; // 更新最后吃子回合

            targetPiece.element.classList.add('captured');
            targetPiece.element.style.opacity = '0.5';

            setTimeout(() => {
                targetPiece.element.remove();
                delete GameState.pieces[targetPiece.id];
            }, 300);
        } else {
            Utils.playSound('move');
        }

        // 移动棋子
        piece.position = [endX, endY];
        PieceManager.updatePosition(piece.element, targetPos);

        // 取消选择
        piece.element.classList.remove('selected');
        GameState.selectedPiece = null;
        PieceManager.hideValidMoves();
    },

    // 切换回合
    switchTurn() {
        // 切换当前回合
        GameState.currentTurn = GameState.currentTurn === 'red' ? 'black' : 'red';
        this.updateStatus();

        // AI回合
        if (GameState.currentTurn === 'black' && !GameState.gameOver) {
            setTimeout(() => AIController.makeMove(), 200);
        }
    },

    // 悔棋功能（优化版）
    undoMove() {
        if (GameState.moveHistory.length === 0 || GameState.aiThinking || GameState.gameOver) return;

        // 悔两步（玩家和AI各一步）
        const movesToUndo = GameState.currentTurn === 'red' ? 2 : 1;

        for (let i = 0; i < movesToUndo && GameState.moveHistory.length > 0; i++) {
            const lastMove = GameState.moveHistory.pop();

            // 恢复棋子位置
            const piece = GameState.pieces[lastMove.piece.id];
            if (piece) {
                piece.position = lastMove.from;
                PieceManager.updatePosition(piece.element, lastMove.from);
                piece.hasMoved = false; // 重置移动标记
            }

            // 恢复被吃掉的棋子
            if (lastMove.captured) {
                const capturedPiece = lastMove.captured;
                const pieceElement = PieceManager.createPieceElement(
                    capturedPiece.id,
                    capturedPiece.name,
                    capturedPiece.color,
                    capturedPiece.position
                );

                GameState.pieces[capturedPiece.id] = {
                    id: capturedPiece.id,
                    element: pieceElement,
                    name: capturedPiece.name,
                    color: capturedPiece.color,
                    position: capturedPiece.position,
                    originalPosition: capturedPiece.originalPosition,
                    hasMoved: capturedPiece.hasMoved || false
                };

                document.getElementById('board').appendChild(pieceElement);
            }

            // 更新步数
            GameState.moveCount = Math.max(0, GameState.moveCount - 1);
            BoardRenderer.updateMoveCount();
        }

        // 更新状态
        GameState.currentTurn = 'red';
        GameState.selectedPiece = null;
        PieceManager.hideValidMoves();
        this.updateStatus();

        // 重启计时器
        this.stopTimer();
        this.startTimer();
    },

    // 更新状态显示
    updateStatus() {
        const status = document.getElementById('status');

        if (GameState.currentTurn === 'red') {
            status.textContent = '红方回合（玩家）';
            status.className = 'status red-turn';
        } else {
            status.textContent = '黑方回合（AI）';
            status.className = 'status black-turn';
        }
    },

    // 计时器相关
    startTimer() {
        if (GameState.timer) clearInterval(GameState.timer);

        GameState.timeElapsed = 0;
        GameState.timer = setInterval(() => {
            GameState.timeElapsed++;
            this.updateTimerDisplay();
        }, 1000);
    },

    stopTimer() {
        if (GameState.timer) {
            clearInterval(GameState.timer);
            GameState.timer = null;
        }
    },

    updateTimerDisplay() {
        const minutes = Math.floor(GameState.timeElapsed / 60).toString().padStart(2, '0');
        const seconds = (GameState.timeElapsed % 60).toString().padStart(2, '0');
        document.getElementById('timer').textContent = `${minutes}:${seconds}`;
    },

    // 重置游戏
    resetGame() {
        // 停止计时器
        this.stopTimer();

        // 重置游戏状态
        GameState.reset();

        // 重置UI
        document.getElementById('thinking').style.display = 'none';
        PieceManager.hideValidMoves();

        // 重新初始化棋盘和棋子
        BoardRenderer.init();
        PieceManager.init();

        // 更新状态和计时器
        this.updateStatus();
        this.startTimer();
        BoardRenderer.updateMoveCount();
    }
};

// ==================== 初始化游戏 ====================
window.addEventListener('DOMContentLoaded', () => {
    GameController.init();
});
