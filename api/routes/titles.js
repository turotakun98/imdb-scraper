const { Router } = require("express");
const { Log, LogLevels } = require("../../loaders/log");
const route = Router();
const TitlesService = require("../../services/titles");

function _default(app) {
    app.use("/titles", route);
    const Logger = Log.createLogger();
    const TitlesServiceInstance = new TitlesService();

    route.get("/list/:t", async (req, res) => {
        Logger.LogMessage(`new request /title/list for title: ${req.params.t}`, LogLevels.request, "list", "routes/titles.js");
        var response;
        var statusCode = 400;
        try {
            if (req.params.t) {
                var titleToSearch = req.params.t.toLowerCase();

                var url = `https://sg.media-imdb.com/suggests/${titleToSearch[0]}/${titleToSearch}.json`;
                var callResp = await TitlesServiceInstance.callHttpMethod(url);

                if (callResp.statusCode == 200) {
                    var respBody = callResp.body;
                    response = TitlesServiceInstance.parseSeriesFromJson(respBody, titleToSearch);
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
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "list", "routes/titles.js");
        } finally {
            res.status(statusCode).send(response);
        }

        Logger.LogMessage(`Responding to /title/list/${req.params.t} with status code ${statusCode}`, LogLevels.response, "list", "routes/titles.js");
    });
}

module.exports = _default;
