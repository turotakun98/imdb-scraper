const { Router } = require("express");
const { Log, LogLevels } = require("../../loaders/log");
const route = Router();
const TitlesService = require("../../services/titles");

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
                var callResp = await TitlesService.callHttpMethod(url);

                if (callResp.statusCode == 200) {
                    var respBody = callResp.body;
                    response = TitlesService.parseSeriesFromJson(respBody, titleToSearch);
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
}

module.exports = _default;
