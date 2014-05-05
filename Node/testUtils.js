"use strict"

var messageTypes = require('./messageTypes.js')
module.exports.createStandardMessageBuffer = createStandardMessageBuffer
module.exports.createIdentificationMessageBuffer = createIdentificationMessageBuffer


//Return a buffer with the message structure (0+messageId+messageType+messageSize+message)
//messageId is a 2 bytes uint
//messageType is a 2 bytes int (see messageTypes.js)
//message is a buffer
function createStandardMessageBuffer(messageId,messageType,message){
	var buffer = new Buffer(7+message.length)
	buffer[0] = 0
	buffer.writeUInt16BE(messageId,1)
	buffer.writeInt16BE(messageType,3)
	buffer.writeUInt16BE(message.length,5)
	for (var i=7;i<buffer.length;i++) {
		buffer[i] = message[i-7]
	}
	return buffer
}

//Return a buffer with identification message (0+00+IdentificationId+messageSize+playerId+version)
//version is a 2 bytes int
//playerId is randomly generated 16 bytes
//IdentificationId is a messageType (see messageTypes.js)
function createIdentificationMessageBuffer(version){
	var message = new Buffer(18)
	for (var idByte=0;idByte<16;idByte++){
		message[idByte] = Math.floor(Math.random()*256)
	}
	message.writeUInt16BE(version,16)
	return createStandardMessageBuffer(0,messageTypes.fromClient.IDENTIFICATION,message)
}

