/**
 * E2E — Fluxo de scanner
 * Cobre: tela principal, abertura do scanner, fluxo de captura de imagem.
 *
 * Pré-condição: o app deve estar autenticado.
 * Em CI, use `device.launchApp({ launchArgs: { detoxEnableSynchronization: 0 } })`
 * e injete credenciais de teste via variável de ambiente DETOX_TEST_USER / DETOX_TEST_PASS.
 */
describe('Scanner', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        // Injeta credenciais de teste para pular o login manual
        detoxTestUser: process.env.DETOX_TEST_USER || 'test@contia.com',
        detoxTestPass: process.env.DETOX_TEST_PASS || 'Test@12345',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('exibe a tela inicial (Home) após autenticação', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
  });

  it('exibe o botão de scanner na home', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await expect(element(by.id('btn-scanner'))).toBeVisible();
  });

  it('navega para a tela de scanner ao tocar no botão', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('btn-scanner')).tap();
    await expect(element(by.id('scanner-screen'))).toBeVisible();
  });

  it('exibe opções de câmera e galeria no scanner', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('btn-scanner')).tap();
    await expect(element(by.id('btn-camera'))).toBeVisible();
    await expect(element(by.id('btn-gallery'))).toBeVisible();
  });

  it('exibe indicador de carregamento ao iniciar detecção', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('btn-scanner')).tap();
    await element(by.id('btn-gallery')).tap();
    // Aguarda o indicador de loading aparecer ao processar
    await waitFor(element(by.id('loading-indicator')))
      .toBeVisible()
      .withTimeout(5000);
  });
});
