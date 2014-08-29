var test = require('tape')

var serial = require('../');

var pinoccios = serial();

pinoccios.list(function(err,found){
  console.log('found',found,'pinoccios connected');

  pinoccios.connect(found[0],function(err,scout){
    scout.command("led.red",function(err,data){
      // send a bitlash command to the scout

      // close the connection. callback optional
      scout.close(function(err){
        // closed
      });
    });
  });

});



