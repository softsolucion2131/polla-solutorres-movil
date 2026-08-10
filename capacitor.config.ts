import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.solutorres.pollamovil',
  appName: 'polla-solutorres-movil',
  webDir: '.output/public',
  bundledWebRuntime: false,
  server: {
    // Obliga al WebView a usar rutas relativas internamente o un esquema seguro
    androidScheme: 'https'
  }
};

export default config;