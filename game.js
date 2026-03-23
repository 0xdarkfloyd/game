// Initial board setup
const initialBoard = [
    ['r車', 'r馬', 'r象', 'r士', 'r将', 'r士', 'r象', 'r馬', 'r車'],
    ['', '', '', '', '', '', '', '', ''],
    ['', 'r炮', '', '', '', '', '', 'r炮', ''],
    ['r兵', '', 'r兵', '', 'r兵', '', 'r兵', '', 'r兵'],
    ['', '', '', '', '', '', '', '', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['b卒', '', 'b卒', '', 'b卒', '', 'b卒', '', 'b卒'],
    ['', 'b砲', '', '', '', '', '', 'b砲', ''],
    ['', '', '', '', '', '', '', '', ''],
    ['b车', 'b马', 'b相', 'b仕', 'b帅', 'b仕', 'b相', 'b马', 'b车']
];

let board = JSON.parse(JSON.stringify(initialBoard));
let currentPlayer = 'r'; // 'r' for red, 'b' for black
let selectedCell = null;
let validMoves = [];

const pieceNames = {
    '車': '車', '车': '车', '馬': '馬', '马': '马',
    '象': '象', '相': '相', '士': '士', '仕': '仕',
    '将': '将', '帅': '帅', '炮': '炮', '砲': '砲',
    '兵': '兵', '卒': '卒'
};

function createBoard() {
    const boardElement = document.getElementById('board');
    boardElement.innerHTML = '';

    for (let row = 0; row < 10; row++) {
        const rowElement = document.createElement('div');
        rowElement.className = 'row';

        for (let col = 0; col < 9; col++) {
            const cell = document.createElement('div');
            cell.className = 'cell';
            cell.dataset.row = row;
            cell.dataset.col = col;

            if (row === 4 || row === 5) {
                cell.classList.add('river');
            }

            const piece = board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = 'piece ' + (piece[0] === 'r' ? 'red' : 'black');
                pieceElement.textContent = piece.substring(1);
                cell.appendChild(pieceElement);
            }

            cell.addEventListener('click', () => handleCellClick(row, col));
            rowElement.appendChild(cell);
        }

        boardElement.appendChild(rowElement);
    }
}

function handleCellClick(row, col) {
    const piece = board[row][col];

    // If a piece is already selected
    if (selectedCell) {
        // Check if this is a valid move
        if (validMoves.some(m => m.row === row && m.col === col)) {
            // Make the move
            movePiece(selectedCell.row, selectedCell.col, row, col);
            clearSelection();

            // Switch player and let computer play
            if (currentPlayer === 'b') {
                setTimeout(computerMove, 500);
            }
        } else {
            // Select new piece if it belongs to current player
            clearSelection();
            if (piece && piece[0] === currentPlayer) {
                selectPiece(row, col);
            }
        }
    } else {
        // Select piece if it belongs to current player
        if (piece && piece[0] === currentPlayer) {
            selectPiece(row, col);
        }
    }
}

function selectPiece(row, col) {
    selectedCell = { row, col };
    validMoves = getValidMoves(row, col);

    // Highlight selected cell and valid moves
    const cells = document.querySelectorAll('.cell');
    cells.forEach(cell => {
        const cellRow = parseInt(cell.dataset.row);
        const cellCol = parseInt(cell.dataset.col);

        if (cellRow === row && cellCol === col) {
            cell.classList.add('selected');
        } else if (validMoves.some(m => m.row === cellRow && m.col === cellCol)) {
            cell.classList.add('valid-move');
        }
    });
}

function clearSelection() {
    selectedCell = null;
    validMoves = [];
    document.querySelectorAll('.cell').forEach(cell => {
        cell.classList.remove('selected', 'valid-move');
    });
}

function movePiece(fromRow, fromCol, toRow, toCol) {
    board[toRow][toCol] = board[fromRow][fromCol];
    board[fromRow][fromCol] = '';
    currentPlayer = currentPlayer === 'r' ? 'b' : 'r';
    updateTurnDisplay();
    createBoard();

    // Check for game over
    checkGameOver();
}

