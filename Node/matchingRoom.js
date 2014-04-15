"use strict"

var messageTypes = require("./messageTypes.js")
var game = require("./game.js")

var waitingPlayers = {
	"2": [],
	"3": [],
	"4": [],
}


module.exports.removePlayer = waitingPlayers.removePlayer
module.exports.addPlayer = waitingPlayers.addPlayer

//Romove a player from the waiting room
//player is a Player instance
//Return true if successfully removed the player
waitingPlayers.removePlayer = function (player){
	for (var waitingRoom in waitingPlayers){
		var pos = waitingPlayers[waitingRoom].indexOf(player)
		if (pos != -1){
			waitingPlayers[waitingRoom].splice(pos,1)
			sendUpdatePlayers(waitingPlayers[waitingRoom])
			return true
		}
	}
	return false
}

//Add a player in the waiting room
//key is the number of players the player wants in the game
//player is a Player instance
//Return true if successfully added the player
waitingPlayers.addPlayer = function (key,player){
	var newGame
	if (!waitingPlayers[key]) return false
	waitingPlayers[key].push(player)
	if (waitingPlayers[key].length == key){
		newGame = new game(waitingPlayers[key])
		waitingPlayers[key].forEach(function(each){
			each._startGame(newGame)
		})
	}
	else{
		sendUpdatePlayers(waitingPlayers[key])
	}
}

var sendUpdatePlayers = function(players){
	var answer
	players.forEach(function(each){
		answer = new Buffer(1)
		answer[0] = players.length		
		each._sendProtocolMessage(messageTypes.fromServer.UPDATE_MATCHING,answer)
	})
}