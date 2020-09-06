const { Router } = require("express");
const { Log, LogLevels } = require("../../loaders/log");
const ScraperService = require("../../services/scraper");
const EpisodesService = require("../../services/episodes");
const route = Router();

function _default(app) {
    app.use("/episodes", route);
    const Logger = Log.createLogger();
    const ScraperServiceInstance = new ScraperService();
    const EpisodesServiceInstance = new EpisodesService();

    route.get("/list/:id", async (req, res) => {
        Logger.LogMessage(`new request /episodes/list! idImdb: ${req.params.id}`, LogLevels.request, "list", "routes/episodes.js");
        var response;
        var statusCode = 400;
        try {
            var currentDate = new Date();

            const url = `https://www.imdb.com/title/${req.params.id}/episodes/_ajax?year=${currentDate.getFullYear()}`;
            Logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "list", "routes/episodes.js");

            let html = await ScraperServiceInstance.getHtmlFromUrl(url);
            Logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "list", "routes/episodes.js");

            var attrFilterYear = "#byYear > option";
            var years = await ScraperServiceInstance.getFilteredHtml(html, attrFilterYear, false, null, 0);

            response = await EpisodesServiceInstance.getEpisodesList(req.params.id, years);
            statusCode = 200;
        } catch (err) {
            response = err.message;
            statusCode = 500;
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "list", "routes/episodes.js");
        } finally {
            Logger.LogMessage(`Responding to /episodes/list/${req.params.id} with status code ${statusCode}`, LogLevels.response, "list", "routes/episodes.js");
            res.status(statusCode).send(response);
        }
    });
}

module.exports = _default;
