var fs = require('fs'),
	request = require('request'),
    path = require('path'),
    Twit = require('twit'),
    config = require(path.join(__dirname, 'config.js')),
	https = require('https'),
	geo = require('mapbox-geocoding');

// Create a new instance of Twit
var T = new Twit(config);

// URL for building the request
var mapboxUrl = 'https://api.mapbox.com/';

// Map style username
var mapbox_username = 'mapbox';

// To do: Create a function to rotate styles
var style = 'streets-v9'

// Default for now. Could vary in the future?
var zoom = 12;

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
		console.log('Robomapper is now listening');
	})
	.on('message', function(msg){

		// If the @reply screen name is to robomapper...
		if (msg.in_reply_to_screen_name === 'robomapper') {
			console.log('Robomapper received the following message: ', msg.text);
			// Save the username
			var username = '@' + msg.screen_name;

			// Save the text of the message and subtract the username
			var locationQuery = msg.text;
			locationQuery = locationQuery.substring(username.length + 1);

			// To do: create a fun easter egg function to return other stuff with the right string

			// Query mapbox geocoding api to get lat/lon
			geo.geocode('mapbox.places', locationQuery, function (err, geoData) {
				if (err) throw err;

				// If the mapbox geocoding api couldn't find anything...
				if (geoData.features.length === 0) {

					// Send a reply to the user with a sad face
					T.post('statuses/update', {
						status: 'Sorry, @' + msg.user.screen_name + ', I couldn\'t find a map of' + locationQuery + '. :-(',
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

					console.log('Robomapper found that location.')

					// Use the lat/lon of the first result
					var lat = geoData.features[0].center[1];
					var lon = geoData.features[0].center[0];

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

					}, function (err, response, body) {
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

									// Then create an actual tweet reply to the cool person
									T.post('statuses/update', {
										status: 'Hello, @' + msg.user.screen_name + ', I made this map of ' + geoData.features[0].place_name + ' for you.',
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

					})
				}

			});

		}
	});

// The end
