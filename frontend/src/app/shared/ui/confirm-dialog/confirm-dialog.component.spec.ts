import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n/i18n.service';
import { ConfirmDialogComponent, ConfirmOptions } from './confirm-dialog.component';

describe('ConfirmDialogComponent', () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let element: HTMLElement;
  let dialogRef: { id: string; close: ReturnType<typeof vi.fn> };

  async function setup(lang: 'es' | 'en', options: Partial<ConfirmOptions> = {}): Promise<void> {
    dialogRef = { id: 'confirm-dialog', close: vi.fn() };
    localStorage.setItem('lang', lang);
    TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
      providers: [
        provideZoneChangeDetection(),
        { provide: DialogRef, useValue: dialogRef },
        { provide: DIALOG_DATA, useValue: { title: 'Título', message: 'Mensaje', ...options } },
      ],
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(ConfirmDialogComponent);
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function buttonLabels(): string[] {
    return [...element.querySelectorAll('button.btn')].map((b) => b.textContent?.trim() ?? '');
  }

  afterEach(() => {
    fixture.destroy();
    localStorage.clear();
  });

  it('shows Volver and Confirmar by default in Spanish', async () => {
    await setup('es');

    expect(buttonLabels()).toEqual(['Volver', 'Confirmar']);
  });

  it('shows Back and Confirm by default in English', async () => {
    await setup('en');

    expect(buttonLabels()).toEqual(['Back', 'Confirm']);
  });

  it('prefers the custom labels over the defaults', async () => {
    await setup('es', { cancelLabel: 'No, gracias', confirmLabel: 'Eliminar' });

    expect(buttonLabels()).toEqual(['No, gracias', 'Eliminar']);
  });

  it('closes with true on confirm and false on cancel', async () => {
    await setup('es');
    const [cancel, confirm] = [...element.querySelectorAll<HTMLButtonElement>('button.btn')];

    confirm.click();
    cancel.click();

    expect(dialogRef.close).toHaveBeenNthCalledWith(1, true);
    expect(dialogRef.close).toHaveBeenNthCalledWith(2, false);
  });
});
