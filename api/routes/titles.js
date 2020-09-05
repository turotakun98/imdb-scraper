const { Router } = require("express");
const TitleInfo = require("../../models/titleInfo");
const { Log, LogLevels } = require("../../loaders/log");
const route = Router();

function _default(app) {
    app.use("/titles", route);
    const Logger = Log.createLogger();

    route.get("/list/:t", async (req, res) => {
        Logger.LogMessage(`new request titleList for title: ${req.params.t}`, LogLevels.request, "titleList", "index.js");

        var response;
        var statusCode = 400;
        try {
            if (req.params.t) {
                var titleToSearch = req.params.t.toLowerCase();

                var url = `https://sg.media-imdb.com/suggests/${titleToSearch[0]}/${titleToSearch}.json`;
                var callResp = await callHttpMethod(url);

                if (callResp.statusCode == 200) {
                    var respBody = callResp.body;
                    response = parseSeriesFromJson(respBody, titleToSearch);
                    statusCode = 200;
                } else {
                    throw new Error("generic error status code");
                }
            } else {
                throw new Error("Invalid field t (Title)");
            }
        } catch (err) {
            response = err.message;
            statusCode = 500;
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "titleList", "index.js");
        } finally {
            res.status(statusCode).send(response);
        }

        Logger.LogMessage(`Responding to /titleList/${req.params.t} with status code ${statusCode}`, LogLevels.response, "titleList", "index.js");
    });

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
}

module.exports = _default;
