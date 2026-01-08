// craco.config.js
const webpack = require('webpack');

module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Service worker sudah otomatis di-copy dari public/ folder oleh React saat build
      // Tidak perlu CopyWebpackPlugin karena semua file di public/ otomatis masuk ke build
      
      // 1. Tambahkan Fallback untuk Node Core Modules (untuk Axios dll.)
      webpackConfig.resolve.fallback = {
        "http": require.resolve("stream-http"),
        "https": require.resolve("https-browserify"),
        "util": require.resolve("util/"),
        "zlib": require.resolve("browserify-zlib"),
        "stream": require.resolve("stream-browserify"),
        "url": require.resolve("url/"),
        "assert": require.resolve("assert/"),
        "buffer": require.resolve("buffer/")
      };

      // 2. Tambahkan Plugin untuk Polyfill Global Objects (Buffer dan Process)
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ['buffer', 'Buffer'],
        }),
        new webpack.ProvidePlugin({
          process: 'process/browser.js', // <--- FIX: Ditambahkan .js di sini
        }),
      );

      return webpackConfig;
    },
  },
};