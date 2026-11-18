import { Component, provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { EN_TRANSLATIONS } from '../../../../../../app/core/i18n/en';
import { ES_TRANSLATIONS } from '../../../../../../app/core/i18n/es';
import { I18nService } from '../../../../../../app/core/i18n/i18n.service';
import {
  SelectComponent,
  SelectOption,
} from '../../../../../../app/shared/ui/forms/select/select.component';

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

describe('SelectComponent default placeholder', () => {
  async function render(lang: 'es' | 'en'): Promise<string> {
    TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZoneChangeDetection()],
    });
    const i18n = TestBed.inject(I18nService);
    i18n['loaded'].set({ es: ES_TRANSLATIONS, en: EN_TRANSLATIONS });
    i18n.currentLang.set(lang);
    const fixture = TestBed.createComponent(HostComponent);
    fixture.componentInstance.control.setValue(null);
    fixture.autoDetectChanges();
    await fixture.whenStable();
    return fixture.nativeElement.textContent;
  }

  it('shows the translated placeholder in Spanish', async () => {
    expect(await render('es')).toContain('Seleccionar');
  });

  it('shows the translated placeholder in English', async () => {
    const text = await render('en');

    expect(text).toContain('Select');
    expect(text).not.toContain('Seleccionar');
  });
});
