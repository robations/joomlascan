#!/usr/bin/env node
/**
 * Script to scan paths from stdin for Joomla installs and find the installed version.
 */

var Rx = require("rx");
var RxNode = require("rx-node");
var lineReader = require("byline");
var path = require("path");
var isThere = require("is-there");
var Table = require("cli-table2");
var im = require("immutable");
var fs = require("fs");
var meow = require("meow");
var semver = require("semver");
var csv = require("fast-csv");

var getUpdates = require("./updates");
var funcs = require("./functions");

var stat = Rx.Observable.fromNodeCallback(fs.stat);
var access = Rx.Observable.fromCallback(isThere);
var stdIn = lineReader(process.stdin);


var cli = meow(
    [
        "Usage:",
        "  $ joomlascan < paths_to_joomla_files_or_dirs.txt",
        "",
        "Options:",
        "  -o, --output  (table|csv) Output type. Defaults to table.",
        "  --help        Displays this help.",
        "  --version     Displays version number.",
        "",
        "Examples",
        "  locate configuration.php | joomlascan",
        "  find /var/www -name 'joomla.xml' -depth 3 | joomlascan",
        "  locate configuration.php | joomlascan -o csv > joomla-installs.csv"
    ],
    {
        alias: {
            o: "output"
        },
        string: ["output"],
        default: {
            output: "table"
        }
    }
);

// this allows piping to head without errors:
process.stdout.on("error", function (err) {
    if (err.code == "EPIPE") {
        process.exit(0);
    }
});

// output function
var output = (function () {
    switch (cli.flags.output.toLowerCase()) {
        case "table":
            return funcs.tableOutput(Table);
        default:
            return funcs.csvOutput(process.stdout, csv);
    }
}());


var dir$ = RxNode
    .fromStream(stdIn)
    .map(function (x) {
        return x.toString().trim();
    })
    .flatMap(function (x) {
        return Rx.Observable
            .onErrorResumeNext(stat(x))
            .map(function (stats) {
                if (stats.isDirectory()) {
                    return path.resolve(x);
                } else if (stats.isFile()) {
                    return path.resolve(path.dirname(x));
                }
                return null;
            })
            .filter(function (x) {
                return x !== null;
            })
        ;
    })
    .distinct(function (x) {
        return x;
    })
    .flatMap(function (x) {
        var sep = path.sep;
        return Rx.Observable
            .merge(
                access(x + sep + "libraries/cms/version/version.php"),
                access(x + sep + "libraries/joomla/version.php"),
                access(x + sep + "includes/version.php")
            )
            .reduce(
                function (agg, y) {
                    return [agg[0], agg[1] || y];
                },
                [x, false]
            )
        ;
    })
    .filter(function (x) {
        return x[1];
    })
    .map(function (x) {
        return x[0];
    })
;

// stream of Joomla installations:
var install$ = dir$
    .flatMap(function (dir) {
        var regex = /\$(RELEASE|DEV_LEVEL)/;
        return Rx.Observable
            .catch(
                RxNode.fromReadableStream(funcs.lineStream(dir + path.sep + "libraries/cms/version/version.php")),
                RxNode.fromReadableStream(funcs.lineStream(dir + path.sep + "libraries/joomla/version.php")),
                RxNode.fromReadableStream(funcs.lineStream(dir + path.sep + "includes/version.php"))
            )
            .filter(function (line) {
                return regex.test(line);
            })
            .distinct(function (x) {
                return x;
            })
            .map(function (line) {
                return [dir, line.trim()];
            })
        ;
    })
    .reduce(
        function (agg, x) {
            var dir = x[0];
            var line = x[1];
            var release = line.match(/\$RELEASE\s*=\s*['"]([0-9.]+)['"]/);
            var devLevel = line.match(/\$DEV_LEVEL\s*=\s*['"]([0-9.]+)['"]/);

            if (release !== null) {
                return agg.setIn([dir, "release"], release[1]);
            }
            if (devLevel !== null) {
                return agg.setIn([dir, "devLevel"], devLevel[1]);
            }
            return agg;
        },
        im.Map()
    )
;

// stream of Joomla update information:
var updates$ = Rx.Observable
    .fromPromise(getUpdates())
;

Rx.Observable
    .combineLatest(
        updates$,
        install$
    )
    .map(function (x) {
        return {
            updates: x[0],
            installs: im.OrderedMap(x[1])
                .sort(function (a, b) {
                    return semver.compare(
                        a.get("release") + "." + a.get("devLevel"),
                        b.get("release") + "." + b.get("devLevel")
                    );
                })
        }
    })
    .subscribe(
        output,
        function (e) {
            console.error(e);
        }
    )
;

