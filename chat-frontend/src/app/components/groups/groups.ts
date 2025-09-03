import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, User, Group } from '../../services/api';

@Component({
  selector: 'app-groups',
  imports: [CommonModule, FormsModule],
  templateUrl: './groups.html',
  styleUrl: './groups.css'
})
export class Groups implements OnInit {

  currentUser: User | null = null
  allGroups: Group[] = [];
  allUsers: User[] = [];

  //New Group form fields
  newGroupName: string = '';
  selectedGroupId = '';
  selectedUserId = '';

  //UI State
  showCreateForm: boolean = false;
  errorMessage: string = '';
  successMessage: string = ''
  loading: boolean = false;

  constructor(private api: Api, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();

    this.loadData();
  }

  loadData(): void {
    this.loading = true;
    this.api.getGroups().subscribe({
      next: (groups) => {
        this.allGroups = groups;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load groups. Please try again later.';
        this.loading = false;
      }
    });

    if (this.api.isGroupAdmin()) {
      this.api.getUsers().subscribe({
        next: (users) => {
          this.allUsers = users;
        },
        error: (error) => {
          this.errorMessage = 'Failed to load users. Please try again later.';
        }
      });
    }
  }

  isGroupAdmin(): boolean {
    return this.api.isGroupAdmin() || this.api.isSuperAdmin();
  }

  isSuperAdmin(): boolean {
    return this.api.isSuperAdmin();
  }

  canManageGroup(group: Group): boolean {
    if(!this.currentUser) return false;
    if (this.api.isSuperAdmin()) return true;
    return group.admins.includes(this.currentUser.id);
  }

  isMemberOfGroup(group: Group): boolean {
    if(!this.currentUser) return false;
    return group.members.includes(this.currentUser.id);
  }

  createGroup(): void {
    this.errorMessage = '';
    this.successMessage = '';
    
    if (!this.newGroupName) {
      this.errorMessage = 'Please enter a group name.';
      return;
    }

    if (!this.isGroupAdmin()) {
      this.errorMessage = 'You do not have permission to create groups.';
      return;
    }

    this.loading = true;
    this.api.createGroup(this.newGroupName).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Group "${this.newGroupName}" created successfully.`;
          this.newGroupName = '';
          this.showCreateForm = false;
          this.loadData();
        } else {
          this.errorMessage = response.message || 'Failed to create group. Please try again.';
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'An error occurred while creating the group. Please try again later.';
        this.loading = false;
      }
    });
  }

  joinGroup(group: Group): void {

    if (!this.currentUser) return;

    this.loading = true;
    this.api.addUserToGroup(group.id, this.currentUser.id).subscribe({
      next : (response) => {
        if (response.success) {
          this.successMessage = `You have joined the group "${group.name}".`;
          this.loadData();
        } 
        this.loading = false;
      },
      error : (error) => {
        this.errorMessage = 'Failed to join group. Please try again later.';
        this.loading = false;
      }
    });
  }

  leaveGroup(group: Group): void {

    if (!this.currentUser) return;
    
    //Don't allow leaving if user is the only admin
    if (group.admins.includes(this.currentUser.id) && group.admins.length === 1) {
      this.errorMessage = 'Cannot leave group - you are the only admin';
      return;
    }

    this.loading = true;
    this.api.removeUserFromGroup(group.id, this.currentUser.id).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = `Left group "${group.name}"`;
          this.loadData();
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to leave group';
        this.loading = false;
      }
    });
  }

  addMemberToGroup(): void {
    if (!this.selectedGroupId || !this.selectedUserId) {
      this.errorMessage = 'Please select a group and user';
      return;
    }

    this.loading = true;
    this.api.addUserToGroup(this.selectedGroupId, this.selectedUserId).subscribe({
      next: (response) => {
        if (response.success) {
          const user = this.allUsers.find(u => u.id === this.selectedUserId);
          const group = this.allGroups.find(g => g.id === this.selectedGroupId);
          this.successMessage = `Added ${user?.username} to ${group?.name}`;
          this.selectedGroupId = '';
          this.selectedUserId = '';
          this.loadData();
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to add member';
        this.loading = false;
      }
    });
  }

  deleteGroup(group: Group): void {
    if (confirm(`Are you sure you want to delete the group "${group.name}"?`)) {
      this.loading = true;
      this.api.deleteGroup(group.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = `Group "${group.name}" deleted`;
            this.loadData();
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete group';
          this.loading = false;
        }
      });
    }
  }

  navigateToChannels(groupId: string): void {
    this.router.navigate(['/channels', groupId]);
  }

  getGroupMembers(group: Group): string {
    const memberNames = group.members
      .map(id => this.allUsers.find(u => u.id === id)?.username || 'Unknown')
      .slice(0, 3);
    
    const remaining = group.members.length - 3;
    if (remaining > 0) {
      memberNames.push(`+${remaining} more`);
    }
    
    return memberNames.join(', ');
  }


}
 
