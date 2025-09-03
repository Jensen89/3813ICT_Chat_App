import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable, of } from 'rxjs';
import { catchError } from 'rxjs/operators';


export interface User {
  id: string;
  username: string;
  email: string;
  password?: string;
  roles: string[];
  groups: string[];
}

export interface Group {
  id: string;
  name: string;
  admins: string[];
  members: string[];
}

export interface Channel {
  id: string;
  name: string;
  groupId: string;
  members: string[];
}


@Injectable({
  providedIn: 'root'
})
export class Api {
  
  private baseUrl = 'http://localhost:3000/api'; 
  private currentUser: User | null = null;

  constructor(private http: HttpClient) {

    const stored = localStorage.getItem('currentUser');
      if (stored) {
      this.currentUser = JSON.parse(stored);
    }
  }

  //Authentication Methods

  login(username: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(
        map(response => {
          if (response.success) {
            this.currentUser = response.user;
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          }
          return response;
        }),
        catchError(error => of({ success: false, message: error.error?.message ?? 'Server error'})
      ));
  }

  logout(): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/auth/logout`, {})
      .pipe(
        map(response => {
          this.currentUser = null;
          localStorage.removeItem('currentUser');
          return response;
        }),
        catchError(error => of({ success: false, message: error.error?.message ?? 'Server error'})
      ));
  }

  getCurrentUser(): User | null {
    return this.currentUser;
  }

  isLoggedIn(): boolean {
    return this.currentUser !== null;
  }

  isSuperAdmin(): boolean {
    return this.currentUser?.roles.includes('super_admin') || false;
  }

  isGroupAdmin(): boolean {
    return this.currentUser?.roles.includes('group_admin') || false;
  }




}
