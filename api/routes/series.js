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
        Logger.LogMessage(`new request series/info! idImdb: ${req.params.id}`, LogLevels.request, "info", "routes/series.js");
        var response;
        var statusCode = 400;
        try {
            const url = `https://www.imdb.com/title/${req.params.id}`;

            Logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "info", "routes/series.js");
            let html = await ScraperServiceInstance.getHtmlFromUrl(url);
            Logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "info", "routes/series.js");

            var attrGenres = ".see-more.inline.canwrap";
            var genres = await ScraperServiceInstance.getFilteredHtml(html, attrGenres, true, "a", 1);
            Logger.LogMessage(`genres: [${genres}]`, LogLevels.info, "info", "routes/series.js");

            var attrPlot = ".summary_text";
            var plot = await ScraperServiceInstance.getFilteredHtml(html, attrPlot, true, null, 0);
            Logger.LogMessage(`plot: [${plot}]`, LogLevels.info, "info", "routes/series.js");

            var attrRate = "*[itemprop = 'ratingValue']";
            var rate = await ScraperServiceInstance.getFilteredHtml(html, attrRate, true, null, 0);
            Logger.LogMessage(`rate: [${rate}]"`, LogLevels.info, "info", "routes/series.js");

            var attrRateCount = "*[itemprop = 'ratingCount']";
            var rateCount = await ScraperServiceInstance.getFilteredHtml(html, attrRateCount, true, null, 0);
            Logger.LogMessage(`rateCount: [${rateCount}]`, LogLevels.info, "info", "routes/series.js");

            response = new SeriesInfo(req.params.id, genres, plot[0], rate[0], rateCount[0]);
            statusCode = 200;
        } catch (err) {
            response = err.message;
            statusCode = 500;
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "info", "routes/series.js");
        } finally {
            res.status(statusCode).send(response);
        }

        Logger.LogMessage(`Responding to series/info/${req.params.id} with status code ${statusCode}`, LogLevels.response, "info", "routes/series.js");
    });
}
module.exports = _default;
