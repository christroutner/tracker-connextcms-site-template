var Mailgun = require('mailgun-js'); //Mailgun API library.
var keystone = require('keystone');
var security = keystone.security;


/*
Used to send a test email. Input object should have this structure:
{
  email: "test@test.com",
  subject: "subject",
  body: "body"
}
*/
exports.test = function(req, res) {
  debugger;
  
  var blah = req.params;
  var blah = req.query;
  
  //Process email address in query string.
  var email = req.query.email;
  if(email.indexOf(',') == -1) {    //Handle singe email addresses.
    if(email.indexOf('@') == -1) {  //Reject if there is no @ symbol.
      console.log('Invalid email: '+email);
      res.apiError('Invalid email address');
    }
    console.log('Got email: '+email);
    email = [email];  //Convert into an array.
    
  } else {  //Split multiple email addresses into an array.
    email = email.split(',');
  }
  
  //Error handling - undefined email
  if( email == undefined ) {
    console.log('Failure: email == undefined');
    res.apiError('Failure: email == undefined');
  }
  
  var subject = req.query.subject;
  var body = req.query.body;
  
  
  //Send the email log via MailGun email.
  var emailObj = new Object();
  emailObj.email = email;
  emailObj.subject = subject;
  emailObj.message = body
  sendMailGun(emailObj);
  
  //Return success.
  return res.apiResponse({
    success: true
  });
}

//This function is responsible for sending an error log to the administrator.
exports.sendlog = function(req, res) {
  //Process email address in query string.
  var email = ["chris.troutner@gmail.com"];
  var subject = "[CrumbShare Error Log] "+new Date();
  
  var log = req.query.log;
  var body = "";
  for(var i=0; i < log.length; i++) {
    body += i+'. '+log[i]+'\n';  
  }
  
  //Send the email log via MailGun email.
  var emailObj = new Object();
  emailObj.email = email;
  emailObj.subject = subject;
  emailObj.message = body
  sendMailGun(emailObj);
  
  //Return success.
  return res.apiResponse({
    success: true
  });
}

//This function sends an email using MailGun using an emailObj.
//emailObj = {
//  email = array of strings containing email addresses
//  subject = string for subject line
//  message = text message to email
//  html = (default = false). True = message contains html and should be treated as html.
//}
function sendMailGun(emailObj) {
  
  //Error Handling - Detect invalid emailObj
  if(
    //Conditions for exiting:
    (emailObj.email == undefined) ||
    (emailObj.subject == undefined) || (emailObj.subject == "") ||
    (emailObj.message == undefined) || (emailObj.message == "")
    ) 
  {
    console.log('Invalid email Object passed to sendMailGun(). Aborting.');
    debugger;
    return false;
  }
  
  //Error Handling - Detect any invalid email addresses
  for(var i=0; i < emailObj.email.length; i++) {
    if(emailObj.email[i].indexOf("@") == -1) {
      if(emailObj.email[i] == "") {
        //debugger;
        emailObj.email.splice(i,1); //Remove any blank entries from the array.
      } else {
        console.log('Error! sendMailGun() - Invalid email address passed: '+emailObj.email[i]); 
        return;
      }
    }
  }
  
  //Sort out the optional input html flag
  var html = false;
  if((emailObj.html != undefined) && (typeof(emailObj.html) == "boolean"))
    html = emailObj.html;
  
  //Send an email for each email address in the array via Mailgun API
  var api_key = 'key-3a4e4494ffe9b328783413ed0da9b332';
  var domain = 'mg.crumbshare.com';
  var from_who = 'chris.troutner@gmail.com';
  var mailgun = new Mailgun({apiKey: api_key, domain: domain});
  
  for( var i=0; i < emailObj.email.length; i++ ) {
  
    //Error handling.
    if(emailObj.email[i] == "")
      continue;
    
      if(html) {
        var data = {
          from: from_who,
          to: emailObj.email[i],
          subject: emailObj.subject,
          html: emailObj.message
        };
      } else {
        var data = {
          from: from_who,
          to: emailObj.email[i],
          subject: emailObj.subject,
          text: emailObj.message
        };
      }
      
      
      mailgun.messages().send(data, function(err, body) {
        if(err) {
          console.log('Got an error trying to send email with sendMailGun(): ', err);
          debugger;
        } else {
          console.log('Sent email successfully with sendMailGun()');
        }
      });
  }
}