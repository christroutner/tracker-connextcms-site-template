/*global define*/
//Define libraries this file depends on.
define([
	'jQuery-2.1.4.min',
	'underscore_1.3.3',
	'backbone_0.9.2',  
  'text!../../../js/usersettings/templates/dashboard.html',
  'Chart.min',
  '../../../js/jquery/jquery-ui.min.js',
  'https://maps.googleapis.com/maps/api/js?key=AIzaSyBJSXMXr_4xR7gWMfYb3dAV082sy4eLAMk',
  '../../../js/usersettings/views/mapSettingsView.js'
], function ($, _, Backbone, DashboardTemplate, Chart, jQueryUI, GoogleMaps, MapSettingsView) {
	'use strict';

	var DashboardView = Backbone.View.extend({

		tagName:  'div',
    
    el: '#dashboardView', 

		template: _.template(DashboardTemplate),

		// The DOM events specific to an item.
		events: {

		},

		initialize: function () {
      this.fileList = new Array();
      this.statusList = new Array();
      this.poi_array = new Array();    //Holds Google Map Points-of-Interest    
      this.marker_array = new Array(); //Used to visualize POIs on the Google Map
      this.markerIndex = 0;            //Used to create an array of markers.
      this.goldenLine = new google.maps.Polyline(); //Breadcrumb trail displayed on Google Map.
      this.fileIndex = 0;          //Used to track the current log file being used to retrieve the data.
      this.infowindow = new google.maps.InfoWindow();  //Used to open and close Info Windows on click.
		},

    render: function () {
      //debugger;
      
      try {
        log.push('Executing dashboardView.js/render()');
        
        this.$el.html(this.template);

        $('#dashboardView').show();

        this.$el.find( "#amount" ).val( "Connecting to server..." );

        //Load the map into the 'map_canvas' div element.
        var latlng = new google.maps.LatLng(48.555705,-122.960358);
        var settings = {
               zoom: 9,
               center: latlng,
               mapTypeId: google.maps.MapTypeId.ROADMAP
        };
        this.map = new google.maps.Map(document.getElementById("map_canvas"), settings);

        //If there is no User Data model assoicated with this user, then exit.
        if(userdata.userData == undefined) {
          this.$el.find('#amount').val('No data found!');
          return this;
        }

        //Get the file list of available log files from the user data on the server.
        $.get('/api/userdata/'+userdata.userData, '', function(data) {
          //debugger;

          global.dashboardView.userFilesModelId = data.geodata.userFiles;
          
          //Retrieve the UserFiles model for this user.
          $.get('/api/userfiles/'+global.dashboardView.userFilesModelId, '', function(data) {
            //debugger;
            
            //Save the statusList to a View variable.
            //Filter it to remove all entries that don't have a status of success.            
            var statusList = [];
            for(var i=0; i < data.collection.textArray.length; i++) {
              var tmpData = JSON.parse(data.collection.textArray[i]);
              if(tmpData.status == 'success')
                statusList.push(data.collection.textArray[i]);
            }
            global.dashboardView.statusList = statusList;

            
            //Generate the global fileList variable from the statusList.
            global.dashboardView.fileList = [];
            for(var i=0; i < statusList.length; i++) {
              var tmpData = JSON.parse(statusList[i]);
              
              global.dashboardView.fileList.push(tmpData.fileName);
            }
            
            global.dashboardView.initializeMap();
            
          }).fail(function(jqXHR, textStatus, errorThrown) {
            //debugger;
            var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
            console.error(msg);
            log.push(msg);
          });

          
        })
        .fail(function(jqXHR, textStatus, errorThrown) {
          //debugger;
          var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
          console.error(msg);
          log.push(msg);
        });

        global.mapSettingsView = new MapSettingsView();
        global.mapSettingsView.render();
      
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/render() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
        
			return this;
		},
    
    openModal: function() {
      //debugger;
      //global.modalView.render();
      global.modalView.openModal();
    },
    
    initializeMap: function() {
      //debugger;
      try {
        log.push('Executing dashboardView.js/initializeMap()');
        
        //Error Handling
        if(this.fileList.length == 0)
          return;

        //Throw up the spinny waiting gif
        global.modalView.waitingModal();

        this.MinDate = new Date(this.fileNameToDate(this.fileList[0]));
        this.MaxDate = new Date(this.fileNameToDate(this.fileList[this.fileList.length-1]));
        
        //Error Handling
        if((this.MinDate == "Invalid Date") || (this.MaxDate == "Invalid Date")) {
          this.$el.find('#amount').val('No data found!');
          return;
        }
        
        this.EndDate = this.MaxDate;
        this.StartDate = this.MinDate;

        //Adjust the start date if it is more than two weeks older than the end date.
        var oneDay = 1000*60*60*24; //Number of milliseconds in a day.
        //var twoWeeksFromEndDate = new Date(this.EndDate.getTime()-oneDay*14);
        var twoWeeksFromEndDate = new Date(this.EndDate.getTime()-oneDay*1); //Temp code to minimize data download.
        if(twoWeeksFromEndDate > this.StartDate) {
          this.StartDate = twoWeeksFromEndDate;
        }

        //Update the date range display.
        $( "#amount" ).val( (this.StartDate.getMonth()+1) + "/" + this.StartDate.getDate() + " - " 
          + (this.EndDate.getMonth()+1) + "/" + this.EndDate.getDate() );

        //Initialize the Slider with our new date range.
        $( "#slider" ).slider({
          range: true,
          min: this.MinDate.getTime()/1000,
          max: this.MaxDate.getTime()/1000,
          values: [this.StartDate.getTime()/1000, this.EndDate.getTime()/1000],

          //This is the function that gets called whenver the slider is changed and the mouse is unclicked.
          stop: function( event, ui ) {

            //Calculate the new Start and End Dates
            global.dashboardView.StartDate = new Date(ui.values[0]*1000);
            global.dashboardView.EndDate = new Date(ui.values[1]*1000);

            //Update the date range display.
            $( "#amount" ).val( (global.dashboardView.StartDate.getMonth()+1) + "/" + global.dashboardView.StartDate.getDate() + " - " 
              + (global.dashboardView.EndDate.getMonth()+1) + "/" + global.dashboardView.EndDate.getDate() );

            //Draw the data points on the map that fall within the new date range.
            global.dashboardView.drawMap(global.dashboardView.StartDate, global.dashboardView.EndDate);
          },

          //This function is called as the slider is changed in real time. It's same as stop, execept it doesn't call drawmap().
          slide: function( event, ui ) {
            //debugger;

            global.dashboardView.StartDate = new Date(ui.values[0]*1000);
            global.dashboardView.EndDate = new Date(ui.values[1]*1000);

            $( "#amount" ).val((global.dashboardView.StartDate.getMonth()+1) + "/" + global.dashboardView.StartDate.getDate() + " - " 
              + (global.dashboardView.EndDate.getMonth()+1) + "/" + global.dashboardView.EndDate.getDate());
          }
        });

        //Initialize the map by drawing the data points that fall within the initial date range.
        this.drawMap(this.StartDate, this.EndDate);

      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/initializeMap() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    //This function converts a fileName string into a date that the javascript Date.parse() funciton can recognize.
    fileNameToDate: function(fileName) {
      
      try {
        log.push('Executing dashboardView.js/fileNameToDate()');
        
        if(fileName == undefined) {
          var msg = "Problem in dashboardView.js/fileNameToDate(). fileName = undefined";
          log.push(msg);
          console.error(msg);
          global.modalView.closeModal(); //Hide the waiting screen.
          return null;
        }
        
        if(fileName.length != 6) {
          console.error('Invalid length. File name is longer than 6 characters: '+fileName);
          return;
        }
      
        var outStr = fileName.slice(0,2)+'-'+fileName.slice(2,4)+'-'+fileName.slice(4,6);
        var outDate = new Date(outStr);
        return outDate;
      
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/fileNameToDate() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        //sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
        return null;
      }
    },
    
    //This function converts a date to a file name that will match those stored in the geoData array.
    dateToFileName: function(inputDate) {
      //debugger;
      try {
        log.push('Executing dashboardView.js/dateToFileName()');
        
        var month = '00'+(inputDate.getUTCMonth()+1);
        month = month.slice(-2);

        var day = '00'+inputDate.getUTCDate();
        day = day.slice(-2);

        var year = inputDate.getUTCFullYear().toString();
        year = year.slice(-2);

        var outputStr = month+day+year;

        return outputStr;
        
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/dateToFileName() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
      
    },
    
    drawMap: function(start, stop) {
      //debugger;
      try {
        log.push('Executing dashboardView.js/drawMap()');

        //Show the waiting screen.
        //$('#waiting-screen').modal('show');

        //Remove the markers from the map.
        for(var i = 0; i < this.marker_array.length; i++) {
          this.marker_array[i].setMap(null);
        }

        //Remove the polyline from the map.
        this.goldenLine.setMap(null);

        //Create a new marker array
        this.marker_array = new Array(); 
        this.poi_array = new Array();
        this.markerIndex = 0;


        // Define a symbol using a predefined path (an arrow)
        // supplied by the Google Maps JavaScript API.
        //var lineSymbol = {
        //  path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
        //};

        //Determine the index of data to retrieve from the server based on the settings of the slider.
        var oneDay = 1000*60*60*24; //Number of milliseconds in a day.

        var startIndex = this.getStartIndexFromDate(start);
        var stopIndex = this.getStopIndexFromDate(stop);

        //Error handling.
        if(startIndex > stopIndex)
          return;

        this.mapLogFile(startIndex, stopIndex);
        
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/drawMap() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    //This function is used by drawmap() to retrieve the logfile index based on the start date selected by user.
    //This subfunction is mostly concerned with error handling and ensuring a proper value is returned.
    getStopIndexFromDate: function(inDate) {
      //debugger;
      try {
        log.push('Executing dashboardView.js/getStopIndexFromDate()');

        //Determine the index of data to retrieve from the server based on the settings of the slider.
        var oneDay = 1000*60*60*24; //Number of milliseconds in a day.

        var stopStr = this.dateToFileName(inDate);      
        var stopIndex = this.fileList.indexOf(stopStr);

        //Increment the start date until a log file is found that matches.
        while(stopIndex == -1) {
          //debugger;

          //Decrement the selected stop date.
          var newStopDate = new Date(this.fileNameToDate(stopStr).getTime() - oneDay);
          stopStr = this.dateToFileName(newStopDate);
          stopIndex = this.fileList.indexOf(stopStr);

          //Update the slider
          var sliderVals = $("#slider").slider("values");
          sliderVals = [sliderVals[0], newStopDate.getTime()/1000];

          if(sliderVals[0] != sliderVals[1]) {
            //Update the slider control
            $("#slider").slider("values", sliderVals);

            //Update the displayed date range
            this.$el.find( "#amount" ).val((this.StartDate.getMonth()+1) + "/" + this.StartDate.getDate() + " - " 
            //  + (this.newStopDate.getMonth()+1) + "/" + this.newStopDate.getDate());
                + (newStopDate.getMonth()+1) + "/" + newStopDate.getDate());
          }

        }

        return stopIndex;
        
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/getStopIndexFromDate() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    //This function is used by drawmap() to retrieve the logfile index based on the start date selected by user.
    //This subfunction is mostly concerned with error handling and ensuring a proper value is returned.
    getStartIndexFromDate: function(inDate) {
      //debugger;
      try {
        log.push('Executing dashboardView.js/getStartIndexFromDate()');
      
        //Determine the index of data to retrieve from the server based on the settings of the slider.
        var oneDay = 1000*60*60*24; //Number of milliseconds in a day.

        var startStr = this.dateToFileName(inDate);      
        var startIndex = this.fileList.indexOf(startStr);

        //Increment the start date until a log file is found that matches.
        while(startIndex == -1) {
          //debugger;

          //Increment the selected start date.
          var newStartDate = new Date(this.fileNameToDate(startStr).getTime() + oneDay);
          startStr = this.dateToFileName(newStartDate);
          startIndex = this.fileList.indexOf(startStr);

          //Update the slider
          var sliderVals = this.$el.find("#slider").slider("values");
          sliderVals = [newStartDate.getTime()/1000, sliderVals[1]];

          //Protect against sliders landing on top of one another.
          if(sliderVals[0] != sliderVals[1]) {
            //Update the slider with the new values
            this.$el.find("#slider").slider("values", sliderVals);

            //Update the displayed date range
            this.$el.find( "#amount" ).val((newStartDate.getMonth()+1) + "/" + newStartDate.getDate() + " - " 
                + (this.EndDate.getMonth()+1) + "/" + this.EndDate.getDate());
          }

        }

        return startIndex;
        
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/getStartIndexFromDate() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
    },
    
    //This is a recursive function that retrieves log files from the server and places the data on the map.
    //It calls itself until all the log files have been retrieved and posted to the map.
    mapLogFile: function(startIndex, stopIndex) {      
      //debugger;
      try {
        log.push('Executing dashboardView.js/mapLogFile()');
        
        //Syncronize the global fileIndex variable when this function is called the first time.
        if(startIndex != this.fileIndex) {
          //debugger;
          this.fileIndex = startIndex;
        }

        var thisStatus = JSON.parse(this.statusList[startIndex]);
        
        var thisView = global.dashboardView;
        
        if( (thisStatus.status == "success") && (thisStatus.fileName == this.fileList[startIndex]) ) {

          //Retrieve the data files from the server.
          $.get('/api/trackinglogfile/get/'+userdata.userData+'/'+this.fileList[startIndex], '', function(data) {
            //debugger;

            //Error handling
            if(!data.success) {
              console.error('Problem downloading data from server in dashboardView.js/mapLogFile(). data.success = false');
              return;
            }

            //Refactor so the new data returned by the API works with the old code.
            var data = data.data; 

            var thisView = global.dashboardView;


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

              //Load the csvData index into the marker object, so the two can reference each other.
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


            thisView.checkIfMapDone(stopIndex);
            
          })
          //If the server call fails.
          .error(function(jqXHR, textStatus, errorThrown) { 
            //debugger;

            //Attempt to recover from a file not found error.
            try {
              var jsonIndex = jqXHR.responseJSON.error.indexOf('.json');
              var fileName = jqXHR.responseJSON.error.slice(0,jsonIndex);
              console.log(fileName+'.json could not be found on the server, skipping. File probably has scrubbed data. Ignore error above.');
              
              thisView.checkIfMapDone(stopIndex);

              
            //Anything else, send an error log to the admin and alert the user.
            } catch(err) {
              debugger;

              var msg = 'Error: '+errorThrown+' Server status returned: '+jqXHR.status;
              console.error(msg);
              log.push(msg);
              sendLog();

              msg = "There was an error trying to retrieve data from the server. Please take a "+
                "screenshot right now and email it to chris.troutner@gmail.com. Error message as follows:\n"+msg;
              global.modalView.errorModal(msg);
            }
          });
        } else {
          var msg = thisStatus.fileName+' has a status of '+thisStatus.status+', so skipping.';
          console.log(msg);
          
          thisView.checkIfMapDone(stopIndex);
          
        }
        
      } catch(err) {
        debugger;
        var msg = 'Error in dashboardView.js/mapLogFile() Error: '+err.message;
        console.error(msg);
        log.push(msg);
        sendLog();
        
        global.modalView.closeModal(); //Hide the waiting screen.
      }
   
  
    
	  },
    
    checkIfMapDone: function(stopIndex) {
      //debugger;
      
      var thisView = global.dashboardView;
      
      //Iteratively call this function until all log files have been processed.
      if(thisView.fileIndex < stopIndex) {
        thisView.fileIndex++;
        thisView.mapLogFile(thisView.fileIndex, stopIndex);

      //Last call of mapLogFile(). Wrap up map. Reinitialize global variables.
      } else {
        //debugger;
        thisView.fileIndex = 0;

        // Define a symbol using a predefined path (an arrow)
        // supplied by the Google Maps JavaScript API.
        var lineSymbol = {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
        };

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
        //$('#waiting-screen').modal('hide');
        global.modalView.closeModal();

        console.log('Finished rendering the map.');
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
	return DashboardView;
});