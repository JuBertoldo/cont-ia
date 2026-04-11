export const isValidEmail = email => {
  if (!email) return false;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

export const isStrongPassword = password => {
  if (!password) return false;

  // mínimo 8 caracteres, 1 letra, 1 número e 1 caractere especial
  const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return regex.test(password);
};

export const isValidName = name => {
  if (!name) return false;
  return name.trim().length >= 3;
};

export const isValidBirthDate = birthDate => {
  if (!birthDate) return false;

  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  const match = birthDate.trim().match(regex);

  if (!match) return false;

  const day = parseInt(match[1], 10);
  const month = parseInt(match[2], 10);
  const year = parseInt(match[3], 10);

  if (month < 1 || month > 12) return false;
  if (day < 1 || day > 31) return false;
  if (year < 1900 || year > new Date().getFullYear()) return false;

  // Valida dias por mês (incluindo anos bissextos)
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
};
