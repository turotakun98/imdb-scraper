const request = require("request");
const ch = require("cheerio");

const EpisodeInfo = require("./episodeInfo");
const TitleInfo = require("./titleInfo");
const SeriesInfo = require("./seriesInfo");

const cors = require("cors");
const express = require("express");
const app = express();
const config = require("./config");
const { Log, LogLevels } = require("./log");
const Scraper = require("./scraper");

// LOG
const logger = Log.createLogger({
    path: config.logPath,
    applicationName: config.applicationName,
    minLogLevel: config.minLogLevel,
    logInConsole: config.logInConsole,
});
const scraper = new Scraper(logger);
logger.LogMessage("Appplication start", LogLevels.info, "main", "index.js");

// EXPRESS -- WEB FRAMEWORK
app.use(express.json());
app.use(cors());
var port = config.port;
app.listen(port, logger.LogMessage(`Listening on port ${port}...`, LogLevels.info, "main", "index.js"));

app.get("/titleList/:t", async (req, res) => {
    logger.LogMessage(`new request titleList for title: ${req.params.t}`, LogLevels.request, "titleList", "index.js");

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
        logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "titleList", "index.js");
    } finally {
        res.status(statusCode).send(response);
    }

    logger.LogMessage(`Responding to /titleList/${req.params.t} with status code ${statusCode}`, LogLevels.response, "titleList", "index.js");
});

app.get("/seriesInfo/:id", async (req, res) => {
    logger.LogMessage(`new request seriesInfo! idImdb: ${req.params.id}`, LogLevels.request, "seriesInfo", "index.js");
    var response;
    var statusCode = 400;
    try {
        const url = `https://www.imdb.com/title/${req.params.id}`;

        logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "seriesInfo", "index.js");
        let html = await scraper.getHtmlFromUrl(url);
        logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "seriesInfo", "index.js");

        var attrGenres = ".see-more.inline.canwrap";
        var genres = await scraper.getFilteredHtml(html, attrGenres, true, "a", 1);
        logger.LogMessage(`genres: [${genres}]`, LogLevels.info, "seriesInfo", "index.js");

        var attrPlot = ".summary_text";
        var plot = await scraper.getFilteredHtml(html, attrPlot, true, null, 0);
        logger.LogMessage(`plot: [${plot}]`, LogLevels.info, "seriesInfo", "index.js");

        var attrRate = "*[itemprop = 'ratingValue']";
        var rate = await scraper.getFilteredHtml(html, attrRate, true, null, 0);
        logger.LogMessage(`rate: [${rate}]"`, LogLevels.info, "seriesInfo", "index.js");

        var attrRateCount = "*[itemprop = 'ratingCount']";
        var rateCount = await scraper.getFilteredHtml(html, attrRateCount, true, null, 0);
        logger.LogMessage(`rateCount: [${rateCount}]`, LogLevels.info, "seriesInfo", "index.js");

        response = new SeriesInfo(req.params.id, genres, plot[0], rate[0], rateCount[0]);
        statusCode = 200;
    } catch (err) {
        response = err.message;
        statusCode = 500;
        logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "seriesInfo", "index.js");
    } finally {
        res.status(statusCode).send(response);
    }

    logger.LogMessage(`Responding to /seriesInfo/${req.params.id} with status code ${statusCode}`, LogLevels.response, "seriesInfo", "index.js");
});

app.get("/episodesList/:id", async (req, res) => {
    logger.LogMessage(`new request episodesList! idImdb: ${req.params.id}`, LogLevels.request, "episodesList", "index.js");
    var response;
    var statusCode = 400;
    try {
        var currentDate = new Date();

        const url = `https://www.imdb.com/title/${req.params.id}/episodes/_ajax?year=${currentDate.getFullYear()}`;
        logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "episodesList", "index.js");

        let html = await scraper.getHtmlFromUrl(url);
        logger.LogMessage(`Html received from url ${url}`, LogLevels.info, "episodesList", "index.js");

        var attrFilterYear = "#byYear > option";
        var years = await scraper.getFilteredHtml(html, attrFilterYear, false, null, 0);

        response = await getEpisodesList(req.params.id, years);
    } catch (err) {
        response = err.message;
        statusCode = 500;
        logger.LogMessage(`Catched error ${err.message}`, LogLevels.error, "episodesList", "index.js");
    } finally {
        res.status(statusCode).send(response);
    }

    res.send(listRes);
    logger.LogMessage(`Responding to /episodesList/${req.params.id} with status code ${statusCode}`, LogLevels.response, "episodesList", "index.js");
});

// FUNCTIONS

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

async function getEpisodesList(idImdb, years) {
    listRes = [];
    const yearsMap = years.map((v) => getSeasonEpisodesByYear(idImdb, v));

    for await (const year of yearsMap) {
        listRes = year;
    }

    return listRes;
}

async function callHttpMethod(url) {
    var prom = new Promise((result) => {
        logger.LogMessage("Requesting api", LogLevels.info, "callHttpMethod", "index.js");
        request.get(url, (error, res, body) => {
            if (error) {
                logger.LogMessage(error, LogLevels.error, "callHttpMethod", "index.js");
                return;
            }
            result(res);
            logger.LogMessage(`Api statusCode: ${res.statusCode}`, LogLevels.info, "callHttpMethod", "index.js");
        });
    });
    return prom;
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
                logger.LogMessage(episode.toString(), LogLevels.info, "getSeasonInfoByYear", "index.js");
            } catch (e) {
                logger.LogMessage(
                    `Error trying to save Episode (${title}, ${link}, ${epNumber}, ${year}, ${rating})`,
                    LogLevels.error,
                    "getSeasonInfoByYear",
                    "index.js"
                );
            }
        });
    } catch (e) {
        logger.LogMessage(`Error in function 'getSeasonInfoByYear': ${e}`, LogLevels.error, "getSeasonInfoByYear", "index.js");
    }

    return episodesList;
}
