"use strict"

var players = Object.create(null)


var PLAYER_STATE = {
	UNKNOWN:0, 
	LOBBY:1,
	MATCHING:2,
	GAME:3,
	CLOSING:4, //Preparing to close
	CLOSED:5, //Finilize the connection close
	LOST:6 //When resyncing
}

//Player constructor
function Player(conn){
	
	this.name = ""
	this.playerId = ""
	this.data = null
	this.state = PLAYER_STATE.UNKNOWN
	this._lastSeenId = 0
	
	this.game = null
	//messages contains a raw message with format: 0+Id(2)+Type(2)+MessageSize(2)+Message
	this._messages = []
	
	this._buffer = new Buffer(0)

	this._conn = conn
	this._conn.on("readable", onreadable(this))
	
}

/*
for (idToSend = id; idToSend<this._messages.length;idToSend++){
					this._conn.write(this._messages[idToSend])
				}			
*/

Player.prototype._processBuffer = function(){
	var id, size, type, message
	while(1){
		//No messages
		if (!this._buffer.length) break
		
		//Asking for resync
		if(this._buffer[0] == 1){
			if (this._buffer.length < 3) break
			id = this._buffer.readUInt16LE(1)
			this._processResync(id)
			this._buffer = this._buffer.slice(3)
		}
		
		//Normal message
		else if(this._buffer[0] == 0){
			if (this._buffer.length < 7) break
			id = this._buffer.readUInt16LE(1)
			type = this._buffer.readInt16LE(3)
			size = this._buffer.readUInt16LE(5)
			if (this._buffer.length < 7+size) break
			
			//Im lost, ask for resync
			if (id > this._lastSeenId + 1){
				this._processLostState(id)
			}
			
			//Process normal message
			else if(id == this._lastSeenId + 1){
				message = this._buffer.slice(7,7+size)
				this._processMessage(type,message)
				this._lastSeenId++
			}
			
			this._buffer = this._buffer.slice(7+size)
			
		}
		else{
			//Invalid Message
			this._conn.destroy()
			this.state = PLAYER_STATE.CLOSED
			break
		}
	}
}

Player.prototype._processResync = function(id){
	
}
Player.prototype._processLostState = function(id){
}
Player.prototype._processMessage = function(type,message){
}
//#sadface

function onreadable(player){
	return function () {
		var buffer = player._conn.read()
		if (buffer) {
			player._buffer = Buffer.concat([player._buffer, buffer],player._buffer.length+buffer.length)
			player._buffer._processBuffer()
		}
	}
}