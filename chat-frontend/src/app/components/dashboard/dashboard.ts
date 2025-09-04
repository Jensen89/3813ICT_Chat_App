import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Api, User, Group } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  currentUser: User | null = null;
  userGroups: Group[] = [];
  allUsers: User[] = [];
  
  errorMessage: string = '';
  successMessage: string = '';
  
  loading = true;

  constructor(private api: Api, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
    this.loadUserGroups();
    this.loadUsers();
  }

  getRoleDisplay(): string {
    if (!this.currentUser) return '';

    if (this.currentUser.roles.includes('super_admin')) {
      return 'Super Admin';
    } else if (this.currentUser.roles.includes('group_admin')) {
      return 'Group Admin';
    } else {
      return 'User';
    }
  }

  loadUserGroups(): void {
    this.api.getGroups().subscribe({
      next: (groups) => {
        //Filter groups where user is a member
        this.userGroups = groups.filter(group => 
          group.members.includes(this.currentUser!.id)
        );
        this.loading = false;
      },
      error: (error) => {
        console.error('Error loading groups:', error);
        this.loading = false;
      }
    });
  }

  loadUsers(): void {
    this.loading = true;
    this.api.getUsers().subscribe({
      next: (users) => {
        this.allUsers = users;
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Failed to load users. Please try again later.';
        this.loading = false;
      }
    });
  }

  deleteUser(user: User): void {
     if (confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      this.loading = true;
      this.api.deleteUser(user.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = `User "${user.username}" deleted successfully.`;
            this.loadUsers();
            this.navigateToLogin();
          } 
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Failed to delete user. Please try again later.';
          this.loading = false;
        }
      });
    }
  }

  isSuperAdmin(): boolean {
    return this.api.isSuperAdmin();
  }
  
  isGroupAdmin(): boolean {
    return this.api.isGroupAdmin();
  }

  navigateToGroups(): void {
    this.router.navigate(['/groups']);
  }

  navigateToChannels(): void {
    this.router.navigate(['/channels']);
  }

  navigateToUsers(): void {
    this.router.navigate(['/users']);
  }

  navigateToLogin(): void {
    this.router.navigate(['/login']);
  }

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

}
