import { DIALOG_DATA, DialogRef } from '@angular/cdk/dialog';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DoctorModeAppointmentsDialogComponent } from './doctor-mode-appointments-dialog.component';

describe('DoctorModeAppointmentsDialogComponent', () => {
  let fixture: ComponentFixture<DoctorModeAppointmentsDialogComponent>;
  let element: HTMLElement;
  let dialogRef: { id: string; close: ReturnType<typeof vi.fn> };

  async function setup(count: number): Promise<void> {
    dialogRef = { id: 'doctor-mode-dialog', close: vi.fn() };
    TestBed.configureTestingModule({
      imports: [DoctorModeAppointmentsDialogComponent],
      providers: [
        { provide: DIALOG_DATA, useValue: { count } },
        { provide: DialogRef, useValue: dialogRef },
      ],
    });
    fixture = TestBed.createComponent(DoctorModeAppointmentsDialogComponent);
    element = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement {
    const found = Array.from(element.querySelectorAll('button')).find((b) =>
      b.textContent?.includes(text),
    );
    if (!found) throw new Error(`Button not found: ${text}`);
    return found;
  }

  function type(value: string): void {
    const textarea = element.querySelector('textarea') as HTMLTextAreaElement;
    textarea.value = value;
    textarea.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  it('shows the singular message for one appointment', async () => {
    await setup(1);
    expect(element.textContent).toContain(
      'Tienes 1 cita activa. Si dejas de atender como doctor, se cancelará y se notificará al paciente.',
    );
  });

  it('shows the plural message with the count', async () => {
    await setup(3);
    expect(element.textContent).toContain(
      'Tienes 3 citas activas. Si dejas de atender como doctor, se cancelarán y se notificará a los pacientes.',
    );
  });

  it('marks the reason as optional and not required', async () => {
    await setup(2);
    const textarea = element.querySelector('textarea') as HTMLTextAreaElement;
    expect(element.textContent).toContain('(opcional)');
    expect(textarea.required).toBe(false);
    expect(textarea.maxLength).toBe(500);
  });

  it('confirms with an empty reason when nothing is typed', async () => {
    await setup(2);
    expect(button('Cancelar citas y dejar de atender').disabled).toBe(false);
    button('Cancelar citas y dejar de atender').click();
    expect(dialogRef.close).toHaveBeenCalledWith({ reason: '' });
  });

  it('confirms with the trimmed reason and updates the counter', async () => {
    await setup(2);
    type('  Vacaciones  ');
    expect(element.textContent).toContain('14/500');
    button('Cancelar citas y dejar de atender').click();
    expect(dialogRef.close).toHaveBeenCalledWith({ reason: 'Vacaciones' });
  });

  it('closes without result when going back', async () => {
    await setup(2);
    button('Volver').click();
    expect(dialogRef.close).toHaveBeenCalledWith();
  });
});
