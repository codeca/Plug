//
//  PlugDelegate.h
//  Plug
//
//  Created by Guilherme Souza on 4/23/14.
//  Copyright (c) 2014 Sitegui. All rights reserved.
//

#import <Foundation/Foundation.h>
@class Plug;

@protocol PlugDelegate <NSObject>

// Called after the connection is first established
// PLUG_STATE_CONNECTING -> PLUG_STATE_LOBBY
- (void)plugDidConnect:(Plug*)plug;

// Update info while in PLUG_STATE_RANDOM_MATCHING
// goal is the target number of players
- (void)plug:(Plug*)plug didReceiveRandomMatchUpdate:(NSUInteger)playersInRoom goal:(NSUInteger)goal;

// The matching is done and the game is starting
// Each element of players is a dictionary with keys "name" and "id" (both strings)
// The player order is the same for everybody in the room
// PLUG_STATE_RANDOM_MATCHING -> PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug didStartMatchWithPlayers:(NSArray*)players;

// Another player sent a game message
// Only happens while PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug didReceiveGameMessage:(id)message withType:(UInt16)type fromPlayer:(NSString*)playerId;

// Inform that a player has disconnected from the game
// clean indicates whether the player disconnected intentionally or not
// Only happens while PLUG_STATE_IN_GAME
- (void)plug:(Plug*)plug player:(NSString*)playerId didDisconnectClean:(BOOL)clean;

// The connection is now closed and nothing more can happen
// x -> PLUG_STATE_CLOSED
- (void)plug:(Plug*)plug didDisconnectClean:(BOOL)clean;

@optional

// TODO: resyncs

@end
