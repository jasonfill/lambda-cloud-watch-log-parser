# Lambda CloudWatch Log Parser
Snags the event data from AWS CloudWatch and returns it as an easy to use JSON object.

## Usage

### getLogData(opts, function(err, result))
Will call out to Cloudwatch and get the log data based on the parameters specified.

**Opts Parameter:**

All keys are required.

```
{
	log_group_name (string) - The name of the log group in CW ex. /aws/lambda/webhooks-io
	log_stream_name (string) - The name of the string in CW ex. 2015/04/06/97811a2c85f54bd285916e1b1d75d6ff
	invoke_id - The actual ID of the invoke that should be returned.
}
```

**Callback Function:**

**err**

A string containing the error information.

**result**

```
{
usage: {
	time: (number) - The UNIX timestamp that was associated to the usage log entry.
	billed_duration (number) - The number of milliseconds the function ran for.
	memory_size (number) - The size of Lambda instance that was used for the execution.
	max_memory_size (number) - The total number of mb that was used during execution.
},
exec_status: {},
logs: [{
		invoke_id (string) - The actual invoke_id of the execution.
		type (string) - Defaults to 'log'.  Reserved for future use.
		time (number) - The UNIX timestamp that was associated to the specific log entry.
		data (string) - Data that was actually written to the log.
		},
		{...}]
}
```

**Usage**

```
var aws = {
    accessKeyId : "",
    secretAccessKey: "",
    region: "us-east-1",
    maxRetries: 2,
    sslEnabled: true,
    convertResponseTypes: true
}

var config = {aws : aws};
var Parser = require('@jasonfill/lambda-cloud-watch-log-parser')(config);

var opts = {
    log_group_name: '/aws/lambda/webhooks-io',
    log_stream_name: '2015/04/06/97811a2c85f54bd285916e1b1d75d6ff',
    invoke_id : '5434c6a5-dc40-11e4-9497-9f7835f8ec01'
};

Parser.getLogData(opts, function(err, result){
    console.log(arguments);
});
```