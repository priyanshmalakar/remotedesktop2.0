const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = (config, options) => {
  config.target = 'electron-renderer';
  
  // Add externals to exclude problematic packages
  config.externals = {
    ...config.externals,
    '@nut-tree-fork/nut-js': 'commonjs @nut-tree-fork/nut-js',
    'robotjs': 'commonjs robotjs',
    'bindings': 'commonjs bindings',
    'node-gyp': 'commonjs node-gyp'
  };

  // Add node polyfills
  config.plugins.push(new NodePolyfillPlugin());

  // Resolve fallbacks
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "stream": false,
    "os": false,
    "child_process": false
  };

  return config;
};