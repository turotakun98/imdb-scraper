const request = require("request");
const rp = require("request-promise");
const ch = require("cheerio");

const EpisodeInfo = require("./episodeInfo");
const TitleInfo = require("./titleInfo");
const SeriesInfo = require("./seriesInfo");

const cors = require("cors");
const express = require("express");
const app = express();
const config = require("./config");

const { Log, LogLevels } = require("./log");
const logger = Log.createLogger({
    path: config.logPath,
    applicationName: config.applicationName,
    minLogLevel: config.minLogLevel,
    logInConsole: config.logInConsole,
});

logger.LogMessage("test 1", LogLevels.debug, "main", "index.js");
// EXPRESS -- WEB FRAMEWORK
app.use(express.json());
app.use(cors());
var port = config.port;
app.listen(port, () => logger.LogMessage(`Listening on port ${port}...`, LogLevels.info, "main", "index.js"));

app.get("/titleList/:t", async (req, res) => {
    logger.LogMessage(`new request titleList for title: ${req.params.t}`, LogLevels.info, "titleList", "index.js");

    if (req.params.t) {
        var seriesResponse = [];
        var titleToSearch = req.params.t.toLowerCase();

        var url = `https://sg.media-imdb.com/suggests/${titleToSearch[0]}/${titleToSearch}.json`;
        var callResp = await callHttpMethod(url);

        if (callResp.statusCode == 200) {
            var respBody = callResp.body;
            var replHead = "imdb$" + titleToSearch + "(";
            respBody = respBody.replace(replHead, "");
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
                res.send(seriesResponse);
            } else {
                logger.LogMessage("no property d found in json", LogLevels.info, "titleList", "index.js");
                res.send("no property d found in json");
            }
        } else {
            logger.LogMessage("generic error status code", LogLevels.info, "titleList", "index.js");
            res.send("generic error status code", LogLevels.error, "titleList", "index.js");
        }
    } else {
        logger.LogMessage("Invalid field t (Title)", LogLevels.error, "titleList", "index.js");
        res.send("Invalid field t (Title)");
    }
});

app.get("/seriesInfo/:id", async (req, res) => {
    logger.LogMessage(`new request seriesInfo! idImdb: ${req.params.id}`, LogLevels.info, "seriesInfo", "index.js");

    const url = `https://www.imdb.com/title/${req.params.id}`;

    logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "seriesInfo", "index.js");
    let html = await getHtmlFromUrl(url);
    logger.LogMessage("(3) Html received", LogLevels.info, "seriesInfo", "index.js");

    var attrGenres = ".see-more.inline.canwrap";
    var genres = await getFilteredHtml(html, attrGenres, true, "a", 1);
    logger.LogMessage(`genres: [${genres}]`, LogLevels.info, "seriesInfo", "index.js");

    var attrPlot = ".summary_text";
    var plot = await getFilteredHtml(html, attrPlot, true, null, 0);
    logger.LogMessage(`plot: [${plot}]`, LogLevels.info, "seriesInfo", "index.js");

    var attrRate = "*[itemprop = 'ratingValue']";
    var rate = await getFilteredHtml(html, attrRate, true, null, 0);
    logger.LogMessage(`rate: [${rate}]"`, LogLevels.info, "seriesInfo", "index.js");

    var attrRateCount = "*[itemprop = 'ratingCount']";
    var rateCount = await getFilteredHtml(html, attrRateCount, true, null, 0);
    logger.LogMessage(`rateCount: [${rateCount}]`, LogLevels.info, "seriesInfo", "index.js");

    var seriesInfo = new SeriesInfo(req.params.id, genres, plot[0], rate[0], rateCount[0]);

    res.send(seriesInfo);
});

app.get("/episodesList/:id", async (req, res) => {
    logger.LogMessage(`new request episodesList! idImdb: ${req.params.id}`, LogLevels.info, "episodesList", "index.js");

    var d = new Date();

    const url = `https://www.imdb.com/title/${req.params.id}/episodes/_ajax?year=${d.getFullYear()}`;
    logger.LogMessage(`Require HTML for the url: ${url}`, LogLevels.info, "episodesList", "index.js");

    let html = await getHtmlFromUrl(url);
    logger.LogMessage("(3) Html received", LogLevels.info, "episodesList", "index.js");

    var attrFilterYear = "#byYear > option";
    var years = await getFilteredHtml(html, attrFilterYear, false, null, 0);

    var listRes = [];
    listRes = await getEpisodesList(req.params.id, years);

    res.send(listRes);
});

// FUNCTIONS
async function getEpisodesList(idImdb, years) {
    listRes = [];
    const yearsMap = years.map((v) => getSeasonInfoByYear(idImdb, v));

    for await (const year of yearsMap) {
        listRes = year;
    }

    return listRes;
}

async function callHttpMethod(url) {
    return new Promise((result) => {
        logger.LogMessage("Requesting api", LogLevels.info, "callHttpMethod", "index.js");
        let a = request.get(url, (error, res, body) => {
            if (error) {
                console.error(error);
                return;
            }
            result(res);
            logger.LogMessage(`Api statusCode: ${res.statusCode}`, LogLevels.info, "callHttpMethod", "index.js");
        });
    });
}

async function getFilteredHtml(html, filterAttributes, searchChilds, attributeChildsType, startAttributeIndex) {
    var results = [];

    var childNodes = ch(filterAttributes, html);
    for (let i = startAttributeIndex; i < childNodes.length; i++) {
        var childAttr = [];

        childAttr = searchChilds ? getValueChildrens(childNodes[i], attributeChildsType) : [childNodes[i].attribs.value];

        results = results.concat(childAttr);
    }

    logger.LogMessage(`Res: ${results}`, LogLevels.info, "getFilteredHtml", "index.js");

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

async function getSeasonInfoByYear(title, year) {
    episodesList = [];

    try {
        const url = `https://www.imdb.com/title/${title}/episodes/_ajax?year=${year}`;
        let html = await getHtmlFromUrl(url);

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

async function getSeasonInfoByNumber(title, season) {
    const url = `https://www.imdb.com/title/${title}/episodes/_ajax?season=${season}`;
    let html = await getHtmlFromUrl(url);
}

function getHtmlFromUrl(url) {
    logger.LogMessage("(1) HTML reading ...", LogLevels.info, "getHtmlFromUrl", "index.js");
    return new Promise((result) => {
        rp(url)
            .then(function (html) {
                logger.LogMessage("(2) HTML read", LogLevels.info, "getHtmlFromUrl", "index.js");
                result(html);
            })
            .catch(function (err) {
                logger.LogMessage(err, LogLevels.error, "getHtmlFromUrl", "index.js");
            });
    });
}
