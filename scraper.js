const { LogLevels } = require("./log");
const rp = require("request-promise");
const ch = require("cheerio");

var Scraper = function (logger) {
    var privateLogger = undefined;

    if (typeof logger.LogMessage == "function") {
        privateLogger = logger;
    } else {
        throw new Error("No method 'LogMessage' found in the given logger object");
    }

    function getHtmlFromUrl(url) {
        privateLogger.LogMessage("(1) HTML reading ...", LogLevels.info, "getHtmlFromUrl", "scraper.js");
        return new Promise((result) => {
            rp(url)
                .then(function (html) {
                    privateLogger.LogMessage("(2) HTML read", LogLevels.info, "getHtmlFromUrl", "scraper.js");
                    result(html);
                })
                .catch(function (err) {
                    privateLogger.LogMessage(err, LogLevels.error, "getHtmlFromUrl", "scraper.js");
                });
        });
    }

    function getFilteredHtml(html, filterAttributes, searchChilds, attributeChildsType, startAttributeIndex) {
        var results = [];

        var childNodes = ch(filterAttributes, html);
        for (let i = startAttributeIndex; i < childNodes.length; i++) {
            var childAttr = [];

            childAttr = searchChilds ? getValueChildrens(childNodes[i], attributeChildsType) : [childNodes[i].attribs.value];

            results = results.concat(childAttr);
        }

        privateLogger.LogMessage(`Res: ${results}`, LogLevels.info, "getFilteredHtml", "scraper.js");

        return results;
    }

    function getValueChildrens(parent, filter) {
        if (!parent.nodeValue || parent.nodeValue.trim() == "") {
            if (parent.childNodes) {
                var res = [];
                for (var i = 0; i < parent.childNodes.length; i++) {
                    var resTmp = [];
                    if (filter && filter == parent.childNodes[i].tagName) {
                        resTmp = getValueChildrens(parent.childNodes[i].firstChild, filter);
                    }
                    if (!filter) {
                        resTmp = getValueChildrens(parent.childNodes[i], null);
                    }

                    if (resTmp.length > 0) {
                        res = res.concat(resTmp);
                    }
                }
                return res;
            } else {
                return [""];
            }
        } else {
            return [parent.nodeValue.trim()];
        }
    }

    return {
        getHtmlFromUrl,
        getFilteredHtml,
    };
};

module.exports = Scraper;
