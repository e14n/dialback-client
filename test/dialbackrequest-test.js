// dialbackrequest-test.js
//
// Test the dialbackrequest module
//
// Copyright 2012-2013, StatusNet Inc.
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

var assert = require("assert"),
    vows = require("vows"),
    fs = require("fs"),
    path = require("path"),
    databank = require("databank"),
    Step = require("step"),
    Databank = databank.Databank,
    DatabankObject = databank.DatabankObject;

var suite = vows.describe("dialbackrequest module interface");

var testSchema = {
    pkey: "endpoint_id_token_timestamp",
    fields: ["endpoint",
             "id",
             "token",
             "timestamp"]
};

var testData = {
    "create": {
        endpoint: "social.example/register",
        id: "acct:user@comment.example",
        token: "AAAAAA",
        timestamp: Date.now()
    }
};

suite.addBatch({

    "When we require the dialbackrequest module": {

        topic: function() { 
            return require("../lib/dialbackrequest"); 
        },
        "it is a function": function(Cls) {
            assert.isFunction(Cls);
        },
        "it has an init method": function(Cls) {
            assert.isFunction(Cls.init);
        },
        "it has a bank method": function(Cls) {
            assert.isFunction(Cls.bank);
        },
        "it has a get method": function(Cls) {
            assert.isFunction(Cls.get);
        },
        "it has a search method": function(Cls) {
            assert.isFunction(Cls.search);
        },
        "it has a pkey method": function(Cls) {
            assert.isFunction(Cls.pkey);
        },
        "it has a create method": function(Cls) {
            assert.isFunction(Cls.create);
        },
        "it has a readAll method": function(Cls) {
            assert.isFunction(Cls.readAll);
        },
        "its type is correct": function(Cls) {
            assert.isString(Cls.type);
            assert.equal(Cls.type, "dialbackrequest");
        },
        "and we get its schema": {
            topic: function(Cls) {
                return Cls.schema || null;
            },
            "it exists": function(schema) {
                assert.isObject(schema);
            },
            "it has the right tables": function(schema) {
                assert.includes(schema, "dialbackrequest");
                assert.includes(schema, "recentdialbackrequests");
            },
            "it has the right primary key": function(schema) {
                assert.includes(schema.dialbackrequest, "pkey");
                assert.equal(schema.dialbackrequest.pkey, testSchema.pkey);
            },
            "it has the right fields": function(schema) {
                var fields = testSchema.fields,
                    i, field;

                if (fields) {
                    assert.includes(schema.dialbackrequest, "fields");
                    for (i = 0; i < fields.length; i++) {
                        assert.includes(schema.dialbackrequest.fields, fields[i]);
                    }
                    for (i = 0; i < schema.dialbackrequest.fields; i++) {
                        assert.includes(fields, schema.fields[i]);
                    }
                }
            }
        },
        "and we check the pkey": {
            topic: function(DialbackRequest) {
                return DialbackRequest.pkey();
            },
            "it is correct": function(pkey) {
                assert.isString(pkey);
                assert.equal(pkey, testSchema.pkey);
            }
        },
        "and we connect a dummy databank": {
            topic: function(DialbackRequest) {
                var tc = JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"))),
                    db = Databank.get(tc.driver, tc.params),
                    cb = this.callback;

                db.connect({}, function(err) {
                    if (err) {
                        cb(err, null);
                    } else {
                        DialbackRequest.db = db;
                        cb(null, db);
                    }
                });
            },
            "it works": function(err, db) {
                assert.ifError(err);
                assert.isObject(db);
            },
            "and we create a test instance": {
                topic: function(db, Cls) {
                    Cls.create(testData.create, this.callback);
                },
                "it works correctly": function(err, created) {
                    assert.ifError(err);
                    assert.isObject(created);
                },
                "passed-in fields are there": function(err, created) {
                    var prop, aprop;
                    for (prop in testData.create) {
                        assert.deepEqual(created[prop], testData.create[prop]); 
                    }
                },
                "and we modify it": {
                    topic: function(created) {
                        created.update(testData.update, this.callback);
                    },
                    "modified fields are modified": function(err, updated) {
                        var prop;
                        for (prop in testData.update) {
                            assert.deepEqual(updated[prop], testData.update[prop]); 
                        }
                    },
                    "and we delete it": {
                        topic: function(updated) {
                            updated.del(this.callback);
                        },
                        "it works": function(err, updated) {
                            assert.ifError(err);
                        }
                    }
                }
            }
        }
    }
});

suite.addBatch({
    "When we get the class": {
        topic: function() {
            return require("../lib/dialbackrequest");
        },
        "it works": function(DialbackRequest) {
            assert.isFunction(DialbackRequest);
        },
        "it has a cleanup() method": function(DialbackRequest) {
            assert.isFunction(DialbackRequest.cleanup);
        },
        "and we create a lot of requests": {
            topic: function(DialbackRequest) {
                var cb = this.callback;

                Step(
                    function() {
                        var i, group = this.group(), ts = Date.now() - (24 * 60 * 60 * 1000);

                        for (i = 0; i < 100; i++) {
                            DialbackRequest.create({
                                endpoint: "social.example/register",
                                id: "acct:user@comment.example",
                                token: "OLDTOKEN"+i,
                                timestamp: ts
                            }, group());
                        }
                    },
                    function(err, reqs) {
                        if (err) throw err;

                        var i, group = this.group(), ts = Date.now();

                        for (i = 0; i < 100; i++) {
                            DialbackRequest.create({
                                endpoint: "social.example/register",
                                id: "acct:user@comment.example",
                                token: "RECENT"+i,
                                timestamp: ts
                            }, group());
                        }
                    },
                    function(err, reqs) {
                        if (err) {
                            cb(err);
                        } else {
                            cb(null);
                        }
                    }
                );
            },
            "it works": function(err) {
                assert.ifError(err);
            },
            "and we try to cleanup": {
                topic: function(DialbackRequest) {
                    DialbackRequest.cleanup(this.callback);
                },
                "it works": function(err) {
                    assert.ifError(err);
                }
            }
        }
    }
});

suite["export"](module);
