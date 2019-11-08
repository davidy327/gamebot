const Discord = require('discord.js');
const { token, prefix, botChannelName, categoryName, challengesChannelName } = require('../config.json');
const Connect4 = require('./connect4.js');

const client = new Discord.Client();
const commands = ['']

/* ----------- START GLOBAL VARIABLES ----------- */
var GAMES_LIST = {};

var BOT_CHANNEL_ID = '';
var CATEGORY_CHANNEL_ID = '';
var CHALLENGES_CHANNEL_ID = '';

const ACCEPTED_GAMES = { 
							connect4: Connect4
						};

const NUM_LIST = { '\u0031\u20E3' : 1,
				 '\u0032\u20E3' : 2,
				 '\u0033\u20E3' : 3,
				 '\u0034\u20E3' : 4,
				 '\u0035\u20E3' : 5,
				 '\u0036\u20E3' : 6,
				 '\u0037\u20E3' : 7 };

/* ----------- END GLOBAL VARIABLES ----------- */

/* 
createGame: Create the game object using the given parameters
Params:
 	gameId: typically the id of the Discord channel 
	gameFunctions: game functions from the game files
	player1: user object of player 1 (challenger)
	player2: user object of player 2 (challenged)
Return:
	gameObject: the game object that holds the current state of the game 	
*/
function createGame(gameId, gameFunctions, player1, player2) {
	var board = gameFunctions.getInitialBoard(); 
	var gameObject = {
						'gameId': gameId, 
						'p1': player1,
						'p2': player2,
						'turn': player2,
						'board': board,
						'functions': gameFunctions
					};
	GAMES_LIST[gameId] = gameObject;
	return gameObject;
}


// Source: https://discordjs.guide/miscellaneous/parsing-mention-arguments.html#implementation
/*
getUserFromMention: Get the user object from a mentioned user in Discord chat
Params:
	mention: the user string in the form of <![discord id]>
Return:
	user: the Discord user object that contains all the info about the user
*/
function getUserFromMention(mention) {
	if (!mention) return;

	if (mention.startsWith('<@') && mention.endsWith('>')) {
		mention = mention.slice(2, -1);

		if (mention.startsWith('!')) {
			mention = mention.slice(1);
		}

		return client.users.get(mention);
	}
}


/*
createInitialChannels: Create the channels the bot uses or set the global id variables if they already exist
Params:
	guild: the Discord server that the bot is in
Return:
	None
*/
async function createInitialChannels(guild) {
	// Check if a category exists with the name in config.json
	// Create the channel if it doesn't exist
	var categoryChannel =  await guild.channels.find(channel => channel.name === categoryName && channel.type === 'category');
	if (!categoryChannel) {
		guild.createChannel(categoryName, { type: 'category' })
		.then(channel => {
			categoryChannel = channel;
			CATEGORY_CHANNEL_ID = channel.id;
		}).catch(err => { console.error(err); });
	} else {
		CATEGORY_CHANNEL_ID = categoryChannel.id;
	}
	
	// Check if a challenges channel exists with the name in config.json
	// Create the channel if it doesn't exist
	var challengesChannel = await guild.channels.find(channel => channel.name === challengesChannelName && channel.parentID === CATEGORY_CHANNEL_ID);
	if (!challengesChannel) {
		guild.createChannel(challengesChannelName, { type: 'text' })
		.then(channel => {
			challengesChannel = channel;
			CHALLENGES_CHANNEL_ID = channel.id;
			challengesChannel.setParent(CATEGORY_CHANNEL_ID);
		}).catch(err => { console.error(err); });
	} else {
		CHALLENGES_CHANNEL_ID = challengesChannel.id;
	}

	// Check if a bot command channel exists with the name in config.json
	// Create the channel if it doesn't exist
	var botCommandChannel = await guild.channels.find(channel => channel.name === botChannelName && channel.parentID === CATEGORY_CHANNEL_ID);
	if (!botCommandChannel) {
		guild.createChannel(botChannelName, { type: 'text' })
		.then(channel => {
			botCommandChannel = channel;
			BOT_CHANNEL_ID = channel.id;
			botCommandChannel.setParent(CATEGORY_CHANNEL_ID);
		}).catch(err => { console.error(err); });
	} else {
		BOT_CHANNEL_ID = botCommandChannel.id;
	}
}

client.on('ready', () => {
	console.log(`Logged in as ${client.user.tag}!`);
	createInitialChannels(client.guilds.first());
	console.log(`Ready...`);
});


client.on("guildCreate", guild => {
    console.log("Joined a new guild: " + guild.name);
	createInitialChannels(guild);
});

