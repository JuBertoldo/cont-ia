import {
  isValidEmail,
  isStrongPassword,
  isValidName,
  isValidBirthDate,
} from '../validators';

describe('isValidEmail', () => {
  it('retorna true para e-mail válido', () => {
    expect(isValidEmail('user@example.com')).toBe(true);
    expect(isValidEmail('  user@example.com  ')).toBe(true);
  });

  it('retorna false para e-mail inválido', () => {
    expect(isValidEmail('invalido')).toBe(false);
    expect(isValidEmail('sem@dominio')).toBe(false);
    expect(isValidEmail('@semlocal.com')).toBe(false);
  });

  it('retorna false para valor falsy', () => {
    expect(isValidEmail(null)).toBe(false);
    expect(isValidEmail(undefined)).toBe(false);
    expect(isValidEmail('')).toBe(false);
  });
});

describe('isStrongPassword', () => {
  it('retorna true para senha forte', () => {
    expect(isStrongPassword('Senha@123')).toBe(true);
    expect(isStrongPassword('abc123!!')).toBe(true);
  });

  it('retorna false se tiver menos de 8 caracteres', () => {
    expect(isStrongPassword('Ab1!')).toBe(false);
  });

  it('retorna false sem número', () => {
    expect(isStrongPassword('SenhaForte!')).toBe(false);
  });

  it('retorna false sem caractere especial', () => {
    expect(isStrongPassword('Senha1234')).toBe(false);
  });

  it('retorna false sem letra', () => {
    expect(isStrongPassword('12345678!')).toBe(false);
  });

  it('retorna false para valor falsy', () => {
    expect(isStrongPassword(null)).toBe(false);
    expect(isStrongPassword('')).toBe(false);
  });
});

describe('isValidName', () => {
  it('retorna true para nome com 3+ caracteres', () => {
    expect(isValidName('Ana')).toBe(true);
    expect(isValidName('João Silva')).toBe(true);
  });

  it('retorna false para nome curto', () => {
    expect(isValidName('Jo')).toBe(false);
    expect(isValidName('  A  ')).toBe(false);
  });

  it('retorna false para valor falsy', () => {
    expect(isValidName(null)).toBe(false);
    expect(isValidName('')).toBe(false);
  });
});

describe('isValidBirthDate', () => {
  it('retorna true para data válida', () => {
    expect(isValidBirthDate('15/06/1990')).toBe(true);
    expect(isValidBirthDate('29/02/2000')).toBe(true); // ano bissexto
  });

  it('retorna false para formato inválido', () => {
    expect(isValidBirthDate('1990-06-15')).toBe(false);
    expect(isValidBirthDate('15/6/1990')).toBe(false);
    expect(isValidBirthDate('abc')).toBe(false);
  });

  it('retorna false para dia/mês fora do intervalo', () => {
    expect(isValidBirthDate('00/06/1990')).toBe(false);
    expect(isValidBirthDate('15/13/1990')).toBe(false);
    expect(isValidBirthDate('32/01/1990')).toBe(false);
  });

  it('retorna false para ano fora do intervalo', () => {
    expect(isValidBirthDate('15/06/1899')).toBe(false);
    const futureYear = new Date().getFullYear() + 1;
    expect(isValidBirthDate(`01/01/${futureYear}`)).toBe(false);
  });

  it('retorna false para data inválida (ex: 31/02)', () => {
    expect(isValidBirthDate('31/02/2000')).toBe(false);
    expect(isValidBirthDate('29/02/2001')).toBe(false); // 2001 não é bissexto
  });

  it('retorna false para valor falsy', () => {
    expect(isValidBirthDate(null)).toBe(false);
    expect(isValidBirthDate('')).toBe(false);
  });
});
