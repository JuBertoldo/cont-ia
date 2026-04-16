package com.frontend

import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  /**
   * Troca o tema de SplashTheme para AppTheme assim que o React Native inicia.
   * O SplashTheme é aplicado no AndroidManifest e exibe o fundo preto + logo
   * antes do bundle JS carregar.
   */
  override fun onCreate(savedInstanceState: Bundle?) {
    setTheme(R.style.AppTheme)
    super.onCreate(savedInstanceState)
  }

  /**
   * Nome do componente principal registrado no JavaScript.
   */
  override fun getMainComponentName(): String = "ContIA"

  /**
   * Delegate do ReactActivity com suporte à New Architecture.
   */
  override fun createReactActivityDelegate(): ReactActivityDelegate =
      DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)
}
