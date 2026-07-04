import { Component, inject, signal } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatTableModule } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { LeaderboardEntry, MAX_COMPARISON_USERS } from '../../../core/models/leaderboard.model';

export interface CompareUsersDialogData {
  entries: LeaderboardEntry[];
  initiallySelected: string[];
}

@Component({
  selector: 'app-compare-users-dialog',
  imports: [MatDialogModule, MatButtonModule, MatCheckboxModule, MatTableModule],
  templateUrl: './compare-users-dialog.html',
  styleUrl: './compare-users-dialog.scss',
})
export class CompareUsersDialog {
  private readonly dialogRef = inject(MatDialogRef<CompareUsersDialog, LeaderboardEntry[]>);
  private readonly data = inject<CompareUsersDialogData>(MAT_DIALOG_DATA);
  private readonly snackBar = inject(MatSnackBar);

  protected readonly maxSelection = MAX_COMPARISON_USERS;
  protected readonly entries = this.data.entries;
  protected readonly displayedColumns = ['select', 'rank', 'name', 'points'];
  protected readonly selectedIds = signal(new Set(this.data.initiallySelected));

  protected isSelected(userId: string): boolean {
    return this.selectedIds().has(userId);
  }

  protected toggle(userId: string): void {
    const current = this.selectedIds();

    if (current.has(userId)) {
      const next = new Set(current);
      next.delete(userId);
      this.selectedIds.set(next);
      return;
    }

    if (current.size >= this.maxSelection) {
      this.snackBar.open(
        `You can compare at most ${this.maxSelection} users at once.`,
        'Dismiss',
        { duration: 4000, panelClass: 'error-snack' },
      );
      return;
    }

    const next = new Set(current);
    next.add(userId);
    this.selectedIds.set(next);
  }

  protected apply(): void {
    const selected = this.entries.filter((entry) => this.selectedIds().has(entry.userId));
    this.dialogRef.close(selected);
  }

  protected cancel(): void {
    this.dialogRef.close();
  }
}
