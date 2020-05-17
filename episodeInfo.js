class EpisodeInfo {
  baseLink = "https://www.imdb.com";
  constructor(
    title,
    link,
    imageLink,
    numberAndSeason,
    year,
    rating,
    ratingCount
  ) {
    this.title = title;
    this.link = this.baseLink + link;
    this.imageLink = imageLink;
    this.rating = rating;
    this.year = year;
    this.ratingCount = ratingCount;
    this.setNumberSeason = numberAndSeason;
  }

  set setNumberSeason(numberAndSeasons) {
    //Example S2, Ep12
    var res = numberAndSeasons.split(",");
    var season = res[0].trim().substr(1);
    var episode = res[1].trim().substr(2);

    this.number = episode;
    this.season = season;
  }
}

EpisodeInfo.prototype.toString = function episodeToString() {
  var ret = `S${this.season}, Ep${this.number}, Date ${this.airdate} ${this.rating} : '${this.title}'`;
  return ret;
};

module.exports = EpisodeInfo;
