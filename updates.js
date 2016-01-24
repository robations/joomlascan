var got = require("got");
var DOMParser = require('xmldom').DOMParser;
var im = require("immutable");

var defaults = im.fromJS({
    "1.5": {
        latest: "1.5.26",
        status: "Eol",
        releaseDate: "2012-03-27"
    },
    "1.6": {
        latest: "1.6.6",
        status: "Eol",
        releaseDate: "2011-07-26"
    },
    "1.7": {
        latest: "1.7.5",
        status: "Eol",
        releaseDate: "2012-02-02"
    }
});

var UPDATE_ENDPOINT = "http://update.joomla.org/core/list.xml";

module.exports = function () {
    return got(UPDATE_ENDPOINT, {timeout: 2000})
        .then(function (res) {
            var doc = new DOMParser()
                .parseFromString(res.body, "text/xml")
            ;
            var extensionsDom = im.List(doc.getElementsByTagName("extension"));

            return extensionsDom
                .map(function (x) {
                    return {
                        name: x.getAttribute("name"),
                        element: x.getAttribute("element"),
                        type: x.getAttribute("type"),
                        version: x.getAttribute("version"),
                        targetPlatformVersion: x.getAttribute("targetplatformversion"),
                        detailsUrl: x.getAttribute("detailsurl")
                    };

                })
                .filter(function (x) {
                    return x.name === "Joomla" && x.type === "file";
                })
                .reduce(
                    function (agg, x) {
                        // TODO parsing and comparing versions should be a separate function
                        var versionParts = x.targetPlatformVersion.split(".", 2);
                        return agg
                            .set(x.targetPlatformVersion, im.Map({
                                latest: x.version,

                                // everything before 3.4 is now EOL (as at 2016-01-24)
                                // https://docs.joomla.org/Category:Version_History
                                status: (versionParts[0] == 3 && versionParts[1] < 4) || versionParts[0] < 3
                                    ? "Eol"
                                    : "",
                                releaseDate: null
                            }))
                        ;
                    },
                    defaults
                )
            ;
        })
    ;
};
