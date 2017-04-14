'use strict';
const PAGE_ACCESS_TOKEN = 'EAAT4LrttP0MBAOwRnSKhdseZAMOMzNokiUZC6Yp7rNttChI7bT1E6cbZAHXXuuAZBlXXbxbZBiE8RotPUCajSDU0jUIYKmfi0ZC98L20dCIT5Ja8ObdGNRNSFYmhCi2mIb04VU7lZCHstrq1WRXOAZAQb4X7B1adItPqP8zMAr9NgAZDZD';
const APIAI_TOKEN = '6b0c4a04dc0443c580cd545733c27f07';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const apiai = require('apiai');

const app = express();
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const server = app.listen(process.env.PORT || 5000, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env);
});

const apiaiApp = apiai(APIAI_TOKEN);

/* For Facebook Validation */
app.get('/webhook', (req, res) => {
  if (req.query['hub.mode'] && req.query['hub.verify_token'] === 'chatbot2017autopilot') {
    res.status(200).send(req.query['hub.challenge']);
  } else {
    res.status(403).end();
  }
});

/* Handling all messenges */
app.post('/webhook', (req, res) => {
  console.log(req.body);
  if (req.body.object === 'page') {
    req.body.entry.forEach((entry) => {
      entry.messaging.forEach((event) => {
        if (event.message && event.message.text) {
          sendMessage(event);
        }
      });
    });
    res.status(200).end();
  }
});

/* GET query from API.ai */

function sendMessage(event) {
  var sender = event.sender.id;
  var text = event.message.text;

  var apiai = apiaiApp.textRequest(text, {
    sessionId: 'Niimble'
  });

  apiai.on('response', (response) => {
    console.log(response)
    var aiText = response.result.fulfillment.speech;

    request({
      url: 'https://graph.facebook.com/v2.6/me/messages',
      qs: {access_token: PAGE_ACCESS_TOKEN},
      method: 'POST',
      json: {
        recipient: {id: sender},
        message: {text: aiText}
      }
    }, (error, response) => {
      if (error) {
          console.log('Error sending message: ', error);
      } else if (response.body.error) {
          console.log('Error: ', response.body.error);
      }
    });
  });

  apiai.on('error', (error) => {
    console.log(error);
  });

  apiai.end();
}

/* Webhook for API.ai to get response from the 3rd party API */
app.post('/ai', (req, res) => {
  console.log('*** Webhook for api.ai query ***');
  console.log(req.body.result);

  if (req.body.result.action === 'AskStock') {
    var stock_name = req.body.result.parameters['stockname'];
    if(Stock_info(stock_name)){ Stock_info(stock_name); }
    else if(){  }
    else { 
        return res.json({
          speech: 'No',
          displayText: 'No',
          source: 'stock_name'
        });
    }
  }
});

function Stock_info(stock_name){
  var restUrl = 'https://google-stocks.herokuapp.com/?code=BKK:'+stock_name+'&format=json';
    request({url: restUrl,json: true }, function (error, response, body) {
      if (!error && response.statusCode == 200) {
        //var json = JSON.parse(body[0]);

        var msg = 'หุ้น ' + body[0].t + ' ราคา ' + body[0].l;
        return res.json({
          speech: msg,
          displayText: msg,
          source: 'stock_name'
        });
        console.log(body);
      } else {
        var errorMessage = 'I failed to look up stock name.';
        return res.status(400).json({
          status: {
            code: 400,
            errorType: errorMessage
          }
        });
      }
    })
}
    
function DW_info(stock_name){
  var restUrl = 'http://49.231.7.202:8080/axis2/services/DWService/getDWCalculatorByFormat?secSym='+stock_name+'&format=json';
  var cun = 0; var msg = '';
    request({url: restUrl,json: true }, function (error, response, body) {
        if (!error && response.statusCode == 200) {
          parseString(body, function (err, result) {
            myJSONObject.push(result);
            var json = JSON.parse(myJSONObject[0]['ns:getDWCalculatorByFormatResponse']['ns:return']);
              
            var nn = json.totalRecord;
            for (cun = 0;cun<nn;cun++){
              if(json['resultSet'][cun].IssuerSym == 'BLS'){
                msg = 'Underlying ' + json['resultSet'][cun].UnderlyingSym + ' DW: '+ json['resultSet'][cun].SecSym + ' ราคา ' + json['resultSet'][cun].LstPrice;
              }
            }
            return res.json({
              speech: msg,
              displayText: msg,
              source: 'stock_name'
            });
          });
        } else {
          msg = 'I failed to look up stock name.';
          console.log(errorMessage);
          return res.status(400).json({
            status: {
              code: 400,
              errorType: errorMessage
            }
          });
        }
      })
}
