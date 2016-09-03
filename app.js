var fs = require('fs'),
	request = require('request'),
    path = require('path'),
    Twit = require('twit'),
    config = require(path.join(__dirname, 'config.js')),
	https = require('https'),
	geo = require('mapbox-geocoding'),
	geoViewport = require('geo-viewport');

// Create a new instance of Twit
var T = new Twit(config);

// URL for building the request
var mapboxUrl = 'https://api.mapbox.com/';

// Map style username
var mapbox_username = 'mapbox';

// To do: Create a function to rotate styles
var style = 'streets-v9'

// Default for now, set by geo-viewport later
var zoom = 12;

var lat, lon;

var geoData;

var status = 'Robomapper is not listening';

var msg;

// Muh token
var mapboxtoken = 'pk.eyJ1IjoiYWp6ZWlnZXJ0IiwiYSI6IldLdVhKN1UifQ.43CCALwNLBzVybtPFvcaJQ';

// Set mapbox geocode api token
geo.setAccessToken(mapboxtoken);

// Default size. Could vary later.
var width = 512,
	height = 512;

// Open a streaming connection to the twitter API

// Stream robomapper's user stream, include replies from all accounts
T.stream('user', {replies: 'all'})
	.on('connected', function(msg){
		status = 'Robomapper is now listening';
		console.log(status);
	})
	.on('message', function(msg){
		// msg = msg;

		// console.log(msg);

		// If the @reply screen name is to robomapper...
		if (msg.in_reply_to_screen_name === 'robomapper') {
			console.log('Robomapper received the following message: ', msg.text);
			// Save the username
			var username = '@' + msg.screen_name;

			// Save the text of the message and subtract the username
			var locationQuery = msg.text;
			locationQuery = locationQuery.substring(username.length + 1);

			locationQuery = locationQuery.replace(/\?/g, '');
			locationQuery = locationQuery.replace(/!/g, '');
			locationQuery = locationQuery.replace(/Where is/g, '');
			console.log('Cleaned query: ', locationQuery)

			if(locationQuery.toLowerCase().indexOf('satellite') > -1 ){
				style = 'satellite-streets-v9';
			}

			// To do: create a fun easter egg function to return other stuff with the right string
			// Ideas: Jimmy Hoffa, The Upside Down, Sesame Street, Shit Town, Null Ranch, Star maps? Baseball fields?
			if (locationQuery.toLowerCase().indexOf('null island') > -1 ) {
				lat = 0;
				lon = 0;
				makeMapboxMap(msg, null, locationQuery);
			} else if (locationQuery.toLowerCase().indexOf('hell') > -1 ) {
				locationQuery = 'New Jersey';
				findLocation(locationQuery, msg);
			} else if (locationQuery.toLowerCase().indexOf('mordor') > -1 ) {
				locationQuery = 'Tongariro National Park, New Zealand';
				findLocation(locationQuery, msg);
			} else if (locationQuery.toLowerCase().indexOf('loserville') > -1 ) {
				locationQuery = 'Trump Tower, New York City';
				findLocation(locationQuery, msg);
			} else if (locationQuery.toLowerCase().indexOf('heaven') > -1 ) {
				lat = 41.915278;
				lon = -86.593333;
				makeMapboxMap(msg, null, locationQuery);
			} else if (locationQuery.toLowerCase().indexOf('mount doom') > -1 ) {
				lat = -39.156833;
				lon = 175.632167;
				makeMapboxMap(msg, null, locationQuery);
			} else {
				findLocation(locationQuery, msg);
			}


		}
	});

	// Load the http module to create an http server.
	var http = require('http');

	// Configure our HTTP server to respond with Hello World to all requests.
	var server = http.createServer(function (request, response) {
	  response.writeHead(200, {"Content-Type": "text/plain"});
	  // Just put the current status up for a simple status system
	  response.end(status);
	});

	// Listen on port 8000, IP defaults to 127.0.0.1
	server.listen(8000);

	function findLocation(locationQuery, msg){
		// Query mapbox geocoding api to get lat/lon
		geo.geocode('mapbox.places', locationQuery, function (err, geoData) {
			if (err) console.log(err);
			console.log(geoData);
			if (geoData) {
				// If the mapbox geocoding api couldn't find anything...
				if (geoData.features.length === 0) {

					// Send a reply to the user with a sad face
					T.post('statuses/update', {
						status: 'Sorry, @' + msg.user.screen_name + ', I couldn\'t find a map of' + locationQuery + '. ☹️',
					},
					function(err, data, response) {
						if (err){
							console.log('Error!');
							console.log(err);
						}
						else {
							console.log('Robomapper couldn\'t find that location.');
						}
					});

				// If the api finds something...
				} else if (geoData.features.length >= 1) {
					// console.log(geoData);

					console.log('Robomapper found that location.')

					// Convert response bounding box to zoom and center
					if (geoData.features[0].bbox != undefined) {
						var box = geoData.features[0].bbox;
						var viewport = geoViewport.viewport(box, [512,512]);
						// Use the lat/lon of the first result
						lat = viewport.center[1];
						lon = viewport.center[0];
						zoom = viewport.zoom;
					} else {
						lat = geoData.features[0].center[1];
						lon = geoData.features[0].center[0];
					}

					makeMapboxMap(msg, geoData, locationQuery);
				}
			} else {

				// Send a reply to the user with a sad face
				T.post('statuses/update', {
					status: 'Sorry, @' + msg.user.screen_name + ', I couldn\'t find a map of' + locationQuery + '. ☹️',
				},
				function(err, data, response) {
					if (err){
						console.log('Error!');
						console.log(err);
					}
					else {
						console.log('Robomapper couldn\'t find that location.');
					}
				});
			}


		});
	}

	function makeMapboxMap(msg, geoData, locationQuery){
		// Now use the static image api to create the image
		var imageRequest = mapboxUrl +
			'styles/v1/' +
			mapbox_username + '/' +
			style +
			'/static/' +
			lon + ',' +
			lat + ',' +
			zoom + '/' +
			width + 'x' + height + '@2x' +
			'?access_token=' + mapboxtoken;
		// Send the request
		request({
			url: imageRequest,
			// Prevents Request from converting response to string
			encoding: null

		}, function(err, response, body){
			sendTweetWithImage(err, response, body, msg, geoData, locationQuery);
		});
	}

	function sendTweetWithImage(err, response, body, msg, geoData, locationQuery){
		if (err) throw err;

		// Get the string value of the body in base64
		var b64content = body.toString('base64');

		// If there's no error...
		if (!err) {

			console.log('Robomapper made a map.')

			// Upload the image using the twitter media api
			T.post('media/upload', { media_data: b64content }, function (err, data, response) {
				if (err){
					console.log('ERROR');
					console.log(err);
				}
				else {
					console.log('Robomapper uploaded the map image.');
					var place = geoData != null ? geoData.features[0].place_name : locationQuery;
					// console.log(place)
					var message;
					if (geoData.features[0].relevance >= 0.95 ){
						message = 'Hello, @' + msg.user.screen_name + ', I made this map of ' + place + ' for you.';
					} else if (geoData.features[0].relevance < 0.95){
						message = 'OK, @' + msg.user.screen_name + ', I hope you were looking for a map of ' + place + '.';
					}
					// Then create an actual tweet reply to the cool person
					T.post('statuses/update', {
						status: message,
						media_ids: new Array(data.media_id_string)
					},
					function(err, data, response) {
						if (err){
							console.log('Error!');
							console.log(err);
						}
						else {
							console.log('Robomapper posted a tweet with the image.');
						}
					})
				}
			})

		}

	}

// The end
