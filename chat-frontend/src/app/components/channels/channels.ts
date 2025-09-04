import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Api, User, Group, Channel } from '../../services/api';

@Component({
  selector: 'app-channels',
  imports: [CommonModule, FormsModule],
  templateUrl: './channels.html',
  styleUrl: './channels.css'
})
export class Channels implements OnInit {

  currentUser: User | null = null
  group: Group | null = null;
  channels: Channel[] = [];

  //Channel form fields
  newChannelName: string = '';

  //UI State
  showCreateForm: boolean = false
  errorMessage: string = '';
  successMessage: string = ''
  loading: boolean = false;
  groupId = '';

  constructor(private api: Api, private router: Router, private route: ActivatedRoute) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/dashboard']);
      return;
    }

    // Get group ID from route
    this.groupId = this.route.snapshot.paramMap.get('groupId') || '';
    if (this.groupId) {
      this.loadGroupAndChannels();
    } else {
      this.router.navigate(['/groups']);
    }
  }

  loadGroupAndChannels(): void {
    this.loading = true;
    
    // Load groups to find the current group
    this.api.getGroups().subscribe({
      next: (groups) => {
        this.group = groups.find(g => g.id === this.groupId) || null;
        
        if (!this.group) {
          this.router.navigate(['/groups']);
          return;
        }

        // Check if user is member of group
        if (!this.group.members.includes(this.currentUser!.id) && 
            !this.api.isSuperAdmin()) {
          this.errorMessage = 'You are not a member of this group';
          return;
        }

        // Load channels
        this.loadChannels();
      },
      error: (error) => {
        console.error('Error loading group:', error);
        this.router.navigate(['/groups']);
      }
    });
  }

  loadChannels(): void {
    this.api.getChannelsByGroup(this.groupId).subscribe({
      next: (channels) => {
        this.channels = channels;
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading channels:', error);
        this.errorMessage = 'Failed to load channels';
        this.loading = false;
      }
    });
  }

  canManageChannels(): boolean {
    if (!this.group) return false;
    if (this.api.isSuperAdmin()) return true;
    return this.group.admins.includes(this.currentUser!.id);
  }

  createChannel(): void {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.newChannelName.trim()) {
      this.errorMessage = 'Please enter a channel name';
      return;
    }

    if (!this.canManageChannels()) {
      this.errorMessage = 'You need to be a group admin to create channels';
      return;
    }

    this.loading = true;
    this.api.createChannel(this.newChannelName, this.groupId).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Channel "${this.newChannelName}" created successfully`;
          this.newChannelName = '';
          this.showCreateForm = false;
          this.loadChannels();
        } else {
          this.errorMessage = response.message || 'Failed to create channel';
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to create channel';
        this.loading = false;
      }
    });
  }

  deleteChannel(channel: Channel): void {
    if (confirm(`Are you sure you want to delete the channel "${channel.name}"?`)) {
      this.loading = true;
      this.api.deleteChannel(channel.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = `Channel "${channel.name}" deleted`;
            this.loadChannels();
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete channel';
          this.loading = false;
        }
      });
    }
  }

  navigateToChat(channelId: string): void {
    // Phase 2 - For now just navigate to placeholder
    this.router.navigate(['/chat', this.group!.id, channelId]);
  }

  isMemberOfChannel(channel: Channel): boolean {
    if (!this.currentUser) return false;
    return channel.members.includes(this.currentUser.id);
  }

  getMemberCount(channel: Channel): number {
    return channel.members.length;
  }

  goBack(): void {
    this.router.navigate(['/groups']);
  }
}
