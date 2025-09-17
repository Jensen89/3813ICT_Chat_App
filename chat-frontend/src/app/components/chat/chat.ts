import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Api, User, Group, Channel } from '../../services/api';
import { SocketService, Message } from '../../services/socket';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-chat',
  imports: [CommonModule, FormsModule],
  templateUrl: './chat.html',
  styleUrl: './chat.css'
})
export class ChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollContainer') private scrollContainer!: ElementRef;

  currentUser: User | null = null;
  group: Group | null = null;
  channel: Channel | null = null;
  
  messages: Message[] = [];
  newMessage = '';
  typingUsers: Set<string> = new Set();
  
  //Subscriptions
  private subscriptions: Subscription[] = [];
  private typingTimer: any;
  private isTyping = false;

  constructor(
    private apiService: Api,
    private socketService: SocketService,
    private route: ActivatedRoute,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.route.params.subscribe(params => {
  });
    this.currentUser = this.apiService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    //Get group and channel IDs from route
    const groupId = this.route.snapshot.paramMap.get('groupId');
    const channelId = this.route.snapshot.paramMap.get('channelId');
    
    if (groupId && channelId) {
      this.loadChatInfo(groupId, channelId);
      this.initializeSocketConnection(channelId);
    } else {
      this.router.navigate(['/groups']);
    }

    this.scrollToBottom();
  }

  ngAfterViewChecked() {
    this.scrollToBottom();
  }

  ngOnDestroy(): void {
    //Clean up subscriptions
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    //Leave channel and disconnect
    if (this.channel) {
      this.socketService.leaveChannel(this.channel.id, this.currentUser!.username);
    }
  }

  loadChatInfo(groupId: string, channelId: string): void {
    //Load group and channel info
    this.apiService.getGroups().subscribe({
      next: (groups) => {
        this.group = groups.find(g => g.id === groupId) || null;
        if (!this.group) {
          this.router.navigate(['/groups']);
          return;
        }

        this.apiService.getChannelsByGroup(groupId).subscribe({
          next: (channels) => {
            this.channel = channels.find(c => c.id === channelId) || null;
            if (!this.channel) {
              this.router.navigate(['/channels', groupId]);
              return;
            }

            //Check if user has access
            if (!this.channel.members.includes(this.currentUser!.id) && 
                !this.apiService.isSuperAdmin()) {
              this.router.navigate(['/groups']);
            }
          }
        });
      }
    });
  }

  initializeSocketConnection(channelId: string): void {
    if (!this.currentUser) return;

    this.socketService.connectUser(this.currentUser.id, this.currentUser.username);
    
    this.socketService.joinChannel(channelId, this.currentUser.id, this.currentUser.username);

    //Subscribe to message history
    const historySub = this.socketService.onMessageHistory().subscribe(messages => {
      this.messages = messages;
      this.scrollToBottom();
    });
    this.subscriptions.push(historySub);

    //Subscribe to new messages
    const messageSub = this.socketService.onNewMessage().subscribe(message => {
      this.messages.push(message);
      this.scrollToBottom();
    });
    this.subscriptions.push(messageSub);

    //Subscribe to user joined/left
    const joinSub = this.socketService.onUserJoined().subscribe(data => {
      if (data.channelId === channelId) {
        this.addSystemMessage(`${data.username} joined the channel`);
      }
    });
    this.subscriptions.push(joinSub);

    const leaveSub = this.socketService.onUserLeft().subscribe(data => {
      if (data.channelId === channelId) {
        this.addSystemMessage(`${data.username} left the channel`);
      }
    });
    this.subscriptions.push(leaveSub);

    //Subscribe to typing indicators
    const typingSub = this.socketService.onUserTyping().subscribe(data => {
      if (data.channelId === channelId && data.username !== this.currentUser!.username) {
        this.typingUsers.add(data.username);
      }
    });
    this.subscriptions.push(typingSub);

    const stopTypingSub = this.socketService.onUserStopTyping().subscribe(data => {
      if (data.channelId === channelId) {
        this.typingUsers.delete(data.username);
      }
    });
    this.subscriptions.push(stopTypingSub);
  }

  sendMessage(): void {
    if (!this.newMessage.trim() || !this.channel || !this.currentUser) return;

    this.socketService.sendMessage(
      this.channel.id,
      this.currentUser.id,
      this.currentUser.username,
      this.newMessage
    );

    this.newMessage = '';
    this.stopTyping();
  }

  onTyping(): void {
    if (!this.channel || !this.currentUser) return;

    if (!this.isTyping) {
      this.isTyping = true;
      this.socketService.sendTyping(this.channel.id, this.currentUser.username);
    }

    //Clear existing timer
    clearTimeout(this.typingTimer);

    //Set new timer to stop typing after 2 seconds
    this.typingTimer = setTimeout(() => {
      this.stopTyping();
    }, 2000);
  }

  stopTyping(): void {
    if (this.isTyping && this.channel && this.currentUser) {
      this.isTyping = false;
      this.socketService.stopTyping(this.channel.id, this.currentUser.username);
      clearTimeout(this.typingTimer);
    }
  }

  addSystemMessage(content: string): void {
    const systemMessage: Message = {
      id: Date.now().toString(),
      channelId: this.channel?.id || '',
      userId: 'system',
      username: 'System',
      content,
      timestamp: new Date()
    };
    this.messages.push(systemMessage);
  }

  formatTime(timestamp: Date | string): string {
    const date = new Date(timestamp);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }

  getTypingText(): string {
    const users = Array.from(this.typingUsers);
    if (users.length === 0) return '';
    if (users.length === 1) return `${users[0]} is typing...`;
    if (users.length === 2) return `${users[0]} and ${users[1]} are typing...`;
    return `${users[0]} and ${users.length - 1} others are typing...`;
  }

  scrollToBottom(): void {
    try {
      if (this.scrollContainer) {
        this.scrollContainer.nativeElement.scrollTop = 
          this.scrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  goBack(): void {
    if (this.channel && this.currentUser) {
      this.socketService.leaveChannel(this.channel.id, this.currentUser.username);
    }
    
    if (this.group) {
      this.router.navigate(['/channels', this.group.id]);
    } else {
      this.router.navigate(['/groups']);
    }
  }
}
