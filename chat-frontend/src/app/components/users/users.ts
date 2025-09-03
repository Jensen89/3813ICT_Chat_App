import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Api, User } from '../../services/api';


@Component({
  selector: 'app-users',
  imports: [CommonModule],
  templateUrl: './users.html',
  styleUrl: './users.css'
})
export class Users implements OnInit {

  currentUser: User | null = null;
  allUsers: User[] = [];
  
  errorMessage: string = '';
  successMessage: string = '';
  loading = false;

  constructor(private api: Api, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();

    //Only super admins can access user management
    if (!this.currentUser || !this.api.isSuperAdmin()) {
      this.router.navigate(['/dashboard']);
      return;
    }

    this.loadUsers();
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

  getRoleDisplay(user: User): string {
    if (user.roles.includes('super_admin')) {
      return 'Super Admin';
    } else if (user.roles.includes('group_admin')) {
      return 'Group Admin';
    } else {
      return 'User';
    }
  }

  deleteUser(user: User): void {
     if (confirm(`Are you sure you want to delete user "${user.username}"? This action cannot be undone.`)) {
      this.loading = true;
      this.api.deleteUser(user.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = `User "${user.username}" deleted successfully.`;
            this.loadUsers();
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

  getGroupCount(user: User): number {
    return user.groups.length;
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}
