export const isValidEmail = (email) => {
  if (!email) return false;

  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email.trim());
};

export const isStrongPassword = (password) => {
  if (!password) return false;

  // mínimo 8 caracteres, 1 letra, 1 número e 1 caractere especial
  const regex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z\d]).{8,}$/;
  return regex.test(password);
};

export const isValidName = (name) => {
  if (!name) return false;
  return name.trim().length >= 3;
};

export const isValidBirthDate = (birthDate) => {
  if (!birthDate) return false;

  // validação simples para DD/MM/AAAA
  const regex = /^(\d{2})\/(\d{2})\/(\d{4})$/;
  return regex.test(birthDate.trim());
};