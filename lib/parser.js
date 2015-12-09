"use strict"

var async = require('async'),
    util = require('util'),
    aws_sdk = require('aws-sdk'),
    events = require('events');

/**
 * Constructor for the Log Parser class.
 *
 * @async
 * @method LogParser
 * @param {Object} config The configuration information for the instance.
 * @param {Object} config.aws The AWS specific config information that is passed directly into the aws-sdk module.
 */

var LogParser = function LogParser(config) {

    if (!(this instanceof LogParser)) {
        return new LogParser(config);
    }

    this.config = config;

    var _this = this;

    // create an instance of the cloudwatch logs object.
    this.cw_logs = new aws_sdk.CloudWatchLogs(this.config.aws);

}

util.inherits(LogParser, events.EventEmitter);


/**
 * Gets the log data for a specific request.
 *
 * @async
 * @method getLogData
 * @param {Object} opts Object that holds all the variables.
 * @param {String} opts.log_group_name The name of the CloudWatch log group.
 * @param {String} opts.log_stream_name The name of the CloudWatch log stream.
 * @param {String} opts.request_id The id of the request that is to be returned.
 * @param {Object} opts.cloudwatch_logs An instance of the CloudWatchLogs object from the aws-sdk.
 */

LogParser.prototype.getLogData = function (opts, callback) {
    var cw;
    var _this = this;

    var params = {
        logGroupName: opts.log_group_name,
        logStreamName: opts.log_stream_name
    };

    if(!opts.cloudwatch_logs){
        cw = this.cw_logs;
    }else{
        cw = opts.cloudwatch_logs;
    }

    cw.getLogEvents(params, function(err, data) {
        //console.log(data.events);
        _this.parseLogData(data, opts.request_id, function(err, log){
            _this.emit('log-data', log);
            callback(null, log);
        });
    });
};

/**
 * Calculates the cost of the function run.
 *
 * @sync
 * @method calculateLambdaCost
 * @param {Number} duration The length of time the function ran.  This number should be in milliseconds.
 * @param {Number} function_size The size of the function that was ran.
 */

LogParser.prototype.calculateFunctionCost = function (duration, function_size) {
    var cost_per_gb_sec = .00001667;

    return ((function_size / 1024) * duration/1000) * cost_per_gb_sec;
};

/**
 * Takes the log data and parses it.
 *
 * @async
 * @method parseLogData
 * @param {Object} data The data to parse
 * @param {String} request_id The id of the request that is to be returned.  This is optional.
 */

LogParser.prototype.parseLogData = function (data, request_id, callback) {
    var cw;
    var _this = this;
    var log = {usage : {}, logs : [], exec_status : {}}, i;

    for (i = 0; i < data.events.length; i++) {
        var event = data.events[i].message.trim();
        var timestamp = data.events[i].timestamp

        var line_parts = event.split('\t');

        if (line_parts.length === 3) {
            if(line_parts[1] === request_id) {
                log.logs.push({request_id: line_parts[1], type: 'log', time: timestamp, data: line_parts[2]});
            }
        } else if (line_parts.length === 1) {
            var item_parts = line_parts[0].split(":");

            // handle the start of the request...
            if (item_parts[0] === 'START RequestId') {
                log.usage.start_time = timestamp;
                if(!request_id){
                    request_id = item_parts[1].trimLeft().split(' ')[0];
                }
            } else if (item_parts[0] === 'END RequestId') {
                log.usage.end_time = timestamp;
            }
        } else {
            var usage = {time: timestamp};

            for (var p = 0; p < line_parts.length; p++) {
                var item = line_parts[p];

                var item_parts = item.split(':');

                switch (item_parts[0]) {
                    case 'REPORT RequestId':
                        usage.request_id = item_parts[1].trim();
                        break;
                    case 'Billed Duration':
                        usage.billed_duration = item_parts[1].trim();
                        break;
                    case 'Memory Size':
                        usage.memory_size = item_parts[1].trim();
                        break;
                    case 'Max Memory Used':
                        usage.max_memory_size = item_parts[1].trim();
                        break;
                }
            }



            if(usage.request_id === request_id){
                log.usage.request_id = usage.request_id;
                log.usage.billed_duration = parseInt(usage.billed_duration.replace('ms', '').trim());
                log.usage.memory_size = parseInt(usage.memory_size.replace('MB', '').trim());
                log.usage.max_memory_size = parseInt(usage.max_memory_size.replace('MB', '').trim());
                log.usage.cost = _this.calculateFunctionCost(log.usage.billed_duration, log.usage.memory_size);
            }
        }
    }
    callback(null, log);

};



module.exports = LogParser;