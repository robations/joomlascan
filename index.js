#!/usr/bin/env node
/**
 * Script to scan paths from stdin for Joomla installs and find the installed version.
 */

var Promise = require("bluebird");
var Rx = require("rx");
var RxNode = require("rx-node");
var lineReader = require("byline");
var path = require("path");
var isThere = require("is-there");
var Table = require("cli-table2");
var stream = require("stream");

var fs = Promise.promisifyAll(require("fs"));
var _ = require("lodash");
var meow = require("meow");

var stat = Rx.Observable.fromNodeCallback(fs.stat);
var access = Rx.Observable.fromCallback(isThere);
var stdIn = lineReader(process.stdin);


var cli = meow({
    help: [
        "Usage:",
        "  $ joomlascan < paths_to_joomla_files_or_dirs.txt",
        "",
        "Examples",
        "  locate joomla.xml | joomlascan",
        "  find /var/www -name 'joomla.xml' -depth 3 | joomlascan"
    ]
});

var dir$ = RxNode
    .fromStream(stdIn)
    .map(function (x) {
        return x.toString().trim();
    })
    .flatMap(function (x) {
        return stat(x)
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

var version$ = dir$
    .flatMap(function (dir) {
        var regex = /\$(RELEASE|DEV_LEVEL)/;
        return Rx.Observable
            .catch(
                RxNode.fromReadableStream(lineStream(dir + path.sep + "libraries/cms/version/version.php")),
                RxNode.fromReadableStream(lineStream(dir + path.sep + "libraries/joomla/version.php")),
                RxNode.fromReadableStream(lineStream(dir + path.sep + "includes/version.php"))
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
            if (!agg.hasOwnProperty(dir)) {
                agg[dir] = {
                    release: null,
                    devLevel: null
                };
            }
            var release = line.match(/\$RELEASE\s*=\s*['"]([0-9.]+)['"]/);
            var devLevel = line.match(/\$DEV_LEVEL\s*=\s*['"]([0-9.]+)['"]/);
            if (release !== null) {
                agg[dir].release = release[1];
            }
            if (devLevel !== null) {
                agg[dir].devLevel = devLevel[1];
            }

            return agg;
        },
        {}
    )
;

version$.subscribe(
    function (x) {
        var table = new Table({
            head: ["Path to Joomla install", "Current version"]
        });
        for (var dir in x) {
            if (x.hasOwnProperty(dir)) {
                table.push([dir, x[dir].release + "." + x[dir].devLevel]);
            }
        }
        console.log(table.toString());
    },
    function (e) {
        console.error(e);
    }
);

function lineStream(filename) {
    var readStream = fs.createReadStream(filename, {encoding: "utf8"});
    var lineReader2 = lineReader(readStream);
    readStream
        .on("error", function (e) {
            // propagate error to outer stream:
            lineReader2.emit("error", e);
        })
    ;
    lineReader2.on("error", noop);

    return lineReader2;
}

function noop() {
}
