import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CompareUsersDialog } from './compare-users-dialog';

function entry(userId: string, rank: number) {
  return { userId, rank, firstName: 'A', lastName: 'B', totalPoints: 0, trend: 'same' as const };
}

describe('CompareUsersDialog', () => {
  let component: CompareUsersDialog;
  let fixture: ComponentFixture<CompareUsersDialog>;

  const entries = [entry('u1', 1), entry('u2', 2), entry('u3', 3), entry('u4', 4), entry('u5', 5), entry('u6', 6)];

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CompareUsersDialog],
      providers: [
        { provide: MatDialogRef, useValue: { close: () => {} } },
        { provide: MAT_DIALOG_DATA, useValue: { entries, initiallySelected: [] } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CompareUsersDialog);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('toggles selection on and off', () => {
    component['toggle']('u1');
    expect(component['isSelected']('u1')).toBe(true);

    component['toggle']('u1');
    expect(component['isSelected']('u1')).toBe(false);
  });

  it('refuses to select a 6th user', () => {
    for (const id of ['u1', 'u2', 'u3', 'u4', 'u5']) {
      component['toggle'](id);
    }
    component['toggle']('u6');

    expect(component['selectedIds']().size).toBe(5);
    expect(component['isSelected']('u6')).toBe(false);
  });
});