function getValidMoves(row, col) {
    const piece = board[row][col];
    if (!piece) return [];

    const pieceType = piece.substring(1);
    const color = piece[0];
    const moves = [];

    switch (pieceType) {
        case '車':
        case '车':
            // Rook moves (horizontal and vertical)
            for (let direction of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let newRow = row + direction[0];
                let newCol = col + direction[1];
                while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                    if (!board[newRow][newCol]) {
                        moves.push({ row: newRow, col: newCol });
                    } else {
                        if (board[newRow][newCol][0] !== color) {
                            moves.push({ row: newRow, col: newCol });
                        }
                        break;
                    }
                    newRow += direction[0];
                    newCol += direction[1];
                }
            }
            break;

        case '馬':
        case '马':
            // Horse moves
            const horseMoves = [
                [2, 1, 1, 0], [2, -1, 1, 0], [-2, 1, -1, 0], [-2, -1, -1, 0],
                [1, 2, 0, 1], [-1, 2, 0, 1], [1, -2, 0, -1], [-1, -2, 0, -1]
            ];
            for (let [dr, dc, blockR, blockC] of horseMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                const blockRow = row + blockR;
                const blockCol = col + blockC;

                if (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9 &&
                    !board[blockRow][blockCol]) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '象':
        case '相':
            // Elephant moves (stays on own side)
            const maxRow = color === 'r' ? 4 : 10;
            const minRow = color === 'r' ? 0 : 5;
            const elephantMoves = [[2, 2], [2, -2], [-2, 2], [-2, -2]];
            for (let [dr, dc] of elephantMoves) {
                const newRow = row + dr;
                const newCol = col + dc;
                const blockRow = row + dr / 2;
                const blockCol = col + dc / 2;

                if (newRow >= minRow && newRow < maxRow && newCol >= 0 && newCol < 9 &&
                    !board[blockRow][blockCol]) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '士':
        case '仕':
            // Advisor moves (within palace)
            const palaceRows = color === 'r' ? [0, 1, 2] : [7, 8, 9];
            const palaceCols = [3, 4, 5];
            const advisorMoves = [[1, 1], [1, -1], [-1, 1], [-1, -1]];
            for (let [dr, dc] of advisorMoves) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (palaceRows.includes(newRow) && palaceCols.includes(newCol)) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '将':
        case '帅':
            // General moves (within palace)
            const genPalaceRows = color === 'r' ? [0, 1, 2] : [7, 8, 9];
            const genPalaceCols = [3, 4, 5];
            const generalMoves = [[0, 1], [0, -1], [1, 0], [-1, 0]];
            for (let [dr, dc] of generalMoves) {
                const newRow = row + dr;
                const newCol = col + dc;

                if (genPalaceRows.includes(newRow) && genPalaceCols.includes(newCol)) {
                    if (!board[newRow][newCol] || board[newRow][newCol][0] !== color) {
                        moves.push({ row: newRow, col: newCol });
                    }
                }
            }
            break;

        case '炮':
        case '砲':
            // Cannon moves
            for (let direction of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
                let newRow = row + direction[0];
                let newCol = col + direction[1];
                let jumped = false;

                while (newRow >= 0 && newRow < 10 && newCol >= 0 && newCol < 9) {
                    if (!board[newRow][newCol]) {
                        if (!jumped) {
                            moves.push({ row: newRow, col: newCol });
                        }
                    } else {
                        if (!jumped) {
                            jumped = true;
                        } else {
                            if (board[newRow][newCol][0] !== color) {
                                moves.push({ row: newRow, col: newCol });
                            }
                            break;
                        }
                    }
                    newRow += direction[0];
                    newCol += direction[1];
                }
            }
            break;

        case '兵':
        case '卒':
            // Soldier moves
            const forward = color === 'r' ? 1 : -1;
            const crossedRiver = color === 'r' ? row > 4 : row < 5;

            // Forward move
            if (row + forward >= 0 && row + forward < 10) {
                if (!board[row + forward][col] || board[row + forward][col][0] !== color) {
                    moves.push({ row: row + forward, col });
                }
            }

            // Horizontal moves (only after crossing river)
            if (crossedRiver) {
                if (col > 0 && (!board[row][col - 1] || board[row][col - 1][0] !== color)) {
                    moves.push({ row, col: col - 1 });
                }
                if (col < 8 && (!board[row][col + 1] || board[row][col + 1][0] !== color)) {
                    moves.push({ row, col: col + 1 });
                }
            }
            break;
    }

    return moves;
}

// Piece values for AI evaluation
const pieceValues = {
    '車': 9, '车': 9,
    '馬': 4, '马': 4,
    '炮': 4.5, '砲': 4.5,
    '象': 2, '相': 2,
    '士': 2, '仕': 2,
    '兵': 1, '卒': 1,
    '将': 1000, '帅': 1000
};

function getPieceValue(piece) {
    if (!piece) return 0;
    const pieceType = piece.substring(1);
    return pieceValues[pieceType] || 0;
}

function simulateMove(fromRow, fromCol, toRow, toCol) {
    // Create a copy of the board for simulation
    const tempBoard = board.map(row => [...row]);
    const capturedPiece = tempBoard[toRow][toCol];
    tempBoard[toRow][toCol] = tempBoard[fromRow][fromCol];
    tempBoard[fromRow][fromCol] = '';
    return { board: tempBoard, capturedPiece };
}

function isGeneralInDanger(testBoard, color) {
    // Find the general position
    let generalRow = -1, generalCol = -1;
    const generalPieces = color === 'b' ? ['b将', 'b帅'] : ['r将', 'r帅'];

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (generalPieces.includes(testBoard[row][col])) {
                generalRow = row;
                generalCol = col;
                break;
            }
        }
        if (generalRow !== -1) break;
    }

    if (generalRow === -1) return true; // General not found = in danger

    // Check if any opponent piece can capture the general
    const opponentColor = color === 'r' ? 'b' : 'r';
    const savedBoard = board;
    board = testBoard;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = testBoard[row][col];
            if (piece && piece[0] === opponentColor) {
                const moves = getValidMoves(row, col);
                if (moves.some(m => m.row === generalRow && m.col === generalCol)) {
                    board = savedBoard;
                    return true;
                }
            }
        }
    }

    board = savedBoard;
    return false;
}

