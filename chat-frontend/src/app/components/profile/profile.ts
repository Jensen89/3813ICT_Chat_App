import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Api, User } from '../../services/api';

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './profile.html',
  styleUrls: ['./profile.css']
})
export class Profile implements OnInit {
  currentUser: User | null = null;
  selectedFile: File | null = null;
  previewUrl: string | null = null;
  loading = false;
  errorMessage = '';
  successMessage = '';

  constructor(
    private apiService: Api,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.currentUser = this.apiService.getCurrentUser();
    
    if (!this.currentUser) {
      this.router.navigate(['/login']);
      return;
    }

    //Set existing profile image if available
    if (this.currentUser.profileImage) {
      this.previewUrl = this.currentUser.profileImage;
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files[0];
    
    if (file) {
      //Validate file type
      if (!file.type.startsWith('image/')) {
        this.errorMessage = 'Please select an image file';
        return;
      }

      //Validate file size (5MB max)
      if (file.size > 5 * 1024 * 1024) {
        this.errorMessage = 'File size must be less than 5MB';
        return;
      }

      this.selectedFile = file;
      this.errorMessage = '';

      //Create preview
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
      };
      reader.readAsDataURL(file);
    }
  }

  uploadProfileImage(): void {
    if (!this.selectedFile || !this.currentUser) {
      this.errorMessage = 'Please select an image first';
      return;
    }

    this.loading = true;
    this.errorMessage = '';
    this.successMessage = '';

    this.apiService.uploadProfileImage(this.currentUser.id, this.selectedFile).subscribe({
      next: (response) => {
        if (response.success) {
          this.successMessage = 'Profile image uploaded successfully!';
          
          //Update current user with new profile image
          if (this.currentUser && response.user) {
            this.currentUser.profileImage = response.user.profileImage;
            //Update stored user
            localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
          }
          
          this.selectedFile = null;
        } else {
          this.errorMessage = response.message || 'Upload failed';
        }
        this.loading = false;
      },
      error: (error) => {
        this.errorMessage = 'Error uploading image';
        this.loading = false;
        console.error('Upload error:', error);
      }
    });
  }

  removeProfileImage(): void {
    if (!this.currentUser) return;

    if (confirm('Are you sure you want to remove your profile image?')) {
      this.loading = true;
      
      this.apiService.removeProfileImage(this.currentUser.id).subscribe({
        next: (response) => {
          if (response.success) {
            this.successMessage = 'Profile image removed';
            this.previewUrl = null;
            
            //Update current user
            if (this.currentUser) {
              this.currentUser.profileImage = null;
              localStorage.setItem('currentUser', JSON.stringify(this.currentUser));
            }
          }
          this.loading = false;
        },
        error: (error) => {
          this.errorMessage = 'Error removing image';
          this.loading = false;
        }
      });
    }
  }

  goBack(): void {
    this.router.navigate(['/dashboard']);
  }
}