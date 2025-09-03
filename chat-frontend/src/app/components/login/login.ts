import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api } from '../../services/api';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {

  //Login form fields
  username: string = '';
  password: string = '';

  //Registration form fields
  showRegister: boolean = false;
  regUsername: string = '';
  regEmail: string = '';
  regPassword: string = '';

  //Messages
  errorMessage: string = '';
  successMessage: string = '';
  loading: boolean = false;

  constructor(private api: Api, private router: Router) {}

  login(): void {
    this.errorMessage = '';
    this.loading = true;

    if (!this.username || !this.password) {
      this.errorMessage = 'Please enter both username and password.';
      this.loading = false;
      return;
    }

    this.api.login(this.username, this.password).subscribe({
      next : (response) => {
        if (response.success) {
          this.router.navigate(['/dashboard']);
        } else {
          this.errorMessage = response.message || 'Login failed. Please try again.';
        }
        this.loading = false;
      },
      error : (error) => {
        this.errorMessage = 'An error occurred during login. Please try again later.';
        this.loading = false;
      }
    });
  }

  register(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.loading = true;

    if (!this.regUsername || !this.regEmail || !this.regPassword) {
      this.errorMessage = 'Please fill in all registration fields.';
      this.loading = false;
      return;
    }

    this.api.createUser(this.regUsername, this.regEmail, this.regPassword).subscribe({
      next : (response) => {
        if (response.success) {
          this.successMessage = 'Registration successful! You can now log in.';
          this.showRegister = false;
          this.regUsername = '';
          this.regEmail = '';
          this.regPassword = '';
        } else {
          this.errorMessage = response.message || 'Registration failed. Please try again.';
        }
        this.loading = false;
      },
      error : (error) => {
        this.errorMessage = 'An error occurred during registration. Please try again later.';
        this.loading = false;
      }
    });
  }

  toggleRegister(): void {
    this.showRegister = !this.showRegister;
    this.errorMessage = '';
    this.successMessage = '';
  }

}
