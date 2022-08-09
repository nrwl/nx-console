import ts from '@rollup/plugin-typescript';
import cjs from '@rollup/plugin-commonjs';
import nodeResolve from '@rollup/plugin-node-resolve';
import json from '@rollup/plugin-json';
import replace from '@rollup/plugin-replace';
import { terser } from 'rollup-plugin-terser';
import { defineConfig } from 'rollup';

export default defineConfig({
  input: './apps/nxls/src/main.ts',
  output: {
    file: './dist/apps/vscode/nxls/main.js',
    format: 'cjs',
    plugins: [terser()],
  },
  plugins: [
    replace({
      values: {
        "'string_decoder/'": "'string_decoder'",
      },
      delimiters: ['', ''],
      preventAssignment: true,
    }),
    nodeResolve({ preferBuiltins: true, exportConditions: ['node'] }),
    json(),
    cjs(),
    ts({
      tsconfig: './apps/nxls/tsconfig.app.json',
    }),
  ],
});
