import { DocumentFormatPipe } from '../../../../app/shared/pipes/document-format.pipe';

describe('DocumentFormatPipe', () => {
  const pipe = new DocumentFormatPipe();

  it('masks the CPF for BR', () => {
    expect(pipe.transform('52998224725', 'BR')).toBe('529.982.247-25');
  });

  it('keeps the CI unchanged for BO', () => {
    expect(pipe.transform('1234567', 'BO')).toBe('1234567');
  });

  it.each([null, undefined, ''])('returns an empty string for %s', (value) => {
    expect(pipe.transform(value, 'BR')).toBe('');
  });
});
