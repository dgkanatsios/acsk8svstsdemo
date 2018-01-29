var os = require('os');
var request = require('request');
var morgan = require('morgan');
var express = require('express');
var redis;

var app = express();
app.use(express.static(__dirname + '/public'));
app.use(morgan("dev"));

// application -------------------------------------------------------------
app.get('/', function (req, res) {
    console.log('/ request');
    res.sendFile(__dirname + '/public/index.html');
});

// api ------------------------------------------------------------
app.get('/api', function (req, res) {
    // Increment requestCount each time API is called
    if (!redis) {
        redis = connectToCache();
    }
    redis.incr('requestCount', function (err, reply) {
        if (err) console.log(err);
        var requestCount = reply;
    });

    console.log('/api request');

    // Invoke service-b
    request('http://service-b-k8sservice', function (error, response, body) {
        if (error) console.log(error);
        res.send('Hello from service A running on ' + os.hostname() + ' and ' + body);
    });
});

app.get('/metrics', function (req, res) {
    if (!redis) {
        redis = connectToCache();
    }
    console.log('/metrics request');
    redis.get('requestCount', function (err, reply) {
        if (err) {
            console.log(err);
            res.send({
                requestCount: 0
            });
        } else {
            res.send({
                requestCount: reply
            });
        }
    });
});

var port = 80;
var server = app.listen(port, function () {
    console.log('Listening on port ' + port);
});

process.on("SIGINT", () => {
    process.exit(130 /* 128 + SIGINT */ );
});

process.on("SIGTERM", () => {
    console.log("Terminating...");
    server.close();
});

function connectToCache() {
    var redis = require('redis').createClient("redis://mycache-k8sservice");
    return redis;
}