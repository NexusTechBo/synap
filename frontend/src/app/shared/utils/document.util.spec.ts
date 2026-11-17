import {
  DOCUMENT_MAX_LENGTH,
  formatDocument,
  isValidDocument,
  stripDocumentSeparators,
} from './document.util';

describe('document util', () => {
  describe('isValidDocument for BR (CPF)', () => {
    it.each(['529.982.247-25', '52998224725', '529 982 247-25'])('accepts "%s"', (value) => {
      expect(isValidDocument(value, 'BR')).toBe(true);
    });

    it('rejects a wrong first check digit', () => {
      expect(isValidDocument('52998224715', 'BR')).toBe(false);
    });

    it('rejects a wrong second check digit', () => {
      expect(isValidDocument('52998224724', 'BR')).toBe(false);
    });

    it.each(['00000000000', '11111111111', '99999999999'])(
      'rejects the all-equal digits "%s"',
      (value) => {
        expect(isValidDocument(value, 'BR')).toBe(false);
      },
    );

    it.each(['5299822472', '529982247250', '', '1234567'])(
      'rejects the wrong length "%s"',
      (value) => {
        expect(isValidDocument(value, 'BR')).toBe(false);
      },
    );

    it.each(['5299822472a', 'abcdefghijk', '529.982.247-2x'])(
      'rejects letters in "%s"',
      (value) => {
        expect(isValidDocument(value, 'BR')).toBe(false);
      },
    );
  });

  describe('isValidDocument for BO (CI)', () => {
    it.each(['12345', '1234567890'])('accepts the boundary "%s"', (value) => {
      expect(isValidDocument(value, 'BO')).toBe(true);
    });

    it.each(['1234', '12345678901'])('rejects the out-of-range length "%s"', (value) => {
      expect(isValidDocument(value, 'BO')).toBe(false);
    });

    it.each(['12a45', '12 345', '123.456-78'])('rejects non-digit characters in "%s"', (value) => {
      expect(isValidDocument(value, 'BO')).toBe(false);
    });
  });

  describe('formatDocument', () => {
    it('masks a CPF in BR', () => {
      expect(formatDocument('52998224725', 'BR')).toBe('529.982.247-25');
    });

    it('normalizes an already masked CPF in BR', () => {
      expect(formatDocument('529.982.247-25', 'BR')).toBe('529.982.247-25');
    });

    it('keeps a legacy value that is not 11 digits in BR', () => {
      expect(formatDocument('1234567-LP', 'BR')).toBe('1234567-LP');
    });

    it('leaves the value unchanged in BO', () => {
      expect(formatDocument('52998224725', 'BO')).toBe('52998224725');
    });

    it.each([null, undefined, ''])('returns an empty string for %s', (value) => {
      expect(formatDocument(value, 'BR')).toBe('');
      expect(formatDocument(value, 'BO')).toBe('');
    });
  });

  describe('stripDocumentSeparators', () => {
    it.each([
      ['529.982.247-25', '52998224725'],
      ['529 982 247 25', '52998224725'],
      ['1234567', '1234567'],
      ['.-  ', ''],
      ['', ''],
    ])('turns "%s" into "%s"', (value, expected) => {
      expect(stripDocumentSeparators(value)).toBe(expected);
    });

    it('keeps letters', () => {
      expect(stripDocumentSeparators('123-LP')).toBe('123LP');
    });
  });

  describe('DOCUMENT_MAX_LENGTH', () => {
    it('allows 10 characters in BO and 14 in BR', () => {
      expect(DOCUMENT_MAX_LENGTH).toEqual({ BO: 10, BR: 14 });
    });
  });
});
