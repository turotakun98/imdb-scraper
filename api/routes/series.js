const { Router } = require("express");
const SeriesInfo = require("../../models/seriesInfo");
const { Log, LogLevels } = require("../../loaders/log");
const ScraperService = require("../../services/scraper");
const route = Router();

function _default(app) {
    app.use("/series", route);
    const Logger = Log.createLogger();
    const ScraperServiceInstance = new ScraperService();
    route.get("/info/:id", async (req, res) => {
        Logger.LogMessage(`new request seriesInfo! idImdb: ${req.params.id}`, LogLevels.request, "seriesInfo", "index.js");
        var response;
        var statusCode = 400;
        try {
            const url = `https://www.imdb.com/title/${req.params.id}`;

            Logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "seriesInfo", "index.js");
            let html = await ScraperServiceInstance.getHtmlFromUrl(url);
            Logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "seriesInfo", "index.js");

            var attrGenres = ".see-more.inline.canwrap";
            var genres = await ScraperServiceInstance.getFilteredHtml(html, attrGenres, true, "a", 1);
            Logger.LogMessage(`genres: [${genres}]`, LogLevels.info, "seriesInfo", "index.js");

            var attrPlot = ".summary_text";
            var plot = await ScraperServiceInstance.getFilteredHtml(html, attrPlot, true, null, 0);
            Logger.LogMessage(`plot: [${plot}]`, LogLevels.info, "seriesInfo", "index.js");

            var attrRate = "*[itemprop = 'ratingValue']";
            var rate = await ScraperServiceInstance.getFilteredHtml(html, attrRate, true, null, 0);
            Logger.LogMessage(`rate: [${rate}]"`, LogLevels.info, "seriesInfo", "index.js");

            var attrRateCount = "*[itemprop = 'ratingCount']";
            var rateCount = await ScraperServiceInstance.getFilteredHtml(html, attrRateCount, true, null, 0);
            Logger.LogMessage(`rateCount: [${rateCount}]`, LogLevels.info, "seriesInfo", "index.js");

            response = new SeriesInfo(req.params.id, genres, plot[0], rate[0], rateCount[0]);
            statusCode = 200;
        } catch (err) {
            response = err.message;
            statusCode = 500;
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "seriesInfo", "index.js");
        } finally {
            res.status(statusCode).send(response);
        }

        Logger.LogMessage(`Responding to /seriesInfo/${req.params.id} with status code ${statusCode}`, LogLevels.response, "seriesInfo", "index.js");
    });
}
module.exports = _default;
