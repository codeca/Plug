/*globals describe, it*/
'use strict'

require('should')
var net = require('net')
var messageType = require('../messageTypes.js')

describe('identify',function(){
	it('should connect and identify',function(done){
		var conn = net.createConnection(8124)
		conn.once('connect',function(){
			var buffer = new Buffer(7+18)
			buffer[0] = 0
			buffer.writeUInt16BE(0,1)
			buffer.writeInt16BE(messageType.fromClient.IDENTIFICATION,3)
			buffer.writeUInt16BE(18,5)
			for (var idByte=7;idByte<16+7;idByte++){
				buffer[idByte] = Math.floor(Math.random()*256)
			}
			buffer.writeUInt16BE(2,16+7)
			console.log(buffer)
			conn.end(buffer)
		})
		conn.once('close',function(){
			done()
		})
	})	
})