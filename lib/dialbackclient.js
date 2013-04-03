// Dialback HTTP calls
//
// Copyright 2012 StatusNet Inc.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

var Step = require("step"),
    _ = require("underscore"),
    urlparse = require("url").parse,
    http = require("http"),
    https = require("https"),
    DialbackRequest = require("./dialbackrequest"),
    randomString = require("./randomstring"),
    version = require("./version").version;

// Constructor for the dialback client

var DialbackClient = function(options) {

    // Private methods

    var client = this,
        remember = function(endpoint, id, token, ts, callback) {
            var props = {
                endpoint: endpoint,
                id: id,
                token: token,
                timestamp: ts
            };

            Step(
                function() {
                    DialbackRequest.create(props, this);
                },
                function(err, req) {
                    callback(err);
                }
            );
        },
        isRemembered = function(endpoint, id, token, ts, callback) {
            var props = {
                endpoint: endpoint,
                id: id,
                token: token,
                timestamp: ts
            },
                key = DialbackRequest.toKey(props);

            Step(
                function() {
                    DialbackRequest.get(key, this);
                },
                function(err, req) {
                    if (err && (err.name == "NoSuchThingError")) {
                        callback(null, false);
                    } else if (err) {
                        callback(err, null);
                    } else {
                        callback(null, true);
                    }
                }
            );
        },
        dialback = function(req, res, next) {
            var host = req.body.host,
                webfinger = req.body.webfinger,
                token = req.body.token,
                date = req.body.date,
                url = req.body.url,
                id = host || webfinger,
                ts,
                parts;

            if (host) {
                if (host != client.hostname) {
                    res.status(400).send("Incorrect host");
                    return;
                }
            } else if (webfinger) {
                parts = webfinger.split("@");
                if (parts.length !== 2 || parts[1] != client.hostname) {
                    res.status(400).send("Incorrect host");
                    return;
                }
            } else {
                res.status(400).send("No identity");
                return;
            }

            if (!token) {
                res.status(400).send("No token");
                return;
            }

            if (!date) {
                res.status(400).send("No date");
                return;
            }

            ts = Date.parse(date);

            if (Math.abs(Date.now() - ts) > 300000) { // 5-minute window
                res.status(400).send("Invalid date");
                return;
            }

            Step(
                function() {
                    isRemembered(url, id, token, ts, this);
                },
                function(err, remembered) {
                    if (err) {
                        next(err);
                        return;
                    }

                    if (remembered) {
                        res.status(200).send("OK");
                    } else {
                        res.status(400).send("Not my token");
                    }
                }
            );
        };

    // Privileged methods

    this.post = function(endpoint, id, requestBody, contentType, callback) {

        var reqOpts = urlparse(endpoint),
            mod,
            auth,
            token,
            ts,
            client = this;

        if (reqOpts.protocol == "https:") {
            mod = https;
        } else {
            mod = http;
        }

        Step(
            function() {
                randomString(8, this);
            },
            function(err, str) {
                if (err) throw err;
                token = str;
                // Timestamp with 1-second granularity
                ts = Math.round(Date.now()/1000)*1000;
                remember(endpoint, id, token, ts, this);
            },
            function(err) {

                if (err) {
                    callback(err, null, null);
                    return;
                }

                reqOpts.method = "POST";
                reqOpts.headers = {
                    "Content-Type": contentType,
                    "Content-Length": requestBody.length,
                    "User-Agent": client.userAgent
                };

                if (id.indexOf("@") === -1) {
                    auth = "Dialback host=\"" + id + "\", token=\""+token+"\"";
                } else {
                    auth = "Dialback webfinger=\"" + id + "\", token=\""+token+"\"";
                }

                reqOpts.headers["Authorization"] = auth;
                // Use the timestamp of the remembered request
                reqOpts.headers["Date"] = (new Date(ts)).toUTCString();

                var req = mod.request(reqOpts, this);

                req.on("error", function(err) {
                    callback(err, null, null);
                });

                req.write(requestBody);

                req.end();
            },
            function(res) {
                var body = "";
                res.setEncoding("utf8");
                res.on("data", function(chunk) {
                    body = body + chunk;
                });
                res.on("error", function(err) {
                    callback(err, null, null);
                });
                res.on("end", function() {
                    callback(null, res, body);
                });
            }            
        );
    };

    // Initialization

    this.app  = options.app;
    this.url  = options.url || "/dialback";
    this.userAgent  = options.userAgent || "dialback-client/"+version;

    this.hostname = options.hostname;

    // Set the databank

    DialbackRequest.db = options.bank;

    // Setup the app

    this.app.dialbackClient = this;
    this.app.post(this.url, dialback);

    // Setup the cleanup

    // Clear out old requests every 1 minute

    this.cleanup = setInterval(function() {
        // XXX: log errors
        DialbackRequest.cleanup(function(err) {});
    }, options.cleanup || 60000);
};

DialbackClient.schema = DialbackRequest.schema;
DialbackClient.DialbackRequest = DialbackRequest;

module.exports = DialbackClient;
