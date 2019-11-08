/* ----------- START GLOBAL VARIABLES ----------- */
const connect4Board = [[0, 0, 0, 0, 0, 0, 0],
				   [0, 0, 0, 0, 0, 0, 0],
				   [0, 0, 0, 0, 0, 0, 0],
				   [0, 0, 0, 0, 0, 0, 0],
				   [0, 0, 0, 0, 0, 0, 0],
				   [0, 0, 0, 0, 0, 0, 0]];

const EMPTY = ':white_medium_small_square:';
const P1SYMBOL = ':small_blue_diamond:';
const P2SYMBOL = ':small_orange_diamond:';

/* ----------- END GLOBAL VARIABLES ----------- */

module.exports = {
	/*
	getInitialBoard: Returns a copy of a clean connect 4 board
	Return:
		2D connect 4 board array
	*/
	getInitialBoard: function() {
		return JSON.parse(JSON.stringify(connect4Board));
	},

	/*
	sendGameMessage: Send a message through the client that updates users about the game
	Params: 
		client: the Discord bot object
		gameObject: the game object of the game that will be updated
	*/
	sendGameMessage: function(client, gameObject) {
		// Send the game message in the game channel
		// Then react 1-7 for the player's move (reactions are slow)
		client.channels.get(gameObject.gameId).send(gameMessage(gameObject)).then(function (gameMsg) {
			gameMsg.react('\u0031\u20E3')
			.then(() => gameMsg.react('\u0032\u20E3'))
			.then(() => gameMsg.react('\u0033\u20E3'))
			.then(() => gameMsg.react('\u0034\u20E3'))
			.then(() => gameMsg.react('\u0035\u20E3'))
			.then(() => gameMsg.react('\u0036\u20E3'))
			.then(() => gameMsg.react('\u0037\u20E3'));
		}).catch(err => console.error(err))
		 
	},

	/*
	sendInstructions: Send a message through the client that tells users how to play the game
	Params:
		client: the Discord bot object
		gameObject: the game object of the game that will be updated
	*/
	sendInstructions: function (client, gameObject) {
		client.channels.get(gameObject.gameId).send("Welcome to Connect4.\n" + 
													"The challenged user always goes first.\n" + 
													"Click on the reactions below the game board to place your game pieces.\n" + 
													`${P1SYMBOL} is ${gameObject.p1}.\n` + 
													`${P2SYMBOL} is ${gameObject.p2}.`);
	},

	/*
	sendWinningMessage: Send a message through the client that tells the users who won the game
	Params:
		client: the Discord bot object
		gameObject: the game object of the game that will be updated
	*/
	sendWinningMessage: function(client, gameObject) {
		client.channels.get(gameObject.gameId).send(winningMessage(gameObject)).then(() => {
		setTimeout(function() { client.channels.get(gameObject.gameId).delete(); }, 10000);
		}).catch(err => console.error(err));
	},

	/*
	doMove: Performs the player's move 
	Params:
		board: game board (2d array)
		player: the player performing the move
		move: player's move
	*/
	doMove: function(board, player, move) {
		// Return false if column is full
		if (isColumnFull(board, move-1)) return false;

		// Find valid row for given column(move)
		var r = 5;
		while (r >= 0 && board[r][move-1] != 0) {
			r--;
		}

		// Fill the found spot with the player's number(1 or 2)
		board[r][move-1] = player;
		return true;
	},

	// Source: https://stackoverflow.com/questions/33181356/connect-four-game-checking-for-wins-js
	/*
	checkWin: Checks if there is a winning board
	Params:
		bd: the game board
	Returns:
		1 or 2 if there is a winner, 0 otherwise 
	*/
	checkWin: function (bd) {
	    // Check down
	    for (r = 0; r < 3; r++)
	        for (c = 0; c < 7; c++)
	            if (chkLine(bd[r][c], bd[r+1][c], bd[r+2][c], bd[r+3][c]))
	                return bd[r][c];

	    // Check right
	    for (r = 0; r < 6; r++)
	        for (c = 0; c < 4; c++)
	            if (chkLine(bd[r][c], bd[r][c+1], bd[r][c+2], bd[r][c+3]))
	                return bd[r][c];

	    // Check down-right
	    for (r = 0; r < 3; r++)
	        for (c = 0; c < 4; c++)
	            if (chkLine(bd[r][c], bd[r+1][c+1], bd[r+2][c+2], bd[r+3][c+3]))
	                return bd[r][c];

	    // Check down-left
	    for (r = 3; r < 6; r++)
	        for (c = 0; c < 4; c++)
	            if (chkLine(bd[r][c], bd[r-1][c+1], bd[r-2][c+2], bd[r-3][c+3]))
	                return bd[r][c];

	    return 0;
	}

}


function toStringBoard(board) {
	var strBoard = '';
	for (r = 0; r < 6; r++) {
		for (c = 0; c < 7; c++) {
			var symbol = '';
			if (board[r][c] == 0) symbol = EMPTY;
			else if (board[r][c] == 1) symbol = P1SYMBOL;
			else symbol = P2SYMBOL;
			strBoard = strBoard + symbol;
		}
		strBoard = strBoard + '\n';
	}
	return strBoard;
}

function gameMessage(gameObject) {
	var strBoard = toStringBoard(gameObject.board);
	var message = `It is ${gameObject.turn.username}'s turn.\n` + strBoard;
	return message;
}

function winningMessage(gameObject) {
	var strBoard = toStringBoard(gameObject.board);
	var message = strBoard + '\n' +
				  `:tada: The winner of the match is ${gameObject.turn}! :tada:\n`;
	return message;
}

function deleteChannel(gameId) {
	client.channels.get(gameId).delete();
}

function isColumnFull(board, column) {
	return board[0][column] > 0;
}

// Source: https://stackoverflow.com/questions/33181356/connect-four-game-checking-for-wins-js
function chkLine(a,b,c,d) {
    // Check first cell non-zero and all cells match
    return ((a != 0) && (a ==b) && (a == c) && (a == d));
}
