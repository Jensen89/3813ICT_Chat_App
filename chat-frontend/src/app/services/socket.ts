import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { io, Socket } from 'socket.io-client' 

export interface Message {
  id?: string;
  channelId: string;
  userId: string;
  username: string;
  content: string;
  timestamp: Date;
}

@Injectable({
  providedIn: 'root'
})
export class SocketService {
  private socket: Socket;
  private serverUrl = 'http://localhost:3000';

  constructor() {
    this.socket = io(this.serverUrl);
  }

  //Connect user to socket
  connectUser(userId: string, username: string): void {
    this.socket.emit('user-connect', { userId, username });
  }

  //Join a channel
  joinChannel(channelId: string, userId: string, username: string): void {
    this.socket.emit('join-channel', { channelId, userId, username });
  }

  //Leave a channel
  leaveChannel(channelId: string, username: string): void {
    this.socket.emit('leave-channel', { channelId, username });
  }

  //Send a message
  sendMessage(channelId: string, userId: string, username: string, content: string): void {
    this.socket.emit('send-message', { 
      channelId, 
      userId, 
      username, 
      content 
    });
  }

  //Send typing indicator
  sendTyping(channelId: string, username: string): void {
    this.socket.emit('typing', { channelId, username });
  }

  //Stop typing indicator
  stopTyping(channelId: string, username: string): void {
    this.socket.emit('stop-typing', { channelId, username });
  }

  //Listen for message history
  onMessageHistory(): Observable<Message[]> {
    return new Observable(observer => {
      this.socket.on('message-history', (messages: Message[]) => {
        observer.next(messages);
      });
    });
  }

  //Listen for new messages
  onNewMessage(): Observable<Message> {
    return new Observable(observer => {
      this.socket.on('new-message', (message: Message) => {
        observer.next(message);
      });
    });
  }

  //Listen for user joining
  onUserJoined(): Observable<{username: string, channelId: string}> {
    return new Observable(observer => {
      this.socket.on('user-joined', (data) => {
        observer.next(data);
      });
    });
  }

  //Listen for user leaving
  onUserLeft(): Observable<{username: string, channelId: string}> {
    return new Observable(observer => {
      this.socket.on('user-left', (data) => {
        observer.next(data);
      });
    });
  }

  //Listen for typing indicators
  onUserTyping(): Observable<{username: string, channelId: string}> {
    return new Observable(observer => {
      this.socket.on('user-typing', (data) => {
        observer.next(data);
      });
    });
  }

  onUserStopTyping(): Observable<{username: string, channelId: string}> {
    return new Observable(observer => {
      this.socket.on('user-stop-typing', (data) => {
        observer.next(data);
      });
    });
  }

  //Listen for user disconnected
  onUserDisconnected(): Observable<{username: string}> {
    return new Observable(observer => {
      this.socket.on('user-disconnected', (data) => {
        observer.next(data);
      });
    });
  }

  //Disconnect socket
  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}
