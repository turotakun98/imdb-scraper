const request = require("request");
const rp = require("request-promise");
const ch = require("cheerio");
const EpisodeInfo = require("./episodeInfo");
const SeriesInfo = require("./seriesInfo");
const cors = require("cors");
const express = require("express");
const app = express();

app.use(express.json());
app.use(cors());
var port = 9000;
app.listen(port, () => console.log(`Listening on port ${port}...`));

app.get("/titleList/:t", async (req, res) => {
  console.log("new request titleList for title: " + req.params.t);

  if (req.params.t) {
    var seriesResponse = [];

    var url = `https://sg.media-imdb.com/suggests/${req.params.t[0]}/${req.params.t}.json`;
    var callResp = await callHttpMethod(url);

    var respBody = callResp.body;
    var replHead = "imdb$" + req.params.t + "(";
    respBody = respBody.replace(replHead, "");
    respBody = respBody.substring(0, respBody.length - 1);
    var respJson = JSON.parse(respBody).d;
    respJson.forEach((el) => {
      if (el["q"] == "TV series") {
        var image = null;
        if (el["i"]) image = el["i"][0];

        var series = new SeriesInfo(el["id"], el["l"], el["yr"], image);
        seriesResponse.push(series);
      }
    });

    res.send(seriesResponse);
  } else {
    res.send("Invalid field t (Title)");
  }
});

app.get("/seriesInfo/:id", async (req, res) => {
  console.log("new request! idImdb: " + req.params.id);

  var d = new Date();

  const url = `https://www.imdb.com/title/${
    req.params.id
  }/episodes/_ajax?year=${d.getFullYear()}`; //`https://www.imdb.com/title/${req.params.id}/`;
  console.log("Require HTML for the url: " + url);

  let html = await getHtmlFromUrl(url);
  console.log("(3) Html received");

  var attrFilterYear = "#byYear > option";
  var years = await getFilteredHtml(html, attrFilterYear); //getNumberOfYearsTmp(html); //await getNumberOfYears(html);

  var attrFilterSeason = "#bySeason > option";
  var seasons = await getFilteredHtml(html, attrFilterSeason); //await getNumberOfSeasons(html);

  var listRes = [];
  listRes = await getEpisodesList(req.params.id, years);

  //OLD
  /*
  for (let i = 0; i < years.length; i++) {
    var episodesYear = await getSeasonInfoByYear(req.params.id, years[i]);
    listRes = listRes.concat(episodesYear);
  }*/

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
    console.log("Requesting api");
    let a = request.get(url, (error, res, body) => {
      if (error) {
        console.error(error);
        return;
      }
      result(res);
      console.log(`Api statusCode: ${res.statusCode}`);
    });
  });
}

async function getFilteredHtml(html, attrFilter) {
  years = [];

  var childNodes = ch(attrFilter, html);
  for (let i = 0; i < childNodes.length; i++) {
    childAttr = childNodes[i].attribs.value;
    years.push(childAttr);
  }

  console.log("Res:" + years);

  return years;
}

async function getSeasonInfoByYear(title, year) {
  episodesList = [];

  try {
    const url = `https://www.imdb.com/title/${title}/episodes/_ajax?year=${year}`;
    let html = await getHtmlFromUrl(url);

    const $ = ch.load(html);

    $(".list_item").each((i, el) => {
      var title = $(el).find(".image > a").attr("title");
      if (title == "undefined") {
        console.log("here1");
      }
      var link = $(el).find(".image > a").attr("href");
      var epNumber = $(el).find(".image > a > div > div").text();
      if (!epNumber) {
        epNumber = $(el).find(".image > div > div").text();
      }
      var airdate = $(el).find(".info > .airdate").text();

      var dateRaw = Date.parse(airdate);
      dateRaw = new Date(dateRaw);
      var year = dateRaw.getFullYear();

      var rating = $(el).find(".ipl-rating-star__rating").first().text();
      var episode = new EpisodeInfo(title, link, epNumber, year, rating);
      episodesList.push(episode);
      console.log(episode.toString());
    });
  } catch (e) {
    console.log("Error in function 'getSeasonInfoByYear': " + e);
  }

  return episodesList;
}

async function getSeasonInfoByNumber(title, season) {
  const url = `https://www.imdb.com/title/${title}/episodes/_ajax?season=${season}`;
  let html = await getHtmlFromUrl(url);
}

function getHtmlFromUrl(url) {
  console.log("(1) HTML reading ...");
  return new Promise((result) => {
    rp(url)
      .then(function (html) {
        console.log("(2) HTML read");
        result(html);
      })
      .catch(function (err) {
        console.log(err);
      });
  });
}
