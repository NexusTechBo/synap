import { isRole } from '../../../../app/core/auth/roles';

describe('isRole', () => {
  it.each(['ADMINISTRATOR', 'DOCTOR', 'ASSISTANT'])('accepts the staff role %s', (value) => {
    expect(isRole(value)).toBe(true);
  });

  it('rejects GUEST', () => {
    expect(isRole('GUEST')).toBe(false);
  });

  it('rejects unknown strings', () => {
    expect(isRole('FOO')).toBe(false);
    expect(isRole('')).toBe(false);
  });

  it('rejects lowercase roles', () => {
    expect(isRole('doctor')).toBe(false);
  });
});
