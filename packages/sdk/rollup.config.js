import dts from 'rollup-plugin-dts'
import typescript from '@rollup/plugin-typescript'
import cleanup from 'rollup-plugin-cleanup'
import json from '@rollup/plugin-json'
import pkg from './package.json'

const external = [...Object.keys(pkg.dependencies), 'node:crypto', 'node:fs']

const codePlugins = () => [
    json(),
    typescript({target: 'es2020'}),
    cleanup({extensions: ['js', 'ts']}),
]

/** @type {import('rollup').RollupOptions} */
export default [
    {
        input: 'src/index.ts',
        output: {
            file: pkg.main,
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/index.ts',
        output: {
            file: pkg.module,
            format: 'esm',
            sourcemap: true,
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/index.ts',
        output: {file: pkg.types, format: 'esm'},
        plugins: [dts(), cleanup({extensions: ['d.ts']})],
    },
    {
        input: 'src/testing/index.ts',
        output: {
            file: 'lib/testing.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/testing/index.ts',
        output: {
            file: 'lib/testing.m.js',
            format: 'esm',
            sourcemap: true,
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/testing/index.ts',
        output: {file: 'lib/testing.d.ts', format: 'esm'},
        plugins: [dts(), cleanup({extensions: ['d.ts']})],
    },
    {
        input: 'src/scan/index.ts',
        output: {
            file: 'lib/scan.js',
            format: 'cjs',
            sourcemap: true,
            exports: 'named',
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/scan/index.ts',
        output: {
            file: 'lib/scan.m.js',
            format: 'esm',
            sourcemap: true,
        },
        plugins: codePlugins(),
        external,
    },
    {
        input: 'src/scan/index.ts',
        output: {file: 'lib/scan.d.ts', format: 'esm'},
        plugins: [dts(), cleanup({extensions: ['d.ts']})],
    },
]
