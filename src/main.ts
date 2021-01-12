// based on node's serialize-javascript

// deno-lint-ignore-file

import { randomBytes } from "https://deno.land/std@0.83.0/node/crypto.ts";

const UID_LENGTH = 16;
const UID = generateUID();
const PLACE_HOLDER_REGEXP = new RegExp('(\\\\)?"@__(F|R|D|M|S|A|U|I|B)-' + UID + '-(\\d+)__@"', 'g');
const IS_NATIVE_CODE_REGEXP = /\{\s*\[native code\]\s*\}/g;
const IS_PURE_FUNCTION = /function.*?\(/;
const IS_ARROW_FUNCTION = /.*?=>.*?/;
const UNSAFE_CHARS_REGEXP = /[<>\/\u2028\u2029]/g;
const RESERVED_SYMBOLS = ['*', 'async'];
const ESCAPED_CHARS = {
    '<': '\\u003C',
    '>': '\\u003E',
    '/': '\\u002F',
    '\u2028': '\\u2028',
    '\u2029': '\\u2029'
};

function escapeUnsafeChars(unsafeChar: string) {
    // @ts-ignore
    return ESCAPED_CHARS[unsafeChar];
}

function generateUID() {
    const bytes = randomBytes(UID_LENGTH);
    let result = '';
    for (let i = 0; i < UID_LENGTH; ++i) {
        result += bytes[i].toString(16);
    }
    return result;
}

function deleteFunctions(obj: any) {
    const functionKeys = [];
    for (const key in obj) {
        if (typeof obj[key] === "function") {
            functionKeys.push(key);
        }
    }
    for (let i = 0; i < functionKeys.length; i++) {
        delete obj[functionKeys[i]];
    }
}

export interface SerializeJavaScriptOptions {
    /**
     * This option is the same as the space argument that can be passed to JSON.stringify.
     * It can be used to add whitespace and indentation to the serialized output to make it more readable.
     */
    space?: string | number;

    /**
     * This option is a signal to serialize() that the object being serialized does not contain any function or regexps values.
     * This enables a hot-path that allows serialization to be over 3x faster.
     * If you're serializing a lot of data, and know its pure JSON, then you can enable this option for a speed-up.
     */
    isJSON?: boolean;

    /**
     * This option is to signal serialize() that we want to do a straight conversion, without the XSS protection.
     * This options needs to be explicitly set to true. HTML characters and JavaScript line terminators will not be escaped.
     * You will have to roll your own.
     */
    unsafe?: true;

    /**
     * This option is to signal serialize() that we do not want serialize JavaScript function.
     * Just treat function like JSON.stringify do, but other features will work as expected.
     */
    ignoreFunction?: boolean;
}

export default function serialize(obj: any, options?: SerializeJavaScriptOptions | number | string): string {
    options || (options = {});

    if (typeof options === 'number' || typeof options === 'string') {
        options = { space: options };
    }

    const functions: any[] = [];
    const regexps: any[] = [];
    const dates: any[] = [];
    const maps: any[] = [];
    const sets: any[] = [];
    const arrays: any[] = [];
    const undefs: any[] = [];
    const infinities: any[] = [];
    const bigInts: any[] = [];

    // @ts-ignore
    function replacer(key, value) {

        // @ts-ignore
        if (options.ignoreFunction) {
            deleteFunctions(value);
        }

        if (!value && value !== undefined) {
            return value;
        }

        // @ts-ignore
        const origValue = this[key];
        const type = typeof origValue;

        if (type === 'object') {
            if (origValue instanceof RegExp) {
                return '@__R-' + UID + '-' + (regexps.push(origValue) - 1) + '__@';
            }

            if (origValue instanceof Date) {
                return '@__D-' + UID + '-' + (dates.push(origValue) - 1) + '__@';
            }

            if (origValue instanceof Map) {
                return '@__M-' + UID + '-' + (maps.push(origValue) - 1) + '__@';
            }

            if (origValue instanceof Set) {
                return '@__S-' + UID + '-' + (sets.push(origValue) - 1) + '__@';
            }

            if (origValue instanceof Array) {
                const isSparse = origValue.filter(function () { return true }).length !== origValue.length;
                if (isSparse) {
                    return '@__A-' + UID + '-' + (arrays.push(origValue) - 1) + '__@';
                }
            }
        }

        if (type === 'function') {
            return '@__F-' + UID + '-' + (functions.push(origValue) - 1) + '__@';
        }

        if (type === 'undefined') {
            return '@__U-' + UID + '-' + (undefs.push(origValue) - 1) + '__@';
        }

        if (type === 'number' && !isNaN(origValue) && !isFinite(origValue)) {
            return '@__I-' + UID + '-' + (infinities.push(origValue) - 1) + '__@';
        }

        if (type === 'bigint') {
            return '@__B-' + UID + '-' + (bigInts.push(origValue) - 1) + '__@';
        }

        return value;
    }

    function serializeFunc(fn: Function) {
        const serializedFn = fn.toString();
        if (IS_NATIVE_CODE_REGEXP.test(serializedFn)) {
            throw new TypeError('Serializing native function: ' + fn.name);
        }

        if (IS_PURE_FUNCTION.test(serializedFn)) {
            return serializedFn;
        }

        if (IS_ARROW_FUNCTION.test(serializedFn)) {
            return serializedFn;
        }

        const argsStartsAt = serializedFn.indexOf('(');
        const def = serializedFn.substr(0, argsStartsAt)
            .trim()
            .split(' ')
            .filter((val: string) => val.length > 0);

        const nonReservedSymbols = def.filter((val) => {
            return RESERVED_SYMBOLS.indexOf(val) === -1
        });

        if (nonReservedSymbols.length > 0) {
            return (def.indexOf('async') > -1 ? 'async ' : '') + 'function'
                + (def.join('').indexOf('*') > -1 ? '*' : '')
                + serializedFn.substr(argsStartsAt);
        }

        return serializedFn;
    }

    if (options.ignoreFunction && typeof obj === "function") {
        obj = undefined;
    }

    if (obj === undefined) {
        return String(obj);
    }

    let str: string;

    if (options.isJSON && !options.space) {
        str = JSON.stringify(obj);
    } else {
        // @ts-ignore
        str = JSON.stringify(obj, options.isJSON ? null : replacer, options.space);
    }

    if (typeof str !== 'string') {
        return String(str);
    }

    if (options.unsafe !== true) {
        str = str.replace(UNSAFE_CHARS_REGEXP, escapeUnsafeChars);
    }

    if (functions.length === 0 && regexps.length === 0 && dates.length === 0 && maps.length === 0 && sets.length === 0 && arrays.length === 0 && undefs.length === 0 && infinities.length === 0 && bigInts.length === 0) {
        return str;
    }

    return str.replace(PLACE_HOLDER_REGEXP, (match, backSlash, type, valueIndex) => {
        if (backSlash) {
            return match;
        }

        if (type === 'D') {
            return "new Date(\"" + dates[valueIndex].toISOString() + "\")";
        }

        if (type === 'R') {
            // @ts-ignore
            return "new RegExp(" + serialize(regexps[valueIndex].source) + ", \"" + regexps[valueIndex].flags + "\")";
        }

        if (type === 'M') {
            return "new Map(" + serialize(Array.from(maps[valueIndex].entries()), options) + ")";
        }

        if (type === 'S') {
            return "new Set(" + serialize(Array.from(sets[valueIndex].values()), options) + ")";
        }

        if (type === 'A') {
            return "Array.prototype.slice.call(" + serialize(Object.assign({ length: arrays[valueIndex].length }, arrays[valueIndex]), options) + ")";
        }

        if (type === 'U') {
            return 'undefined'
        }

        if (type === 'I') {
            return infinities[valueIndex];
        }

        if (type === 'B') {
            return "BigInt(\"" + bigInts[valueIndex] + "\")";
        }

        const fn = functions[valueIndex];

        return serializeFunc(fn);
    });
}

export function deserialize(data: string): any {
    return eval(`(${data})`);
}

export { serialize }