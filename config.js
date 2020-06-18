module.exports = {
  // WINSTON settings (log management)
  applicationName: "imdb-scraper",
  datePattern: "YYYY-MM-DD",
  zipOldLogs: true,
  maxSize: "20m",
  maxFiles: "14d",
  minLogLevel: "debug",
  // EXPRESS
  port: 9000,
};
