// Dialback client test
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

var vows = require("vows"),
    assert = require("assert"),
    express = require("express"),
    querystring = require("querystring"),
    databank = require("databank"),
    fs = require("fs"),
    path = require("path"),
    dialbackAuth = require("./lib/dialbackauth"),
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject;

var suite = vows.describe("DialbackClient post interface");

var tc = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));

suite.addBatch({
    "When we set up a dummy echo app": {
        topic: function() {
            var callback = this.callback,
                app = express.createServer(),
                connected = false;

            // use the dialback auth middleware

            app.post("/echo", dialbackAuth, function(req, res, next) {
                var parseFields = function(str) {
                    var fstr = str.substr(9); // everything after "Dialback "
                    var pairs = fstr.split(/,\s+/); // XXX: won't handle blanks inside values well
                    var fields = {};
                    pairs.forEach(function(pair) {
                        var kv = pair.split("="),
                            key = kv[0],
                            value = kv[1].replace(/^"|"$/g, "");
                        fields[key] = value;
                    });
                    return fields;
                };
                var auth = req.headers.authorization;
                var fields = parseFields(auth);
                res.json(fields);
            });

            app.on("error", function(err) {
                if (!connected) {
                    callback(err, null);
                }
            });

            app.listen(80, "echo.localhost", function() {
                connected = true;
                callback(null, app);
            });
        },
        "it works": function(err, app) {
            assert.ifError(err);
        },
        teardown: function(app) {
            if (app && app.close) {
                app.close();
            }
        },
        "and we set up a new client": {
            topic: function() {
                var callback = this.callback,
                    DialbackClient = require("../lib/dialbackclient"),
                    db = Databank.get(tc.driver, tc.params);

                db.connect({}, function(err) {
                    var app, client, connected = false;
                    if (err) {
                        callback(err, null);
                        return;
                    }

                    app = express.createServer();

                    app.use(express.bodyParser());

                    app.get("/.well-known/host-meta.json", function(req, res, next) {
                        res.json({
                            links: [
                                {
                                    rel: "dialback",
                                    href: "http://dialbackclient.localhost/dialback"
                                }
                            ]
                        });
                    });

                    client = new DialbackClient({
                        hostname: "dialbackclient.localhost",
                        app: app,
                        bank: db
                    });

                    app.on("error", function(err) {
                        if (!connected) {
                            callback(err, null);
                        }
                    });

                    app.listen(80, "dialbackclient.localhost", function() {
                        connected = true;
                        callback(null, app);
                    });
                });
            },
            "it works": function(err, app) {
                assert.ifError(err);
            },
            teardown: function(app) {
                if (app && app.close) {
                    app.close();
                }
            },
            "and we post to the echo endpoint": {
                topic: function(app) {
                    var body = querystring.stringify({type: "client_associate"}),
                        type = "application/x-www-form-urlencoded",
                        url = "http://echo.localhost/echo",
                        id = "dialbackclient.localhost",
                        callback = this.callback;

                    app.dialbackClient.post(url, id, body, type, callback);
                },
                "it works": function(err, res, body) {
                    assert.ifError(err);
                },
                "echo data includes token and id": function(err, res, body) {
                    var parts;
                    assert.ifError(err);
                    assert.equal(res.statusCode, 200);
                    assert.isTrue(res.headers["content-type"].substr(0, "application/json".length) == "application/json");
                    try {
                        parts = JSON.parse(body);
                    } catch (err) {
                        assert.ifError(err);
                    }
                    assert.isObject(parts);
                    assert.include(parts, "host");
                    assert.equal(parts.host, "dialbackclient.localhost");
                    assert.include(parts, "token");
                    assert.isString(parts.token);
                }
            }
        }
    }
});

suite["export"](module);
