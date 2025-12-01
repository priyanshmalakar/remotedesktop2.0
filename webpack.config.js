const NodePolyfillPlugin = require('node-polyfill-webpack-plugin');

module.exports = (config, options) => {
  config.target = 'electron-renderer';

  if (options.fileReplacements) {
    for(let fileReplacement of options.fileReplacements) {
        if (fileReplacement.replace !== 'src/environments/environment.ts') {
            continue;
        }

        let fileReplacementParts = fileReplacement['with'].split('.');
        if (fileReplacementParts.length > 1 && ['web'].indexOf(fileReplacementParts[1]) >= 0) {
            config.target = 'web';
        }
        break;
    }
  }

  // Add externals to exclude problematic native packages
  config.externals = {
    ...config.externals,
    '@nut-tree-fork/nut-js': 'commonjs @nut-tree-fork/nut-js',
    'robotjs': 'commonjs robotjs',
    'bindings': 'commonjs bindings',
    'node-gyp': 'commonjs node-gyp',
    'fs': 'commonjs fs',
    'path': 'commonjs path',
    'crypto': 'commonjs crypto'
  };

  // Add the existing node integration
  config.plugins.push(new NodePolyfillPlugin({
    excludeAliases: ["console"]
  }));

  config.resolve.fallback = {
    "crypto": require.resolve("crypto-browserify"),
    "path": require.resolve("path-browserify"), 
    "url": require.resolve("url"),
    "fs": false,
    "os": false,
    "stream": false,
    "child_process": false,
    "bindings": false
  };

  // Ignore native modules in the renderer process
  config.module.rules.push({
    test: /\.node$/,
    use: 'node-loader'
  });

  return config;
};