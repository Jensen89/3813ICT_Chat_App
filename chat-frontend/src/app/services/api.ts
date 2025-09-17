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
  profileImage?: string | null;
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
    return this.hasRole('super_admin');
  }

  isGroupAdmin(): boolean {
    return this.hasRole('group_admin');
  }

  hasRole(role: string): boolean {
    return this.currentUser ? this.currentUser.roles.includes(role) : false;
  }


  //User Methods
  getUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.baseUrl}/users`);
  }

  createUser(username: string, email: string, password: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users`, { username, email, password });
  }

  deleteUser(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/users/${userId}`);
  }

  promoteUser(userId: string, role: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/users/${userId}/promote`, { role });
  }

  uploadProfileImage(userId: string, file: File): Observable<any> {
    const formData = new FormData();
    formData.append('image', file);

    return this.http.post<any>(`${this.baseUrl}/users/${userId}/upload-profile-image`, formData);
  }

  removeProfileImage(userId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/users/${userId}/profile-image`);
  }


  //Group Methods
  getGroups(): Observable<Group[]> {
    return this.http.get<Group[]>(`${this.baseUrl}/groups`);
  }

  createGroup(name: string, adminId?: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/groups`, { name, adminId });
  }

  deleteGroup(groupId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/groups/${groupId}`);
  }

  addUserToGroup(groupId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/groups/${groupId}/members`, { userId });
  }

  removeUserFromGroup(groupId: string, userId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/groups/${groupId}/members/${userId}`);
  }

  //Channel Methods

  getChannelsByGroup(groupId: string): Observable<Channel[]> {
    return this.http.get<Channel[]>(`${this.baseUrl}/groups/${groupId}/channels`);
  }

  createChannel(name: string, groupId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/channels`, { name, groupId });
  }

  deleteChannel(channelId: string): Observable<any> {
    return this.http.delete<any>(`${this.baseUrl}/channels/${channelId}`);
  }

  joinChannel(channelId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/channels/${channelId}/join`, { userId });
  }

  leaveChannel(channelId: string, userId: string): Observable<any> {
    return this.http.post<any>(`${this.baseUrl}/channels/${channelId}/leave`, { userId });
  }

}
