/*
 * This file is the central location for setting the server info. It is set up to work with both vanilla JS files as well as AMD/Require.js enabled JS files.
 */ 

function getUserSettings() {
  
  //These settings are for the ConnextCMS Demo site. Change them to reflect your own server.
  var userSettings = {
   
    //Basic server IP and port for KeystoneJS/ConnextCMS
    serverIp: '107.170.252.36',
    serverPort: '80', //Not Used
    
    userId: '581f3a5773f0411014b0f8fe',
    userData: '581f3a9c73f0411014b0f900',
    logFiles: ['101616', '101716', '101916', '102016', '102116', '102216', '102316', '102416', '102516', '102616', '102816', '102916', '103116',
              '110116', '110216', '110616']
  }

  return userSettings; 

};



//This little bit of code handles AMD enabled JS files that expect a define() function.
if ( typeof(define) === "function" && define.amd ) {
  define([], getUserSettings );  
}

