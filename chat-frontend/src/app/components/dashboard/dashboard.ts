import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Api, User } from '../../services/api';

@Component({
  selector: 'app-dashboard',
  imports: [CommonModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css'
})
export class Dashboard implements OnInit {

  currentUser: User | null = null;
  
  loading = true;

  constructor(private api: Api, private router: Router) {}

  ngOnInit(): void {
    this.currentUser = this.api.getCurrentUser();

    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }
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

  logout(): void {
    this.api.logout();
    this.router.navigate(['/login']);
  }

}
