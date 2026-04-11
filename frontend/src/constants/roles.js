export const ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  SUPER_ADMIN: 'super_admin',
};

/** Label legível por role */
export const ROLE_LABELS = {
  [ROLES.USER]: 'Perfil usuário',
  [ROLES.ADMIN]: 'Perfil admin',
  [ROLES.SUPER_ADMIN]: 'Super Admin',
};

/** Roles com permissão de administração da empresa */
export const ADMIN_ROLES = [ROLES.ADMIN, ROLES.SUPER_ADMIN];
