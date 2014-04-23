"use strict"

var MESSAGE_TYPE_FROM_CLIENT = {
	IDENTIFICATION: -1, //message brings the playerId
	RANDOM_MATCH: -2, //player is asking for random match
	CANCEL_MATCHING: -3 //player dont want to match anymore
}

var MESSAGE_TYPE_FROM_SERVER = {
	UPDATE_MATCHING: -21, //update the number of players for matching
	GAME_STARTING: -22, //waiting room have enougth player to start a game
	PLAYER_QUIT_GAME: -23 //a player quit the game
}

module.exports.fromClient = MESSAGE_TYPE_FROM_CLIENT
module.exports.fromServer = MESSAGE_TYPE_FROM_SERVER