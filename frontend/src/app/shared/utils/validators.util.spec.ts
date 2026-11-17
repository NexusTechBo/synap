import { TestBed } from '@angular/core/testing';
import { FormControl } from '@angular/forms';
import { I18nService } from '../../core/i18n/i18n.service';
import { documentValidator, getValidationErrorMessage } from './validators.util';

function documentErrors(value: string, country: 'BO' | 'BR' = 'BO') {
  return documentValidator(country)(new FormControl(value));
}

describe('validators util', () => {
  describe('documentValidator for BO (CI)', () => {
    it.each(['12345', '1234567', '1234567890'])('accepts "%s"', (value) => {
      expect(documentErrors(value)).toBeNull();
    });

    it.each([
      ['1234', 'fewer than 5 digits'],
      ['12345678901', 'more than 10 digits'],
      ['12a45', 'letters'],
      ['12 345', 'spaces'],
      ['12345-LP', 'an extension suffix'],
    ])('rejects "%s" (%s) with a documentCi error', (value) => {
      expect(documentErrors(value)).toEqual({ documentCi: true });
    });

    it('leaves empty values to the required validators', () => {
      expect(documentErrors('')).toBeNull();
    });
  });

  describe('documentValidator for BR (CPF)', () => {
    it.each(['529.982.247-25', '52998224725', '529 982 247-25'])('accepts "%s"', (value) => {
      expect(documentErrors(value, 'BR')).toBeNull();
    });

    it.each(['52998224724', '11111111111', '5299822472', '529.982.247-2a'])(
      'rejects "%s" with a documentCpf error',
      (value) => {
        expect(documentErrors(value, 'BR')).toEqual({ documentCpf: true });
      },
    );
  });

  describe('getValidationErrorMessage', () => {
    it('returns the message key when no i18n service is given', () => {
      expect(getValidationErrorMessage({ pattern: {} })).toBe('validation.pattern');
    });

    it('returns null without errors', () => {
      expect(getValidationErrorMessage(null)).toBeNull();
    });

    it('uses the generic pattern message when no override is given', () => {
      expect(getValidationErrorMessage({ pattern: {} }, TestBed.inject(I18nService))).toBe(
        'El formato ingresado no es válido',
      );
    });

    it('translates the CI error', () => {
      expect(getValidationErrorMessage({ documentCi: true }, TestBed.inject(I18nService))).toBe(
        'Solo números, de 5 a 10 dígitos',
      );
    });

    it('translates the CPF error', () => {
      expect(getValidationErrorMessage({ documentCpf: true }, TestBed.inject(I18nService))).toBe(
        'CPF inválido: 11 dígitos con dígito verificador válido',
      );
    });

    it('includes the required length for maxlength', () => {
      expect(
        getValidationErrorMessage(
          { maxlength: { requiredLength: 10 } },
          TestBed.inject(I18nService),
        ),
      ).toBe('Debe tener como máximo 10 caracteres');
    });
  });
});
