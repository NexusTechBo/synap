import { DialogRef } from '@angular/cdk/dialog';
import { provideZoneChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../core/i18n/i18n.service';
import { DialogFrameComponent } from './dialog-frame.component';

describe('DialogFrameComponent', () => {
  let fixture: ComponentFixture<DialogFrameComponent>;
  let element: HTMLElement;

  async function setup(lang: 'es' | 'en'): Promise<void> {
    localStorage.setItem('lang', lang);
    TestBed.configureTestingModule({
      imports: [DialogFrameComponent],
      providers: [provideZoneChangeDetection(), { provide: DialogRef, useValue: { id: 'frame' } }],
    });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(DialogFrameComponent);
    fixture.componentRef.setInput('title', 'Título');
    fixture.autoDetectChanges();
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function closeButton(): HTMLButtonElement {
    return element.querySelector<HTMLButtonElement>('button[aria-label]')!;
  }

  afterEach(() => {
    fixture.destroy();
    localStorage.clear();
  });

  it('labels the close button "Cerrar" in Spanish', async () => {
    await setup('es');

    expect(closeButton().getAttribute('aria-label')).toBe('Cerrar');
  });

  it('labels the close button "Close" in English', async () => {
    await setup('en');

    expect(closeButton().getAttribute('aria-label')).toBe('Close');
  });

  it('emits closed when the close button is clicked', async () => {
    await setup('es');
    let emitted = 0;
    fixture.componentInstance.closed.subscribe(() => emitted++);

    closeButton().click();

    expect(emitted).toBe(1);
  });

  it('renders the title linked to the dialog id', async () => {
    await setup('es');

    const heading = element.querySelector('h2')!;
    expect(heading.textContent?.trim()).toBe('Título');
    expect(heading.id).toBe('frame-title');
  });
});
