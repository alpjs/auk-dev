const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const OfflinePlugin = require('offline-plugin');

const production = process.env.NODE_ENV === 'prod' || process.env.NODE_ENV === 'production';
const dest = process.env.WEBPACK_DEST || 'modern-browsers';

const modulesList = (() => {
    try {
        return fs.readdirSync(path.resolve('src/modules'));
    } catch (e) {
        return [];
    }
})();

module.exports = {
    debug: !production,
    devtool: production ? undefined : 'cheap-source-map',

    entry: {
        [dest]: [
            dest !== 'modern-browsers' && 'babel-regenerator-runtime',
            !production && 'webpack-hot-middleware/client',
            !production && 'react-hot-loader/patch',
            './src/index.browser.js',
        ].filter(Boolean)
    },
    output: {
        path: path.resolve('public'),
        publicPath: '/',
        filename: '[name].js',
        pathinfo: !production,
    },
    module: {
        // Disable handling of unknown requires
        unknownContextRegExp: /$^/,
        unknownContextCritical: true,

        // Disable handling of requires with a single expression
        exprContextRegExp: /$^/,
        exprContextCritical: true,

        // Disable handling of expression in require
        wrappedContextRegExp: /$^/,
        wrappedContextCritical: true,
        wrappedContextRecursive: false,


        preLoaders: [
            // { test: /\.jsx?$/, loader: 'eslint', exclude: /node_modules/ },
            // { test: /\.jsx?$/, loader: 'source-map', exclude: /react-hot-loader/ }
        ],

        loaders: [
            {
                test: /\.jsx?$/,
                exclude: /(node_modules)|\.server\.jsx?$/,
                loader: 'babel',
                include: path.resolve('src'),
                query: {
                    presets: (
                        dest === 'modern-browsers' ?
                            ['modern-browsers/webpack2', 'react', 'modern-browsers-stage-1']
                            : ['es2015', 'react', 'stage-1']
                    ),
                    plugins: [
                        !production && 'typecheck',
                        !production && 'react-hot-loader/babel',
                        ['defines', { PRODUCTION: production, BROWSER: true, SERVER: false }],
                        'remove-dead-code',
                        ['discard-module-references', { targets: [], unusedWhitelist: ['react'] }],
                        'react-require',
                    ].filter(Boolean),
                },
            },
        ],
    },
    resolveLoader: {
        modulesDirectories: ['node_modules'],
    },
    resolve: {
        alias: { 'socket.io': 'socket.io-client' },
        modules: ['browser/node_modules', 'node_modules'],
        extensions: ['', '.browser.js', '.js', '.browser.jsx', '.jsx', '.json'],
        mainFields: [
            dest === 'modern-browsers' && !production && 'webpack:main-modern-browsers-dev',
            dest === 'modern-browsers' && 'webpack:main-modern-browsers',
            !production && 'webpack:main-dev',
            'webpack:main',
            !production && 'browser-dev',
            'browser',
            !production && 'main-dev',
            'webpack',
            'main',
        ].filter(Boolean),
        packageAlias: ['webpack', 'browser'],
    },

    node: { util: 'empty' }, // fix nightingale...
    plugins: [
        new webpack.optimize.CommonsChunkPlugin({
            name: dest,
            filename: `${dest}.js`,
            chunks: [dest],
            // minChunks: modulesList.length === 1 ? 1 : 2,
        }),
        new webpack.LoaderOptionsPlugin({
            debug: !production,
            minimize: !production,
        }),
        new webpack.DefinePlugin({
            BROWSER: true,
            SERVER: false,
            NODE: false,
            PRODUCTION: production,
            MODERN_BROWSERS: dest === 'modern-browsers',
            'process.env': {
                'NODE_ENV': JSON.stringify(production ? 'production' : process.env.NODE_ENV)
            }
        }),
        !production && new webpack.HotModuleReplacementPlugin(),
        !production && new webpack.NoErrorsPlugin(),
        production && new webpack.optimize.UglifyJsPlugin({
            mangle: false,
            compress: {
                warnings: false,
                'drop_debugger': !!production,
                unused: false,
                comparisons: true,
                sequences: false
            },
            output: {
                beautify: !production && {
                    'max-line-len': 200,
                    bracketize: true,
                },
                comments: !production && 'all',
            },
            sourceMap: !production
        }),

        // TODO https://github.com/NekR/offline-plugin
    ].filter(Boolean),
};
