// dialbackrequest.js
//
// Keep track of the requests we've made
//
// Copyright 2012, StatusNet Inc.
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

var databank = require("databank"),
    _ = require("underscore"),
    DatabankObject = databank.DatabankObject,
    Step = require("step"),
    NoSuchThingError = databank.NoSuchThingError;

var DialbackRequest = DatabankObject.subClass("dialbackrequest");

DialbackRequest.schema = {
    dialbackrequest: {
        pkey: "endpoint_id_token_timestamp",
        fields: ["endpoint",
                 "id",
                 "token",
                 "timestamp"]
    },
    recentdialbackrequests: {
        pkey: "dummy"
    }
};

module.exports = DialbackRequest;

DialbackRequest.toKey = function(props) {
    return props.endpoint + "/" + props.id + "/" + props.token + "/" + props.timestamp;
};

DialbackRequest.bank = function() {
    return DialbackRequest.db || DatabankObject.bank;
};

DialbackRequest.pkey = function() {
    return "endpoint_id_token_timestamp";
};

DialbackRequest.beforeCreate = function(props, callback) {

    if (!_(props).has("endpoint") ||
        !_(props).has("id") ||
        !_(props).has("token") ||
        !_(props).has("timestamp")) {
        callback(new Error("Wrong properties"), null);
        return;
    }

    props.endpoint_id_token_timestamp = DialbackRequest.toKey(props);

    callback(null, props);
};

// We keep an array of recent requests for cleanup

DialbackRequest.prototype.afterCreate = function(callback) {

    var req = this,
        bank = DialbackRequest.bank();

    Step(
        function() {
            bank.append("recentdialbackrequests", 0, req.endpoint_id_token_timestamp, this);
        },
        function(err, reqs) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        }
    );
};

DialbackRequest.cleanup = function(callback) {

    var req = this,
        bank = DialbackRequest.bank(),
        timestampOf = function(key) {
            return parseInt(key.split("/")[3], 10);
        };

    Step(
        function() {
            bank.read("recentdialbackrequests", 0, this);
        },
        function(err, keys) {
            var i, group, now = Date.now(), toDel = [];
            if (err) throw err;
            group = this.group();
            toDel = _.filter(keys, function(key) {
                var ts = timestampOf(key);
                return (now - ts > 300000);
            });
            _.each(toDel, function(key) {
                bank.remove("recentdialbackrequests", 0, key, group());
                bank.del("dialbackrequest", key, group());
            });
        },
        function(err) {
            if (err) {
                callback(err);
            } else {
                callback(null);
            }
        }
    );
};
