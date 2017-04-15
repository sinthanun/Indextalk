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
    console.log('*** Stock Symbols ***');
    var stock_name = req.body.result.parameters['stockname'];
    var myJSONObject = [];
    //var restUrl = 'http://finance.google.com/finance/info?client=ig&q=BKK:'+stock_name+'&format=json';
    //var restUrl = 'https://google-stocks.herokuapp.com/?code=BKK:'+stock_name+'&format=json';
    //var restUrl = 'https://stocksymbols.herokuapp.com/symbol=BKK:'+stock_name+'&format=json';
    var restUrl = 'http://www.google.com/finance/info?nfotype=infoquoteall&q=INDEXBKK:'+stock_name+'&callback=?';

    request({url: restUrl,json: true }, function (error, response, body) {
      if (!error && response.statusCode == 200 && body[0]) {
        //var json = JSON.parse(body[0]);
        myJSONObject.push(body.substring(3));
        var result = JSON.parse(myJSONObject);
        
        /* netty >> thai Index */
        if (result[0].e === 'INDEXBKK') {
        var msg = 'ดัชนี ' + result[0].t + ' ระดับ ' + result[0].l + ' จุด เปลี่ยนแปลง ' + result[0].c + ' จุด ('+ result[0].cp+'%) ข้อมูล ณ ' + result[0].lt;
        return res.json({speech: msg,displayText: msg,source: 'stock_name'});
        }  else {
        /* netty >>  thai stock price*/
        if (result[0].e === 'BKK') {
        var msg = 'ชื่อหุ้น ' + result[0].t + ' ราคา ' + result[0].l + ' บาท เปลี่ยนแปลง ' + result[0].c + ' บาท ('+ result[0].cp+'%) ข้อมูล ณ ' + result[0].lt;
        return res.json({speech: msg,displayText: msg,source: 'stock_name'});
        console.log(result);} else {
         /* netty >>  Eng stock price*/
        var msg = 'Symbol: ' + result[0].t + ' Price ' + result[0].l + ' Change ' + result[0].c + ' ('+ result[0].cp+'%) As of ' + result[0].lt;
        return res.json({speech: msg,displayText: msg,source: 'stock_name'});
                                  }
                   }
        
        
      } else {
        var errorMessage = 'I cannot find you symbol name.';
        return res.status(400).json({ status: {code: 400,errorType: errorMessage}});
      }
    })
  }

});
