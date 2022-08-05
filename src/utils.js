const util = require('util');
// Native deprecation warning
exports.deprecate = (msg) => util.deprecate(() => { }, msg, 'node-telegram-bot-api')();

// Slice an arry in sub-arrays
export function sliceIntoChunks (arr, chunkSize) {
    const res = [];
    for (let i = 0; i < arr.length; i += chunkSize) {
        const chunk = arr.slice(i, i + chunkSize);
        res.push(chunk);
    }
    return res;
}