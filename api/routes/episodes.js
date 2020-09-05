const { Router } = require("express");
const EpisodeInfo = require("../../models/episodeInfo");
const { Log, LogLevels } = require("../../loaders/log");
const scraper = require("../../services/scraper");
const route = Router();

function _default(app) {
    app.use("/episodes", route);
    const Logger = Log.createLogger();

    route.get("/list/:id", async (req, res) => {
        Logger.LogMessage(`new request episodesList! idImdb: ${req.params.id}`, LogLevels.request, "episodesList", "index.js");
        var response;
        var statusCode = 400;
        try {
            var currentDate = new Date();

            const url = `https://www.imdb.com/title/${req.params.id}/episodes/_ajax?year=${currentDate.getFullYear()}`;
            Logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "episodesList", "index.js");

            let html = await scraper.getHtmlFromUrl(url);
            Logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "episodesList", "index.js");

            var attrFilterYear = "#byYear > option";
            var years = await scraper.getFilteredHtml(html, attrFilterYear, false, null, 0);

            response = await getEpisodesList(req.params.id, years);
            statusCode = 200;
        } catch (err) {
            response = err.message;
            statusCode = 500;
            Logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "episodesList", "index.js");
        } finally {
            Logger.LogMessage(`Responding to /episodesList/${req.params.id} with status code ${statusCode}`, LogLevels.response, "episodesList", "index.js");
            res.status(statusCode).send(response);
        }
    });

    async function getEpisodesList(idImdb, years) {
        listRes = [];
        const yearsMap = years.map((v) => getSeasonEpisodesByYear(idImdb, v));

        for await (const year of yearsMap) {
            listRes = year;
        }

        return listRes;
    }

    async function getSeasonEpisodesByYear(title, year) {
        episodesList = [];

        try {
            const url = `https://www.imdb.com/title/${title}/episodes/_ajax?year=${year}`;
            let html = await scraper.getHtmlFromUrl(url);

            const $ = ch.load(html);

            $(".list_item").each((i, el) => {
                var title = $(el).find(".image > a").attr("title");
                var link = $(el).find(".image > a").attr("href");
                var epNumber = $(el).find(".image > a > div > div").text();
                if (!epNumber) {
                    epNumber = $(el).find(".image > div > div").text();
                }
                var airdate = $(el).find(".info > .airdate").text();
                var dateRaw = Date.parse(airdate);
                dateRaw = new Date(dateRaw);
                var year = dateRaw.getFullYear();

                var images = $(el).find(".hover-over-image > img");
                var imageLink = "";
                if (images.length > 0) {
                    imageLink = images[0].attribs.src;
                }

                var ratingCountRaw = $(el).find(".ipl-rating-star__total-votes").first().text().trim();
                var ratingCount = ratingCountRaw.substring(1, ratingCountRaw.length - 1);
                var rating = $(el).find(".ipl-rating-star__rating").first().text();

                try {
                    var episode = new EpisodeInfo(title, link, imageLink, epNumber, year, rating, ratingCount);
                    episodesList.push(episode);
                    Logger.LogMessage(episode.toString(), LogLevels.info, "getSeasonInfoByYear", "index.js");
                } catch (e) {
                    Logger.LogMessage(
                        `Error trying to save Episode (${title}, ${link}, ${epNumber}, ${year}, ${rating})`,
                        LogLevels.error,
                        "getSeasonInfoByYear",
                        "index.js"
                    );
                }
            });
        } catch (e) {
            Logger.LogMessage(`Error in function 'getSeasonInfoByYear': ${e}`, LogLevels.error, "getSeasonInfoByYear", "index.js");
        }

        return episodesList;
    }
}

module.exports = _default;
