var eb = require('../lib/echoback-stream');
var through = require("through");
var test = require('tape');


test("can echoback",function(t){

  t.plan(3);

  var serial = through(function(write){
    this.queue(Buffer.concat([write,new Buffer('OK')]));
  });

  var s = eb(serial);

  s.on('data',function(data){
    data = data+'';
    t.equals(data.lastIndexOf("OK"),data.length-2,'should say ok');
  })
  

  s.write(new Buffer(Math.random()+''));
  s.write(new Buffer(Math.random()+''));
  s.write(new Buffer(Math.random()+''));

});

test("echoback respects max",function(t){

  var serial = through(function(write){
    this.queue(write);
  });

  var s = eb(serial);

  var count = 0;
  s.on('data',function(data){ 
    count += data.length;
  });
 
  s.on('end',function(){
    t.equals(count,140,'should have counted all of the characters and stripped echos');
    t.end();
  })
 
  var str = '';
  while(str.length<140){
    str += Math.random()+'';
  }

  str = new Buffer(str.substr(0,140));

  s.write(str);
  s.end();
});


test("output while not writing works",function(t){
  
  var serial = through();
  var s = eb(serial);
  var c = 0;

  s.on('data',function(buf){
    c++;
    t.equals(buf+'',"hi",'should say hi');
  })

  s.on('end',function(){
    t.equals(c,2,'said hi twice');
    t.end();
  })

  serial.write(new Buffer('hi'));
  serial.write(new Buffer('hi'));
  s.end();
});

test("echoback response before echo",function(t){

  var serial = through(function(write){
    this.queue(Buffer.concat([new Buffer("mooo"),write]));
  });

  var s = eb(serial);

  var count = 0;
  s.on('data',function(data){ 
    t.equals(data,"mooo",'should have moooed');
  });
 
  s.on('end',function(){
    t.end();
  });

  s.end();
});

test("echoback split over multiple data events",function(t){

  var serial = through(function(write){

    var middle = Math.ceil(write.length/2);

    this.queue(Buffer.concat([new Buffer("ok"),write.slice(0,middle)]));
    this.queue(Buffer.concat([write.slice(middle),new Buffer(" work")]));

  });

  var s = eb(serial);

  var out = [];

  s.on('data',function(data){
    out.push(data);
  });
 
  s.on('end',function(){

    t.equals(out.length,2,'should have 2 data events');

    out = Buffer.concat(out)+'';

    t.equals(out,'ok did it work','should have worked');
    t.end();
  });

  s.write(new Buffer(" did it"));
  s.end();
});


