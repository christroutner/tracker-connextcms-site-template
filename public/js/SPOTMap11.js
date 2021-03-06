function loadmap() {

  //Version 11 centers the map on the last SPOT coordinate.
    
  // Wait until the DOM has loaded before querying the document
  $(document).ready(function() {

    // GLOBAL VARIABLES
    var map;	//global map object
    var marker_array = new Array(); //Array of markers on the map.
    var GoldenLine = new google.maps.Polyline();
    var xmlMarkerIndex; //Used to store the index of the currently selected marker in marker_array.
            
    var xmlDoc; //Used to store the XML for the currently selected marker.
    
    //Dates used for the slider.
    var EndDate = new Date();   //The right slider value.
    var StartDate = new Date(); //The left slider value.
    var MinDate = new Date();   //The smallest value the slider can take.
    var MaxDate = new Date();   //The largest value the slider can take.
    var week = 1000*60*60*24*7; //millisecond in one week.

    $( "#amount" ).val( "Connecting to server..." );

    //Load the map into the 'map_canvas' div element.
    var latlng = new google.maps.LatLng(48.555705,-122.960358);
    var settings = {
           zoom: 9,
           center: latlng,
           mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    var map = new google.maps.Map(document.getElementById("map_canvas"), settings);

    //Define global variables that I'll use to load data into the map.
    var csvData = new Array();			//Contains the data read from the CSV file.                
              
    // Temporary variables that I need to share between functions.
    var i; // counting variable.
      
    //Create a custom event for when the CSV file finishes loading.
    var CSVevent = new CustomEvent('CSVLoaded', {
    });
   
        
    //Get the CSV file containing the marker data. Trigger the CSVLoaded
    //event once the file finishes loading.
    var txtFile = new XMLHttpRequest();
    //Note: Server must be set up with the CORS Access-Control-Allow-Origin header set to '*'. 
    //See email I sent to myself about setting this up on a windows server.
    txtFile.open("GET", "/SolaceSPOTData.csv", true);
    txtFile.onreadystatechange = function() {
      if (txtFile.readyState === 4) {  // Makes sure the document is ready to parse.
        if (txtFile.status === 200) {  // Makes sure it's found the file.

          //convert the text from the csv file to an array of CSV data.
          csvData = $.csv.toArrays(txtFile.responseText);
        
          //Trigger the CSVevent to signal that the CSV has finished loading.
          document.dispatchEvent(CSVevent);
                    
        }
      }
    }
    txtFile.send(null); //Execute the file request.
              
    //Wrap the initialization of the map in an event listener that fires *after* the CSV file has finished loading.
    document.addEventListener('CSVLoaded', function (e) {
      //Call the initialize function to initialize the map and load the markers.
      initialize();
    }, false);
      
    //Initialize the map and add markers.
    //This function is called by the CSVEvent.
    function initialize() {

      //Retrieve the min and max dates. These are unix time stamps, so I have
      //to multiply them by 1000 to get a javascript Date value.
      //Not sure why, but this codes doesn't work unless I call *new* Date.
      MinDate = new Date(Number(csvData[0][0])*1000);
      MaxDate = new Date(Number(csvData[csvData.length-1][0])*1000);
      EndDate = MaxDate;
      StartDate = new Date(EndDate - week*2);
      
      //Update the date range display.
      $( "#amount" ).val( (StartDate.getMonth()+1) + "/" + StartDate.getDate() + " - " 
        + (EndDate.getMonth()+1) + "/" + EndDate.getDate() );

      //Initialize the Slider with our new date range.
      $( "#slider" ).slider({
        range: true,
        min: MinDate.getTime()/1000,
        max: MaxDate.getTime()/1000,
        values: [StartDate.getTime()/1000, EndDate.getTime()/1000],
        //This is the function that gets called whenver the slider is changed.
        stop: function( event, ui ) {

          //Calculate the new Start and End Dates
          StartDate = new Date(ui.values[0]*1000);
          EndDate = new Date(ui.values[1]*1000);
          
          //Update the date range display.
          $( "#amount" ).val( (StartDate.getMonth()+1) + "/" + StartDate.getDate() + " - " 
            + (EndDate.getMonth()+1) + "/" + EndDate.getDate() );

          //Draw the data points on the map that fall within the new date range.
          drawmap(StartDate, EndDate);

        }
      });

      //Initialize the map by drawing the data points that fall within the initial date range.
      drawmap(StartDate, EndDate);
    }
    
    
    //This function draws markers and a polyline based on data within the start
    //and end dates.
    function drawmap( StartDateLocal, EndDateLocal ) {
    
      //Remove the markers from the map.
      for(i = 0; i < marker_array.length; i++) {
        marker_array[i].setMap(null);
      }
      
      //Remove the polyline from the map.
      GoldenLine.setMap(null);
      
      //Create a new marker array
      marker_array = new Array(); 
      
      //Create the map markers from the data stored in the CSV file
      var poi_array = new Array();

      // Define a symbol using a predefined path (an arrow)
      // supplied by the Google Maps JavaScript API.
      var lineSymbol = {
        path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW
      };
      
      var j = 0; //Index separate from i.
      for(i = 0; i < csvData.length; i++) {
      
        //Only add POI to the map if they fall within the selected date range.
        if( (Number(csvData[i][0]) < Number(EndDateLocal)/1000) 
         && (Number(csvData[i][0]) > Number(StartDateLocal)/1000) ) {
          
          //Create an array of Points of Interest Lat and Long coordinates. 
          //This array is used for creating markers AND the polyline.
          poi_array[j] = new google.maps.LatLng(csvData[i][1], csvData[i][2]);
          
          // Create a marker for each line item in the CSV file.
          marker_array[j] = new google.maps.Marker({
            position: poi_array[j], 
            map: map, 
            icon: "images/measle_blue.png",
            title: csvData[i][3]
          });
          
          //Load the csvData index into the marker object, so the two can reference each other.
          marker_array[j].MarkerArrayIndex = i;
          
          j++;
        }
        
      }

      //Create the Polyline
      GoldenLine = new google.maps.Polyline({
        path: poi_array,
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
      GoldenLine.setMap(map); 
      
      //Center the map at the last location.
      map.setCenter(poi_array[poi_array.length-1]);
    }
    
  });
}    

