/**
 * E2E — Fluxo de histórico
 * Cobre: listagem de contagens, filtros por período e exportação CSV.
 */
describe('Histórico', () => {
  beforeAll(async () => {
    await device.launchApp({
      newInstance: true,
      launchArgs: {
        detoxTestUser: process.env.DETOX_TEST_USER || 'test@contia.com',
        detoxTestPass: process.env.DETOX_TEST_PASS || 'Test@12345',
      },
    });
  });

  beforeEach(async () => {
    await device.reloadReactNative();
  });

  it('navega para a tela de histórico pelo menu lateral', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-toggle')).tap();
    await element(by.id('menu-history')).tap();
    await expect(element(by.id('history-screen'))).toBeVisible();
  });

  it('exibe filtros de período na tela de histórico', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-toggle')).tap();
    await element(by.id('menu-history')).tap();
    await expect(element(by.id('filter-today'))).toBeVisible();
    await expect(element(by.id('filter-7days'))).toBeVisible();
    await expect(element(by.id('filter-30days'))).toBeVisible();
  });

  it('exibe botão de exportar CSV', async () => {
    await waitFor(element(by.id('home-screen')))
      .toBeVisible()
      .withTimeout(10000);
    await element(by.id('drawer-toggle')).tap();
    await element(by.id('menu-history')).tap();
    await expect(element(by.id('btn-export-csv'))).toBeVisible();
  });
});
