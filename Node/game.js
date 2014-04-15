"use strict"

var playerState = require("./player.js")
var messageTypes = require("./messageTypes.js")

module.exports = Game

function Game(players){
	this._playersIdMessage = new Buffer(16*4)
	var i
	this._players = players
	this._playersIdMessage.fill(0)
	for (i=0;i<players.length;i++){
		this._playersIdMessage.write(players[i].playerId,16*i,16,"hex")
	}
}

Game.prototype._broadcast = function(player,message){
	var messageToBeSend
	if (player.state != playerState.GAME){
		player._protocolError("player not in game trying to broadcast message")
	}
	messageToBeSend = new Buffer(message.length-3)
	message.copy(messageToBeSend,0,3)
	this._players.forEach(function(each){
		if(each == player) return
		each._sendGameMessage(messageToBeSend)
	})	
}

Game.prototype._removePlayer = function(player){
	var pos
	pos = this._players.indexOf(player)
	if (pos == -1){
		player._protocolError("player not in game")
	}
	this.splice(pos,1)
	this.forEach(function(each){
		each._sendProtocolMessage(messageTypes.fromServer.PLAYER_QUIT_GAME,player.playerId)
	})
}