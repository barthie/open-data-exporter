var config = require('./config');
var expressionProcessor = require('./expressionProcessor');
var Logger = require('./logger');
var packageData = require('./package.json');

var Q = require('q');
var Mustache = require('mustache');
var moment = require('moment');
var colors = require('colors/safe');

var log = new Logger('main');



log.writeBox('Open Data Explorer v' + packageData.version, null, 'cyan');

var purecloud = require('purecloud_api_sdk_javascript');
var pureCloudSession = purecloud.PureCloudSession({
  strategy: 'client-credentials',
  clientId: config.settings.clientId,
  clientSecret: config.settings.clientSecret,
  timeout: 10000
});
//pureCloudSession.debugLog = console.log;
pureCloudSession.login().then(function() {
	var api = new purecloud.AuthorizationApi(pureCloudSession);

	api.getPermissions()
		.then(function(result){
			log.info('Congratulations, ' + result.total + ' permissions are available');
			
			// Prepare queries
			var jobData = config.getJobData({}, 'basic_job', 'basic_configuration');
			expressionProcessor.evaluate(config.settings.queries, jobData.vars);

			return doConversationsDetailsQuery(JSON.stringify(config.settings.queries['currentInterval'].query));
		})
		.then(function(data) {
			var jobData = config.getJobData(data, 'basic_job', 'basic_configuration');
			var output = Mustache.render(config.settings.templates['basic_template'].template, jobData);
			log.verbose(output, 'currentInterval transformation:');
			
			return doConversationsDetailsQuery(JSON.stringify(config.settings.queries['previousInterval'].query));
		})
		.then(function(data) {
			var jobData = config.getJobData(data, 'basic_job', 'basic_configuration');
			var output = Mustache.render(config.settings.templates['basic_template'].template, jobData);
			log.verbose(output, 'previousInterval transformation:');

			return {};
		})
		/*
		.then(function(data) {
			log.info('Got data!');
			//log.debug(data, 'data')
			var jobData = config.getJobData(data, 'basic_job', 'basic_configuration');

			expressionProcessor.evaluate('$date->{{ $date }}', jobData.vars);
			expressionProcessor.evaluate('interval->{{ $interval }}', jobData.vars);
			expressionProcessor.evaluate('currentHour->{{ $currentHour }}', jobData.vars);
			expressionProcessor.evaluate('previousHour->{{ $previousHour }}', jobData.vars);
			expressionProcessor.evaluate('currentIntervalStart->{{ $currentIntervalStart }}', jobData.vars);
			expressionProcessor.evaluate('previousIntervalStart->{{ $previousIntervalStart }}', jobData.vars);
			expressionProcessor.evaluate('currentInterval->{{ $currentInterval }}', jobData.vars);
			expressionProcessor.evaluate('previousInterval->{{ $previousInterval }}', jobData.vars);
			expressionProcessor.evaluate('complex->{{ $currentIntervalStart + $interval + PT1H + PT2M - PT3S }}', jobData.vars);
			
			expressionProcessor.evaluate(config.settings.queries, jobData.vars);

			log.debug(config.settings.queries.expression_query, 'expression query');

			log.info('done');
		})
		*/
		.catch(function(error) {
			log.error(error.stack)
		});
});

function doConversationsDetailsQuery(query) {
	var deferred = Q.defer();
	var api = new purecloud.AnalyticsApi(pureCloudSession);
	var body = {};

	api.postConversationsDetailsQuery(query)
		.then(function(result){
			deferred.resolve(result);
		})
		.catch(function(error){
			deferred.reject(error);
		});

	return deferred.promise;
}