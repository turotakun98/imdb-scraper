const request = require("request");
const { Log, LogLevels } = require("../loaders/log");
const TitleInfo = require("../models/titleInfo");

var TitlesService = function () {
    var Logger = Log.createLogger();

    function parseSeriesFromJson(json, titleToSearch) {
        var seriesResponse = [];
        var replHead = "imdb$" + titleToSearch + "(";
        var respBody = json.replace(replHead, "");
        respBody = respBody.substring(0, respBody.length - 1);
        var respJson = JSON.parse(respBody);
        if (respJson.hasOwnProperty("d")) {
            var data = respJson.d;
            data.forEach((el) => {
                if (el["q"] == "TV series") {
                    var image = null;
                    if (el["i"]) image = el["i"][0];

                    var series = new TitleInfo(el["id"], el["l"], el["yr"], image);
                    seriesResponse.push(series);
                }
            });
            return seriesResponse;
        } else {
            throw new Error("no property d found in json");
        }
    }

    async function callHttpMethod(url) {
        var prom = new Promise((result) => {
            Logger.LogMessage("Requesting api", LogLevels.info, "callHttpMethod", "index.js");
            request.get(url, (error, res, body) => {
                if (error) {
                    Logger.LogMessage(error.message, LogLevels.error, "callHttpMethod", "index.js");
                    return;
                }
                result(res);
                Logger.LogMessage(`Api statusCode: ${res.statusCode}`, LogLevels.info, "callHttpMethod", "index.js");
            });
        });
        return prom;
    }

    return {
        parseSeriesFromJson: parseSeriesFromJson,
        callHttpMethod: callHttpMethod,
    };
};

module.exports = TitlesService;
