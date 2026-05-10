/**
 * E2E — Fluxo de autenticação
 * Cobre: tela de login, validação de campos, navegação para cadastro.
 */
describe('Autenticação', () => {
  beforeAll(async () => {
    await device.launchApp({ newInstance: true });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('exibe a tela inicial de autenticação', async () => {
    await expect(element(by.id('auth-home-screen'))).toBeVisible();
  });

  it('exibe botões de entrar e cadastrar', async () => {
    await expect(element(by.id('btn-login'))).toBeVisible();
    await expect(element(by.id('btn-register'))).toBeVisible();
  });

  it('navega para a tela de login ao tocar em Entrar', async () => {
    await element(by.id('btn-login')).tap();
    await expect(element(by.id('login-screen'))).toBeVisible();
  });

  it('exibe erro ao tentar login com campos vazios', async () => {
    await element(by.id('btn-login')).tap();
    await element(by.id('btn-submit-login')).tap();
    await expect(element(by.id('error-message'))).toBeVisible();
  });

  it('exibe erro ao tentar login com e-mail inválido', async () => {
    await element(by.id('btn-login')).tap();
    await element(by.id('input-email')).typeText('emailinvalido');
    await element(by.id('input-password')).typeText('Senha@123');
    await element(by.id('btn-submit-login')).tap();
    await expect(element(by.id('error-message'))).toBeVisible();
  });

  it('navega para a tela de cadastro ao tocar em Cadastrar', async () => {
    await element(by.id('btn-register')).tap();
    await expect(element(by.id('register-screen'))).toBeVisible();
  });

  it('exibe campos obrigatórios na tela de cadastro', async () => {
    await element(by.id('btn-register')).tap();
    await expect(element(by.id('input-name'))).toBeVisible();
    await expect(element(by.id('input-email'))).toBeVisible();
    await expect(element(by.id('input-password'))).toBeVisible();
    await expect(element(by.id('input-confirm-password'))).toBeVisible();
  });
});
