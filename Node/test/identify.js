/*globals describe, it*/
'use strict'

require('should')
var net = require('net')
var messageType = require('../messageTypes.js')
var testUtils = require('../testUtils.js')

describe('identify',function(){
	it('should connect and identify',function(done){
		var conn = net.createConnection(8124)
		conn.once('connect',function(){
			var buffer = testUtils.createIdentificationMessageBuffer(2)
			console.log(buffer)
			conn.end(buffer)
		})
		conn.once('close',function(){
			done()
		})
	})	
})