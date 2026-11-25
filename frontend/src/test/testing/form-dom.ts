import { ComponentFixture } from '@angular/core/testing';

export const CI_MESSAGE = 'Solo números, de 5 a 10 dígitos';
export const CPF_MESSAGE = 'CPF inválido: 11 dígitos con dígito verificador válido';

export interface FormDom {
  findField(label: string): HTMLInputElement | null;
  field(label: string): HTMLInputElement;
  type(label: string, value: string): Promise<void>;
  chooseRadio(label: string): Promise<void>;
  clickButton(label: string): Promise<void>;
  submit(): Promise<void>;
}

export function formDom(fixture: ComponentFixture<unknown>): FormDom {
  const root = (): HTMLElement => fixture.nativeElement;
  const labelElement = (label: string): HTMLLabelElement | undefined =>
    [...root().querySelectorAll('label')].find((l) => l.textContent?.trim() === label);

  function findField(label: string): HTMLInputElement | null {
    const found = labelElement(label);
    return found ? root().querySelector<HTMLInputElement>(`[id="${found.htmlFor}"]`) : null;
  }

  function field(label: string): HTMLInputElement {
    const input = findField(label);
    if (!input) throw new Error(`Field "${label}" not found`);
    return input;
  }

  return {
    findField,
    field,
    async type(label, value) {
      const input = field(label);
      input.value = value;
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      await fixture.whenStable();
    },
    async chooseRadio(label) {
      const radio = labelElement(label)?.querySelector<HTMLInputElement>('input[type="radio"]');
      if (!radio) throw new Error(`Radio "${label}" not found`);
      radio.click();
      await fixture.whenStable();
    },
    async clickButton(label) {
      const button = [...root().querySelectorAll<HTMLButtonElement>('button')].find(
        (b) => b.textContent?.trim() === label,
      );
      if (!button) throw new Error(`Button "${label}" not found`);
      button.click();
      await fixture.whenStable();
    },
    async submit() {
      const button = root().querySelector<HTMLButtonElement>('button[type="submit"]');
      if (!button) throw new Error('Submit button not found');
      button.click();
      await fixture.whenStable();
    },
  };
}

export function expectTooltipLegendNamesFieldset(root: HTMLElement, name: string): void {
  const fieldset = root.querySelector('fieldset')!;
  const legend = fieldset.firstElementChild as HTMLElement;
  const nameId = fieldset.getAttribute('aria-labelledby')!;

  expect(legend.tagName).toBe('LEGEND');
  expect(legend.querySelector('app-help-tooltip')).not.toBeNull();
  expect(root.querySelector(`[id="${nameId}"]`)?.textContent?.trim()).toBe(name);
}
