//
//  PlugSocket.m
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import "PlugSocket.h"

@interface PlugSocket()<NSStreamDelegate> {
	// Low level socket
	NSInputStream* inputStream;
	NSOutputStream* outputStream;
	NSMutableData* writeBuffer;
	
	BOOL halfOpen;
	BOOL outputDrained;
}

@property (nonatomic, readwrite) PlugSocketState state;

@end

@implementation PlugSocket

- (instancetype)initWithHost:(NSString *)host andPort:(UInt32)port {
	if (self = [super init]) {
		CFReadStreamRef readStream;
		CFWriteStreamRef writeStream;
		CFStreamCreatePairWithSocketToHost(NULL, (__bridge CFStringRef)host, port, &readStream, &writeStream);
		inputStream = (__bridge_transfer NSInputStream*)readStream;
		outputStream = (__bridge_transfer NSOutputStream*)writeStream;
		
		[inputStream setDelegate:self];
		[outputStream setDelegate:self];
		[inputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
		[outputStream scheduleInRunLoop:[NSRunLoop currentRunLoop] forMode:NSDefaultRunLoopMode];
		[inputStream open];
		[outputStream open];
		
		writeBuffer = [NSMutableData data];
		
		self.state = PLUG_SOCKET_STATE_OPENING;
	}
	return self;
}

- (void)send:(NSData *)data {
	if (self.state != PLUG_SOCKET_STATE_OPEN)
		[[NSException exceptionWithName:@"NotOpened" reason:@"Can't write to a non-opened socket" userInfo:nil] raise];
	[writeBuffer appendData:data];
	[self write];
}

- (void)close {
	if (self.state != PLUG_SOCKET_STATE_CLOSED) {
		[inputStream close];
		[outputStream close];
		self.state = PLUG_SOCKET_STATE_CLOSED;
		[self.delegate plugSocketDidClose:self];
	}
}

#pragma mark - stream events

- (void)stream:(NSStream *)aStream handleEvent:(NSStreamEvent)eventCode {
	if (eventCode & NSStreamEventOpenCompleted) {
		// Stream opened
		if (halfOpen) {
			// Connected
			self.state = PLUG_SOCKET_STATE_OPEN;
			halfOpen = NO;
			[self.delegate plugSocketDidOpen:self];
		} else
			// Wait for both streams to open
			halfOpen = YES;
	} else if (eventCode & NSStreamEventEndEncountered || eventCode & NSStreamEventErrorOccurred) {
		// Stream closed
		[self close];
	} else if (aStream == outputStream && eventCode & NSStreamEventHasSpaceAvailable) {
		// The client can send more data
		outputDrained = YES;
		[self write];
	} else if (aStream == inputStream && eventCode & NSStreamEventHasBytesAvailable) {
		// Data has arrived
		[self read];
	}
}

#pragma mark - socket low level read/write

- (void)read {
	static uint8_t buffer[512];
	NSInteger readLen;
	NSMutableData* readBuffer = [NSMutableData data];
	
	if (self.state != PLUG_SOCKET_STATE_OPEN)
		return;
	
	do {
		readLen = [inputStream read:buffer maxLength:512];
		if (readLen > 0)
			[readBuffer appendBytes:buffer length:readLen];
	} while (readLen == 512);
	
	if (readLen < 0) {
		// Error
		[self close];
		return;
	}
	
	[self.delegate plugSocket:self didReceive:readBuffer];
}

// Try to send more data to the system
- (void)write {
	if (!outputDrained) {
		// Wait more
		return;
	} else if (!writeBuffer.length || self.state != PLUG_SOCKET_STATE_OPEN) {
		// Nothing to be done
		return;
	}
	
	// Write
	NSUInteger len = writeBuffer.length;
	NSInteger writtenLen = [outputStream write:writeBuffer.bytes maxLength:len];
	
	// Check the operation result
	if (writtenLen == -1) {
		// Error
		[self close];
		return;
	}
	
	if (writtenLen)
		[writeBuffer replaceBytesInRange:NSMakeRange(0, writtenLen) withBytes:NULL length:0];
	
	if (writtenLen != len)
		// The system buffer is full
		outputDrained = NO;
}

@end