/*
isCorrectCommand: Checks if the command the user enters is correctly formatted or
				  is in the correct channel
Params: 
	messageObject: the Discord message object of the command that the user sent
Return:
	True if command follows the correct syntax, False otherwise
*/
function isCorrectCommand(messageObject) {
	// Bot ignores its own messages
	if (messageObject.author.bot) return false;
	// Name/id of channel the message comes from should be from 'botChannel'
	if (messageObject.channel.name !== botChannelName || messageObject.channel.id !== BOT_CHANNEL_ID) return false;
	// Message should start with the right prefix
	if (!messageObject.content.startsWith(prefix)) return false;


	return true;
}

client.on('message', message => {
	// Check if command is correct, ignore the message if not correct
	if (!isCorrectCommand(message)) return;

	var command = message.content.substring(1).split(' ');
	
	if (command[0] in ACCEPTED_GAMES) {
		var user = client.users.get(message.author.id);
		var opponent = getUserFromMention(command[1]);

		client.channels.find(channel => channel.name === 'challenges').send(
			`${user} is challenging ${opponent}. Click ✅ to accept and ❎ to decline. Game: ${command[0]}`)
		.then(function (botMessage) {
			botMessage.react('✅')
			.then(() => botMessage.react('❎'));
		}).catch(err => {
			console.error(err);
		});
	}
});

client.on('messageReactionAdd', async (reaction, user) => {
	// Ignore bot reactions
	if (user === client.user) return;

	// Handle when someone accepts or denies a challenge
	if ((reaction.emoji.name === '✅' || reaction.emoji.name ==='❎') && reaction.message.channel.id === CHALLENGES_CHANNEL_ID) {
		// Get challenger and challenged user objects from the bot message
		var beginning = reaction.message.content.indexOf('<@');
		var end = reaction.message.content.indexOf('>') + 1;
		var challenger = getUserFromMention(reaction.message.content.substring(beginning, end));

		beginning = reaction.message.content.lastIndexOf('<@');
		end = reaction.message.content.lastIndexOf('>') + 1;
		var challenged = getUserFromMention(reaction.message.content.substring(beginning, end));

		// Ignore other users that aren't challenger or challenged
		if (user.id !== challenger.id && user.id !== challenged.id) return;

		// Create a game room(text channel) for the game
		// And create a game object with unique game id for bot to keep track of
		if (reaction.emoji.name === '✅') {
			// Ignore challenger when they accept the game; only challenged can accept
			if (user.id !== challenged.id) return;

			var guild = reaction.message.guild;
			var category = await guild.channels.get(CATEGORY_CHANNEL_ID);
			var gameType = reaction.message.content.substring(reaction.message.content.indexOf('Game:')).split(' ')[1];
			var channelName = challenger.username + ' vs ' + challenged.username;
			// Create the channel where game will be played
			guild.createChannel(channelName, { type: 'text' })
			.then(channel => {
				channel.setParent(CATEGORY_CHANNEL_ID);
				var game = createGame(channel.id, ACCEPTED_GAMES[gameType], challenger, challenged);
				// Send instructions for the game
				game.functions.sendInstructions(client, game);
				game.functions.sendGameMessage(client, game);
			}).catch(err => console.error(err));
		}
		// Delete the bot's challenge message in the challenges channel
		reaction.message.delete();

	}

	// Do a player's move when they react with the corresponding number/column
	if (reaction.emoji.name === '\u0031\u20E3' || reaction.emoji.name === '\u0032\u20E3' || 
		reaction.emoji.name === '\u0033\u20E3' || reaction.emoji.name === '\u0034\u20E3' || 
		reaction.emoji.name === '\u0035\u20E3' || reaction.emoji.name === '\u0036\u20E3' ||
		reaction.emoji.name === '\u0037\u20E3') {

		var gameObject = GAMES_LIST[reaction.message.channel.id];

		// If it's not the reacting player's turn then ignore
		if (user.id !== gameObject.turn.id) return;

		var player = gameObject.p1.id === gameObject.turn.id ? 1 : 2;
		didMove = gameObject.functions.doMove(gameObject.board, player, NUM_LIST[reaction.emoji.name]);

		// If player's move was incorrect, they will need to do their move again
		if (!didMove) return;

		// Check if the player won from that move
		if (gameObject.functions.checkWin(gameObject.board)) {
			gameObject.functions.sendWinningMessage(client, gameObject);
			return;
		}

		// Alternate turns between players and send the current state of the board
		gameObject.turn = gameObject.p1 === gameObject.turn ? gameObject.p2 : gameObject.p1;
		gameObject.functions.sendGameMessage(client, gameObject);
	}
});

client.login(token);
