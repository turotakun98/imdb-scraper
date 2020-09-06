const rp = require("request-promise");
const ch = require("cheerio");
const { Log, LogLevels } = require("../loaders/log");

var Scraper = function () {
    const Logger = Log.createLogger();

    function getHtmlFromUrl(url) {
        Logger.LogMessage(`Reading HTML from url ${url} ...`, LogLevels.info, "getHtmlFromUrl", "services/services/scraper.js");
        return new Promise((result) => {
            rp(url)
                .then(function (html) {
                    Logger.LogMessage("HTML successfully read " + url, LogLevels.info, "getHtmlFromUrl", "services/scraper.js");
                    result(html);
                })
                .catch(function (err) {
                    Logger.LogMessage("HTML read error: " + err.message, LogLevels.error, "getHtmlFromUrl", "services/scraper.js");
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

        Logger.LogMessage(`Res: ${results}`, LogLevels.info, "getFilteredHtml", "services/scraper.js");

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
