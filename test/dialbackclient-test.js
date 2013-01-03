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
    fs = require("fs"),
    path = require("path"),
    databank = require("databank"),
    express = require("express"),
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject;

var tc = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json")));

var suite = vows.describe("DialbackClient module interface");

suite.addBatch({
    "When we connect a database": {
        topic: function() {
            var cb = this.callback,
                db = Databank.get(tc.driver, tc.params);
            db.connect({}, function(err) {
                if (err) {
                    cb(err, null);
                } else {
                    DatabankObject.bank = db;
                    cb(null, db);
                }
            });
        },
        "it works": function(err, db) {
            assert.ifError(err);
        },
        teardown: function(db) {
            if (db && db.close) {
                db.close(function(err) {});
            }
        },
        "and we create a dummy app": {
            topic: function(db) {
                return express.createServer();
            },
            "it works": function(app) {
                assert.isObject(app);
            },
            "and we require the DialbackClient module": {
                topic: function() {
                    return require("../lib/dialbackclient");
                },
                "it works": function(DialbackClient) {
                    assert.isFunction(DialbackClient);
                },
                "and we create a client": {
                    topic: function(DialbackClient, app, db) {
                        var client = new DialbackClient({
                            hostname: "dialbackclient.localhost",
                            app: app,
                            bank: db
                        });
                        return client;
                    },
                    "it works": function(client) {
                        assert.isObject(client);
                    }
                }
            }
        }
    }
});

suite["export"](module);
