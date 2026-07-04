import { Component, inject, signal } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { HttpErrorResponse } from '@angular/common/http';
import { UsersApiService } from '../../core/services/users-api.service';
import { CurrentUserService } from '../../core/services/current-user.service';

@Component({
  selector: 'app-register',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
  ],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class Register {
  private readonly usersApi = inject(UsersApiService);
  private readonly currentUserService = inject(CurrentUserService);
  private readonly router = inject(Router);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly submitting = signal(false);

  protected readonly form = new FormGroup({
    firstName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
    lastName: new FormControl('', { nonNullable: true, validators: [Validators.required] }),
  });

  protected submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }

    const { firstName, lastName } = this.form.getRawValue();
    this.submitting.set(true);

    this.usersApi.register({ firstName, lastName }).subscribe({
      next: ({ id }) => {
        this.currentUserService.set({ id, firstName, lastName });
        this.router.navigate(['/dashboard', id]);
      },
      error: (error: HttpErrorResponse) => {
        this.submitting.set(false);
        const message =
          error.status === 400
            ? 'A user with that name already exists.'
            : 'Registration failed. Please try again.';
        this.snackBar.open(message, 'Dismiss', { duration: 5000, panelClass: 'error-snack' });
      },
    });
  }
}
