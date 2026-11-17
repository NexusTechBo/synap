import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { SelectComponent, SelectOption } from './select.component';

const OPTIONS: SelectOption<string>[] = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
  { value: 'c', label: 'Gamma', disabled: true },
];

@Component({
  imports: [ReactiveFormsModule, SelectComponent],
  template: `<app-select
    [formControl]="control"
    [options]="options"
    (selectionChange)="changes.push($event)"
  />`,
})
class HostComponent {
  control = new FormControl<string | null>('a');
  options = OPTIONS;
  changes: string[] = [];
}

describe('SelectComponent selectionChange', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZoneChangeDetection()],
    });
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  async function openAndPick(label: string): Promise<void> {
    fixture.nativeElement.querySelector('button').click();
    await fixture.whenStable();
    const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(
      (el) => el.textContent?.trim() === label,
    );
    option!.click();
    await fixture.whenStable();
  }

  it('emits the new value when the user picks a different option', async () => {
    await openAndPick('Beta');

    expect(host.changes).toEqual(['b']);
    expect(host.control.value).toBe('b');
  });

  it('does not emit when the user picks the already selected option', async () => {
    await openAndPick('Alpha');

    expect(host.changes).toEqual([]);
  });

  it('does not emit on programmatic writes to the control', async () => {
    host.control.setValue('b');
    await fixture.whenStable();

    expect(host.changes).toEqual([]);
  });

  it('does not emit when picking a disabled option', async () => {
    await openAndPick('Gamma');

    expect(host.changes).toEqual([]);
    expect(host.control.value).toBe('a');
  });
});
