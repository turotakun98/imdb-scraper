const express = require("express");
const cors = require("cors");
const config = require("../config/config");
const routes = require("../api");

async function _default({ expressApp: app }) {
    app.use(express.json());

    // Enable Cross Origin Resource Sharing to all origins by default
    app.use(cors());

    // Load API routes
    app.use(config.api.prefix, routes());

    // Health Check endpoints
    app.get("/status", (req, res) => {
        res.status(200).end();
    });

    app.head("/status", (req, res) => {
        res.status(200).end();
    });

    /// catch 404 and forward to error handler
    app.use((req, res, next) => {
        const err = new Error("Not Found");
        err["status"] = 404;
        next(err);
    });

    /// error handlers
    app.use((err, req, res, next) => {
        /**
         * Handle 401 thrown by express-jwt library
         */
        if (err.name === "UnauthorizedError") {
            return res.status(err.status).send({ message: err.message }).end();
        }
        return next(err);
    });

    app.use((err, req, res, next) => {
        res.status(err.status || 500);
        res.json({
            errors: {
                message: err.message,
            },
        });
    });
}

module.exports = _default;
