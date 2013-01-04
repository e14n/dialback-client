dialback-client
===============

This is a client library for implementing the draft Dialback
authentication mechanism in NodeJS apps.

https://datatracker.ietf.org/doc/draft-prodromou-dialback/

License
-------

Copyright 2012-2013, StatusNet Inc.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.

Setup
-----

The library depends on the
[databank](https://github.com/evanp/databank) NoSQL abstraction layer
and [connect](http://www.senchalabs.org/connect/) or
[express](http://expressjs.org/).

To set it up, do something like this:

    var express = require("express"),
        Databank = require("databank").Databank,
        DialbackClient = require("dialback-client");
        
    var db = Databank.get("mongo", {host: "mymongo.example", dbname: "dialback"}),
        app = express.createServer(),
        client;

    // Used for dialback endpoint
        
    app.use(express.bodyParser());    

    client = new DialbackClient({
        hostname: "myhost.example",
        bank: db,
        app: app
    });

    db.connect({}, function(err) {
        app.listen(80, "myhost.example");
    });
       
The constructor takes the following named arguments:

* `app`: the connect or express app. Required. The client adds its endpoint to the app.
* `hostname`: hostname to use. Required.
* `bank`: databank to store dialback request info in.
* `url`: relative URL for the endpoint. Defaults to "/dialback" but can be anything.
* `userAgent`: the User-Agent string to send when making requests.
  Defaults to something identifying this client.
* `cleanup`: frequency of cleanup. By default, once per minute.

Usage
-----

To make dialback requests, use the `post` method of the client.

* `post(endpoint, id, body, contentType, callback)` Posts the `body`
  with MIME type `contentType` to `endpoint` as `id`. `callback` gets
  three results: an error, the HTTP client result from the request,
  and the result body.

The client is automatically hung on the `app` parameter, so you can
usually do something like:

    app.dialbackClient.post(
        "http://echo.example/echo",
        "me@mydomain.example",
        "{foo: bar}",
        "application/json", function(err, response, body) {
        
        res.json(body);
        
    });

