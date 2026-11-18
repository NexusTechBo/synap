import { ComponentFixture, TestBed } from '@angular/core/testing';
import { I18nService } from '../../../../../app/core/i18n/i18n.service';
import { Specialty } from '../../../../../app/core/models/api.models';
import { SpecialtyFilterComponent } from '../../../../../app/shared/components/specialty-filter/specialty-filter.component';

describe('SpecialtyFilterComponent', () => {
  const specialties: Specialty[] = [
    { id: 1, name: 'Cardiologia' },
    { id: 2, name: 'Pediatria' },
  ];

  let fixture: ComponentFixture<SpecialtyFilterComponent>;
  let emitted: (number | null)[];

  async function create(browserLanguage: string): Promise<void> {
    vi.spyOn(navigator, 'language', 'get').mockReturnValue(browserLanguage);
    TestBed.configureTestingModule({ imports: [SpecialtyFilterComponent] });
    await TestBed.inject(I18nService).init();
    fixture = TestBed.createComponent(SpecialtyFilterComponent);
    emitted = [];
    fixture.componentInstance.select.subscribe((id) => emitted.push(id));
    fixture.componentRef.setInput('specialties', specialties);
    fixture.detectChanges();
  }

  beforeEach(() => create('es-BO'));

  afterEach(() => vi.restoreAllMocks());

  function host(): HTMLElement {
    return fixture.nativeElement as HTMLElement;
  }

  function buttons(): HTMLButtonElement[] {
    return [...host().querySelectorAll('button')];
  }

  it('renders the all chip and one chip per specialty', () => {
    expect(buttons().map((b) => b.textContent?.trim())).toEqual([
      'Todas',
      'Cardiologia',
      'Pediatria',
    ]);
  });

  it('exposes a labelled group in spanish', () => {
    expect(host().getAttribute('role')).toBe('group');
    expect(host().getAttribute('aria-label')).toBe('Especialidad');
  });

  it('renders the all chip and aria-label in english for a non-Spanish browser', async () => {
    TestBed.resetTestingModule();
    await create('en-US');

    expect(buttons()[0].textContent?.trim()).toBe('All');
    expect(host().getAttribute('aria-label')).toBe('Specialty');
  });

  it('marks the all chip as pressed when nothing is selected', () => {
    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'true',
      'false',
      'false',
    ]);
  });

  it('marks the selected specialty chip as pressed', () => {
    fixture.componentRef.setInput('selectedId', 2);
    fixture.detectChanges();

    expect(buttons().map((b) => b.getAttribute('aria-pressed'))).toEqual([
      'false',
      'false',
      'true',
    ]);
  });

  it('emits the specialty id when a specialty chip is clicked', () => {
    buttons()[1].click();

    expect(emitted).toEqual([1]);
  });

  it('emits null when the all chip is clicked', () => {
    fixture.componentRef.setInput('selectedId', 1);
    fixture.detectChanges();

    buttons()[0].click();

    expect(emitted).toEqual([null]);
  });
});