function evaluateMove(fromRow, fromCol, toRow, toCol) {
    let score = 0;
    const movingPiece = board[fromRow][fromCol];
    const targetPiece = board[toRow][toCol];

    // Simulate the move
    const simulation = simulateMove(fromRow, fromCol, toRow, toCol);

    // CRITICAL: Avoid moves that leave our general in danger
    if (isGeneralInDanger(simulation.board, 'b')) {
        return -10000; // Heavily penalize moves that expose the general
    }

    // Reward capturing opponent pieces (weighted by value)
    if (targetPiece && targetPiece[0] === 'r') {
        const captureValue = getPieceValue(targetPiece);
        score += captureValue * 10; // High priority for captures

        // Extra bonus for capturing the general (winning move)
        if (captureValue >= 1000) {
            score += 100000;
        }
    }

    // Check if this move threatens the opponent's general
    const savedBoard = board;
    board = simulation.board;
    const threateningGeneral = isGeneralInDanger(simulation.board, 'r');
    board = savedBoard;

    if (threateningGeneral) {
        score += 50; // Bonus for checking the opponent
    }

    // Defensive positioning: protect our general
    let ourGeneralRow = -1, ourGeneralCol = -1;
    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            if (board[row][col] === 'b将' || board[row][col] === 'b帅') {
                ourGeneralRow = row;
                ourGeneralCol = col;
                break;
            }
        }
        if (ourGeneralRow !== -1) break;
    }

    if (ourGeneralRow !== -1) {
        // Bonus for moving pieces closer to defend the general
        const oldDistance = Math.abs(fromRow - ourGeneralRow) + Math.abs(fromCol - ourGeneralCol);
        const newDistance = Math.abs(toRow - ourGeneralRow) + Math.abs(toCol - ourGeneralCol);

        const movingValue = getPieceValue(movingPiece);
        if (movingValue > 2 && newDistance < oldDistance && newDistance <= 3) {
            score += 5; // Encourage defensive positioning for valuable pieces
        }
    }

    // Positional bonuses
    // Move pieces forward (towards opponent)
    if (toRow < fromRow) {
        score += 1;
    }

    // Control the center
    const centerCols = [3, 4, 5];
    if (centerCols.includes(toCol)) {
        score += 2;
    }

    // Small random factor to add variety
    score += Math.random() * 0.5;

    return score;
}

function computerMove() {
    // Intelligent AI: evaluate all moves and choose the best one
    const allMoves = [];

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece && piece[0] === 'b') {
                const moves = getValidMoves(row, col);
                moves.forEach(move => {
                    const score = evaluateMove(row, col, move.row, move.col);
                    allMoves.push({
                        fromRow: row,
                        fromCol: col,
                        toRow: move.row,
                        toCol: move.col,
                        score: score
                    });
                });
            }
        }
    }

    if (allMoves.length > 0) {
        // Sort moves by score (best first)
        allMoves.sort((a, b) => b.score - a.score);

        // Choose from top 3 moves for some variety
        const topMoves = allMoves.slice(0, Math.min(3, allMoves.length));
        const move = topMoves[Math.floor(Math.random() * topMoves.length)];

        movePiece(move.fromRow, move.fromCol, move.toRow, move.toCol);
    }
}

function checkGameOver() {
    let redGeneral = false;
    let blackGeneral = false;

    for (let row = 0; row < 10; row++) {
        for (let col = 0; col < 9; col++) {
            const piece = board[row][col];
            if (piece === 'r将' || piece === 'r帅') redGeneral = true;
            if (piece === 'b将' || piece === 'b帅') blackGeneral = true;
        }
    }

    if (!redGeneral) {
        alert('黑方胜利！Black wins!');
        resetGame();
    } else if (!blackGeneral) {
        alert('红方胜利！Red wins!');
        resetGame();
    }
}

function updateTurnDisplay() {
    const turnElement = document.getElementById('turn');
    turnElement.textContent = currentPlayer === 'r' ? '红方回合 (Red\'s Turn)' : '黑方回合 (Black\'s Turn)';
}

function resetGame() {
    board = JSON.parse(JSON.stringify(initialBoard));
    currentPlayer = 'r';
    selectedCell = null;
    validMoves = [];
    updateTurnDisplay();
    createBoard();
}

// Initialize the game when the page loads
createBoard();
