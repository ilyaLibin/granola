import path from 'path';
import resolve from 'rollup-plugin-node-resolve';
import replace from 'rollup-plugin-replace';
import babel from 'rollup-plugin-babel';
import { terser } from 'rollup-plugin-terser';

const DEFAULT_FORMAT = 'umd';
const LIBRARY_NAME = 'engage';

const pluginList = ({ libraryName } = {}) => [
    resolve(),
    babel(),
    replace({
        LIBRARY_NAME: JSON.stringify(libraryName || LIBRARY_NAME)
    })
];

const buildConfig = ({ format = DEFAULT_FORMAT, min = false, name = '' } = {}) => ({
    input: path.join('./src', name || '', 'index.js'),
    output: {
        name: name || LIBRARY_NAME,
        format,
        file: [
            `dist/${ name || LIBRARY_NAME }`,
            min && 'min',
            format !== DEFAULT_FORMAT && format,
            'js'
        ].filter(Boolean).join('.')
    },
    plugins: min
        ? [ ...pluginList({ libraryName: name }), terser() ]
        : pluginList({ libraryName: name })
});

const genConfig = ({ name } = {}) => [ buildConfig({ name }), buildConfig({name, min: true}) ];

export default [
    ...genConfig()
];

