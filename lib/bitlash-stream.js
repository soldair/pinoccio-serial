
var DEBUG = process.env.DEBUG;

var through = require('through');
var _prompt = ">".charCodeAt(0);
var bindexof = require('buffer-indexof');
var empty = new Buffer(0);

var echoback = require('./echoback-stream');





module.exports = function(serialPort){
  var delim = new Buffer("\n")
  , state = 'start'
  , running = false
  , q = []  
  ;

  var s = through(function(command){

    //console.log('>> command ',command);

    if(typeof command == 'string') command = {command:command};
    if(!command || !command.command) return;
    //console.log('>> command queue length',q.length);
    q.push(command);
    run();  
  });

  s.lastData = Date.now();
  
  var bufs = empty;
  var resultbuf = '';
  var writemax = 63;

  serialPort.on('data',function(buf){
    s.emit('log',buf);
  })

  // ebStream is used for writing to serialPort
  // it can get stuck super easily if any command echoback gets corrupted.

  ebStream = echoback(serialPort,writemax);

  serialPort.on('data',function(buf){

    s.lastData = Date.now();

    //console.log('\n))) remaining: "'+bufs+'" ((((\n')
    //console.log("\n=== looking for lines inside of ===\n\""+buf+"\"\n=========\n");

    var idx;
    while((idx = bindexof(buf,delim)) > -1){
      bufs = Buffer.concat([bufs,buf.slice(0,idx+1)]);

      //console.log("\n---------this code thinks this is a line --------------\n\""+bufs+"\"\n----------\n");
      s.emit('line',bufs+'');
      bufs = empty;
      buf = buf.slice(idx+1);
    }

    if(buf.length){
      bufs = Buffer.concat([bufs,buf])
    }

    // is the start of the line a prompt?
    // these are not followed by a new line so i have to emit them right away.
    if(bufs[0] === _prompt){
      //console.log('GOT PROMPT!');
      s.emit('line',bufs.slice(0,2)); // prompt is "> "
      bufs = bufs.slice(2);
    } else {
      //console.log("\n-- did not get prompt "+bufs[0]+" != "+_prompt+" --\n")
      //console.log(bufs[0],bufs[1],bufs[2]);
      //bufs[0]
    } 
  });

  s.on('line',function(buf){
    //console.log('\n---- line ----\n')
    if(state == 'prompt') {
      // i can ignore data comming from here until a command is issued
      debug('prompt###',buf+'');
    } else { 

      if(buf[0] == _prompt) {
        handlePrompt(buf);
      } else {

        debug(state,'result###',buf+'');
        resultbuf += buf;
      }

    }
  });

  var opened;
  function handlePrompt(buf){
    debug('end of result###',buf+'');

    if(state == 'result') {
      // transform stream baby!
      running.result = resultbuf;
      s.queue(running);
    } else if(!opened) {
      opened = true;
      setImmediate(function(){
        s.emit('open');// the bitlash prompt is up.
      });
    }

    resultbuf = '';
    running = false;
    state = 'prompt';
    run();
  }


  function run(){
    if(state == 'prompt' && q.length) {
      state = 'result';
      var command = q.shift();
      running = command;

      ebStream.write(new Buffer(command.command.trim()+"\r\n"));
    }
  }
  return s;
}


function debug(){
  if(!DEBUG) return;
  console.log.apply(console,arguments);
}
