'use strict';
var request = require('sync-request'); 
var fs = require('fs');
var express = require('express'); 
var app = express(); 

// https://www.eventbrite.com/ ONCKNIEH2IFT3NU62TQM

// https://meetup.com/ 1013585715597776352652657291a9

//https://api.meetup.com/find/upcoming_events?key=1013585715597776352652657291a9&sign=true&photo-host=public&end_date_range=2018-12-31T00:00:00&text=big%data&radius=100&lon=-122.42&lat=37.78&page=1000

var start_date = '2018-06-01T00:00:00';
var end_date = '2018-06-30T00:00:00';

var meetup = {
	url: 'https://api.meetup.com/find/upcoming_events',
	method: 'GET',
	name: 'meetup',
	qs: {
		key: '1013585715597776352652657291a9',
		text: 'data science',
		start_date_range: start_date,
		end_date_range: end_date,
		radius: '1',
		lon: '-122.42',
		lat: '37.78',
		page: '1000'
	}
};

//https://www.eventbriteapi.com/v3/events/search/?location.longitude=-122.42&q=big+data&token=ONCKNIEH2IFT3NU62TQM&start_date.range_end=2018-12-31T00%3A00%3A00&location.latitude=37.78&location.within=100km

var eventbrite = {
	url: 'https://www.eventbriteapi.com/v3/events/search',
	method: 'GET',
	name: 'eventbrite',
	qs: {
		token: 'ONCKNIEH2IFT3NU62TQM',
		q: 'data science',
		'start_date.range_start': start_date,
		'start_date.range_end': end_date,
		'location.within': '10km',
		'location.longitude': '-122.42',
		'location.latitude': '37.78',
		page: 1
	}
};

function getJSON(data){
	var req = request(data.method, data.url, data);
	var result = JSON.parse(req.getBody('utf8'));
	console.log('Загружено: '+ result.events.length + ' событий, ' + data.name);
	return result.events;
}

var json_meetup = getJSON(meetup);
var json_eventbrite = getJSON(eventbrite);

function delete_duplicate(meetup_json, eventbrite_json) {
	var count = 0;
	for (var i = 0; i < meetup_json.length; i++) {
		for (var j = 0; j < eventbrite_json.length; j++) {
			if ( meetup_json[i].name == eventbrite_json[j].name.text ) {
				eventbrite_json.splice(j, 1);
				count++;
			}
		}
	}
	console.log('Удалено дубликатов: ' + count);
};
delete_duplicate(json_meetup, json_eventbrite);

function merge_array(json_meetup, json_eventbrite){
	var merged_array = [];

	for (var i = 0; i < json_meetup.length; i++) {
		//console.log(json_meetup[i].name);
		if (json_meetup[i].local_date && json_meetup[i].local_time) { 
			var item1 = {
				'name': json_meetup[i].name,
				'date_time': json_meetup[i].local_date + 'T' + json_meetup[i].local_time + ':00',
				'description': json_meetup[i].description,
				'link': json_meetup[i].link
			}
			merged_array = merged_array.concat(item1);
		}		
	}

	for (var j = 0; j < json_eventbrite.length; j++) {
		//console.log(json_eventbrite[j].name);
		if (json_eventbrite[j].start.local) { 
			var item2 = {
				'name': json_eventbrite[j].name.text,
				'date_time': json_eventbrite[j].start.local,
				'description': json_eventbrite[j].description.text,
				'link': json_eventbrite[j].url
			}
			merged_array = merged_array.concat(item2);
		}
	}
	return merged_array;
}

var merged_array = merge_array(json_meetup, json_eventbrite);

merged_array.sort(function(event1, event2) {
	return Date.parse(event1.date_time) - Date.parse(event2.date_time);
});

function html() {
	
	for (var i = 0; i < merged_array.length; i++) {
		merged_array[i].date = new Date(Date.parse(merged_array[i].date_time)).toLocaleString("en-US", {year: 'numeric', month: 'long', day: 'numeric'});
	}
	
	var currentDate = merged_array[0].date;

	fs.writeFileSync('out.html', 
		'<!DOCTYPE html>' + 
		'<html lang="en">' + 
		'<head><meta charset="UTF-8"><title>Events in San Francisco</title>' +
		'<link rel="stylesheet" href="/public/css/style.css">' + 
		'</head>' + 
		'<body>' +
		'<div class="wrap"><h1>Events in San Francisco</h1><h2 class="date">' + currentDate + '</h2>');

	for (var i = 0; i < merged_array.length; i++) {
		if (merged_array[i].date == currentDate) {
			
			fs.appendFileSync('out.html',
				'<h3 class="title"><a href=' + merged_array[i].link + ' target=blank>' + merged_array[i].name + '</a></h2>' + 
				'<div class="date_time"><strong>Date: </strong> ' + merged_array[i].date_time + '</div><br>' +
				'<div class="desc"><strong>Description:</strong> ' + merged_array[i].description + '</div><br>'
			)
		} else { 
			currentDate = merged_array[i].date;
			fs.appendFileSync('out.html', '<h2 class="date">' + currentDate + '</h2>');
		}
	}

	fs.appendFileSync('out.html', '</body></html>');
	console.log('html файл создан. Добавлено событий: ' + merged_array.length);
}

html();

app.use('/public', express.static('public'));

app.get('/', function(req, res) {res.sendFile(__dirname + "/out.html")});

app.listen(3000); 
console.log('Локальный сервер запущен: http://127.0.0.1:3000/');