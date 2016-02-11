var fs = require("fs");
var lineReader = require("byline");

function noop() {
}

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

/**
 * Creates a function to output as CSV to given stream
 *
 * @param writableStream
 * @param csv fast-csv
 * @returns {Function}
 */
function csvOutput(writableStream, csv) {
    var csvStream = csv.createWriteStream({headers: true});
    csvStream.pipe(writableStream);

    return function (x) {
        x.installs
            .forEach(function (y, dir) {
                csvStream.write({
                    install_path: dir,
                    install_version: y.get("release") + "." + y.get("devLevel"),
                    status: x.updates.getIn([y.get("release"), "status"], ""),
                    latest_version: x.updates.getIn([y.get("release"), "latest"], "")
                });
            })
        ;
        csvStream.end();
        writableStream.write("\n");
    };
}

/**
 * Creates a function to output as a pretty printed table
 *
 * @param Table cli-table2
 * @returns {Function}
 */
function tableOutput(Table) {
    return function (x) {
        var updates = x.updates;
        var installs = x.installs;
        var table = new Table({
            head: ["Path to Joomla install", "Install version", "Status", "Latest version"]
        });

        installs
            .forEach(function (y, dir) {
                table.push([
                    dir,
                    y.get("release") + "." + y.get("devLevel"),
                    updates.getIn([y.get("release"), "status"], ""),
                    updates.getIn([y.get("release"), "latest"], "")
                ]);
            })
        ;
        console.log(table.toString());
    };
}

module.exports = {
    lineStream: lineStream,
    csvOutput: csvOutput,
    tableOutput: tableOutput
};
