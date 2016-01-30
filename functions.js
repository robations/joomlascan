var fs = require("fs");
var lineReader = require("byline");

/**
 * Creates a line-by-line stream from the given path.
 *
 * @param filename
 * @returns {*}
 */
function lineStream(filename) {
    var readStream = fs.createReadStream(filename, {encoding: "utf8"});
    var lineReader2 = lineReader(readStream);
    readStream
        .on("error", function (e) {
            // propagate error to outer stream:
            lineReader2.emit("error", e);
        })
    ;

    // add an error handler to the outer stream to prevent uncaught exceptions:
    lineReader2.on("error", noop);

    return lineReader2;
}

function noop() {
}

module.exports = {
    lineStream: lineStream
};
