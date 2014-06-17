pinoccio-serial
===============

serial interface base objects for pinoccio microcontrollers https://pinocc.io

```js
var serial = require('pinoccio-serial');

var pinoccios = serial();

pinoccios.list(function(err,array of scouts found){
  console.log('found',found,'pinoccios connected');
});

pinoccios.connect(com,function(err,scout){
  scout.command("led.red",function(err,data){
    // send a bitlash command to the scout
  });

  // close the connection. callback optional
  scout.close(function(err){
    // closed
  });
});


```
