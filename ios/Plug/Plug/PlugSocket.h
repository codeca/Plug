//
//  PlugSocket.h
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import <Foundation/Foundation.h>

@class PlugSocket;

typedef enum : NSUInteger {
    PLUG_SOCKET_STATE_OPENING, // Initial state
    PLUG_SOCKET_STATE_OPEN, // After the connection is established
    PLUG_SOCKET_STATE_CLOSED // When connection is dead, nothing more can be done here
} PlugSocketState;

@protocol PlugSocketDelegate<NSObject>

- (void)plugSocketDidOpen:(PlugSocket*)plugSocket;

- (void)plugSocket:(PlugSocket*)plugSocket didReceive:(NSData*)data;

- (void)plugSocketDidClose:(PlugSocket*)plugSocket;

@end

// Abstraction over lower level stream objects from iOs
@interface PlugSocket : NSObject

@property (nonatomic, readonly) PlugSocketState state;

@property (nonatomic, weak) id<PlugSocketDelegate> delegate;

// Create the socket and start the connection
- (instancetype)initWithHost:(NSString*)host andPort:(UInt32)port;

// While in PLUG_SOCKET_STATE_OPEN, add data to be sent
- (void)send:(NSData*)data;

// Close the connection
// x -> PLUG_SOCKET_STATE_CLOSED
- (void)close;

@end
