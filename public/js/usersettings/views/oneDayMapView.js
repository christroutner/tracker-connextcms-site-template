/*global define*/
//Define libraries this file depends on.
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',  
  'text!../../../js/usersettings/templates/oneDayMap.html',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyBJSXMXr_4xR7gWMfYb3dAV082sy4eLAMk',
  //'/js/lib/bootstrap-table.js'
], function ($, _, Backbone, OneDayMapTemplate, GoogleMaps) {
            //  BootstrapTable
            // ) {
	'use strict';

	var OneDayMapView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#oneDayMapView', 

		template: _.template(OneDayMapTemplate),

		// The DOM events specific to an item.
		events: {
      //'click #submitButton': 'logWork',
      //'change #logProject': 'populateWorkType'
		},

		initialize: function () {
      this.geoData = new Array();
      this.poi_array = new Array();    //Holds Google Map Points-of-Interest    
      this.marker_array = new Array(); //Used to visualize POIs on the Google Map
      this.markerIndex = 0;            //Used to create an array of markers.
      this.goldenLine = new google.maps.Polyline(); //Breadcrumb trail displayed on Google Map.
      this.fileIndex = 0;          //Used to track the current log file being used to retrieve the data.
      //this.currentlyViewedFile = "";  //The data log file that is currently being displayed in the map.
      this.infowindow = new google.maps.InfoWindow();  //Used to open and close Info Windows on click.
		},

    render: function (fileDate) {
      //debugger;
      try {
        log.push('Executing oneDayMapView.js/render()');
        
        this.$el.html(this.template);

        $('#oneDayMapView').show();

        //Load the map into the 'map_canvas' div element.
        var latlng = new google.maps.LatLng(48.555705,-122.960358);
        var settings = {
               zoom: 9,
               center: latlng,
               mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        this.map = new google.maps.Map(document.getElementById("mapOneDay"), settings);

        //If there is no User Data model assoicated with this user, then exit.
        if(userdata.userData == undefined) {
          return this;
        }

        this.initializeMap(fileDate);   

      } catch(err) {
        debugger;
        var msg = 'Error in oneDayMapView.js/render() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
      
			return this;
		},
    
    //Initialize the map. This function gets its data from the /api/trackinglogfile API, rather than the public files.
    initializeMap: function(fileDate) { 
      //debugger;
      try {
        log.push('Executing oneDayMapView.js/initializeMap()');
        
        this.currentlyViewedFile = fileDate;

        $('#mapTitle').text(fileDate);

        //Retrieve the data files from the server.
        //$.get('/uploads/geologs/'+userdata.userData+'/'+this.geoData[startIndex]+'.json', '', function(data) {
        $.get('/api/trackinglogfile/get/'+userdata.userData+'/'+fileDate, '', function(data) {
          //debugger;

          //Error handling
          if(!data.success) {
            console.error('Problem downloading data from server in oneDayMapView.js/initializeMap(). data.success = false');
            return;
          }

          //Refactor so the new data returned by the API works with the old code.
          var data = data.data; 

          //var j = 0; //Index of files to retrieve from the server.

          var thisView = global.oneDayMapView;

          //Remove the polyline from the map.
          if(thisView.goldenLine != undefined)
            thisView.goldenLine.setMap(null);

          //Initialize all variables.
          thisView.initialize(); 

          // Define a symbol using a predefined path (an arrow)
          // supplied by the Google Maps JavaScript API.
          var lineSymbol = {
            path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
          };

          // BEGIN MINMAX FILTER AND SPEED CALCULATION
          //Initialize the first point, used for filtering and speed calculation.
          var lastPoint = data.features[0];
          var markerIndexStart = thisView.markerIndex; //Used to start the polyline.
          
          for(var i = 0; i < data.features.length; i++) {

            var refLat = lastPoint.geometry.coordinates[1];
            var refLong = lastPoint.geometry.coordinates[0];
            
            var tmpLat = data.features[i].geometry.coordinates[1];
            var tmpLong = data.features[i].geometry.coordinates[0]

            //Error handling
            //If any values are null, skip this point.
            if( (refLat == null) || (refLong == null) || (tmpLat == null) || (tmpLong == null) ) {
              lastPoint = data.features[i]; //Update the lastPoint for the next calculation.
              continue;
            }
            
            var radiusKM = thisView.measureDistance(refLat, refLong, tmpLat, tmpLong);
            var radiusFeet = radiusKM * 3280.84; //Convert from KM to Feet.

            //Min filter: skip point if less than minimum distance.
            if(radiusFeet < 25) {
              continue;
            }
            //Max filter: skip point if less than max distance.
            //1 miles = 5280 feet.
            else if(radiusFeet > 5280*5) {
              continue;
            } else {
              
              //Calculate speed.
              var timeStart = new Date(lastPoint.properties.timestamp);
              var timeEnd = new Date(data.features[i].properties.timestamp);
              // speed = distance / time
              // speed will be in miles per hour (mph)
              var speed = (radiusFeet/5280)/((timeEnd - timeStart)/(1000*60*60));
              // speed will be in knots
              speed = speed/1.15078;
              
              //Update the lastPoint for the next calculation.
              lastPoint = data.features[i];
            }
            // END MINMAX FILTER AND SPEED CALCULATION
            

            //Create an array of Points of Interest Lat and Long coordinates. 
            //This array is used for creating markers AND the polyline.
            thisView.poi_array[thisView.markerIndex] = new google.maps.LatLng(data.features[i].geometry.coordinates[1], data.features[i].geometry.coordinates[0]);

            var timeStamp = new Date(data.features[i].properties.timestamp);

            // Create a marker for each line item in the CSV file.
            thisView.marker_array[thisView.markerIndex] = new google.maps.Marker({
              position: thisView.poi_array[thisView.markerIndex], 
              map: thisView.map, 
              icon: "images/measle_blue.png",
              //title: timeStamp.toUTCString()
              title: speed.toFixed(3)+' knots at '+timeStamp.toLocaleString()
            });

            //Load the array index into the marker object, so the two can reference each other.
            thisView.marker_array[thisView.markerIndex].MarkerArrayIndex = i;

            //Add the click handler for displaying the Info Window.
            //This allows smart phones and tablets to see vehicle speed too.
            google.maps.event.addListener(thisView.marker_array[thisView.markerIndex], 'click', (function(marker, i) {
              //debugger;

              return function() {
                
                //Close the existing info window so that only one is shown at a time.
                if(thisView.infowindow) {
                  thisView.infowindow.close();
                  thisView.infowindow = new google.maps.InfoWindow();
                }
                
                //infowindow.setContent(speed.toFixed(3)+' mph at '+timeStamp.toLocaleString());
                thisView.infowindow.setContent(marker.title);
                thisView.infowindow.open(thisView.map, marker);
              }
            })(thisView.marker_array[thisView.markerIndex], i));
            
            thisView.markerIndex++;

          }


          //debugger;
          thisView.fileIndex = 0;

          //Create the Polyline
          thisView.goldenLine = new google.maps.Polyline({
            path: thisView.poi_array,
            strokeColor: "orange",
            strokeOpacity: 0.8,
            strokeWeight: 3,
            icons: [{
              icon: lineSymbol,
              offset: '100%',
              repeat: '35px'
            }]

          });

          //Place the Polyline on the map:
          thisView.goldenLine.setMap(thisView.map); 

          //Center the map at the last location.
          thisView.map.setCenter(thisView.poi_array[thisView.poi_array.length-1]);

          //Hide the waiting screen.
          //global.modalView.closeModal();


        })
        //If the server call fails.
        .error(function(jqXHR, textStatus, errorThrown) { 
          debugger;
          var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
          console.error(msg);
          log.push(msg);
        });

      } catch(err) {
        debugger;
        var msg = 'Error in oneDayMapView.js/initializeMap() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    //http://www.codecodex.com/wiki/Calculate_Distance_Between_Two_Points_on_a_Globe#JavaScript
    //This function returns a distance between two GPS coordinates in kilometers.
    measureDistance: function(lat1, lon1, lat2, lon2) {
      //debugger;

      var R = 6371; // km  
      var dLat = (lat2-lat1)*Math.PI/180;  
      var dLon = (lon2-lon1)*Math.PI/180;   
      var a = Math.sin(dLat/2) * Math.sin(dLat/2) +  
              Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) *   
              Math.sin(dLon/2) * Math.sin(dLon/2);   
      var c = 2 * Math.asin(Math.sqrt(a));   
      var d = R * c;

      return d;
    }
    
    
	});
  

  //debugger;
	return OneDayMapView;
});
