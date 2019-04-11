const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');

var validPass = "romeo";

var status = {
  'comms_connected': false,
  'mode': 'R',
  'port': '',
  'baudrate': '',
  'available_ports': [],
  'dive': 1,
  'rovname': 'ROMEO'
};

var pos = {
  'hdg': 0,
  'turns': 0,
  'cnt': 0
};

var comms = {

  wire: null,
  parser: null,

  connect: function(port, baudrate){
    console.log("Connect to serial port " + port + " @ " + baudrate + " bps");
    this.wire = new SerialPort(port, {baudRate: baudrate});
    this.parser = this.wire.pipe(new Readline());
    this.parser.on('data', this.recvd);
  },

  disconnect: function(){

  },

  recvd: function(data){
    // received data from serial port
    var fsep = RegExp("\\s+");
    var fields = data.split(fsep);

    var ok = fields[2];

    var dhdg = Number(fields[1]);
    
    if (ok != "1") return;
    
    if (status.mode != 'A'){
      console.log("Don't know if it is in the right mode, just update the heading and shrug");
      pos.hdg = dhdg;
    } else {
      pos.hdg = (pos.hdg + dhdg) % 360;
    if (pos.hdg < 0) pos.hdg += 360;
    // console.log("Dhdg: " + dhdg + ", absolute: " + pos.hdg);
    pos.turns += dhdg /360;
    pos.cnt++;

    

    if (pos.cnt % 10 == 0){     // Send to interface every 500ms (20 samples)
      if (status.mode != 'A') console.log("Wrong mode, won't log data in absolute heading values (still sending it to viewer)");
      else logGyroData(pos.hdg.toFixed(4), pos.turns.toFixed(4), pos.cnt, status.dive, status.rovname);
      // console.log("[" + pos.cnt + "] Calculated heading: " + pos.hdg + ", total rotation: " + pos.turns);

    }
    
      var posmsg = {
        cmd: "GYRO",
        pos: pos
      };
      var sposmsg = JSON.stringify(posmsg);

      wsclients.forEach(function(ws){
        ws.send(sposmsg);
      });
    }

  },

  send: function(data){
    this.wire.write(data);
  },

  get_ports: function(){
    SerialPort.list(function(err, ports){
      ports.forEach(function(port){
        if (port.vendorId){
          status.available_ports.push(port.comName);
          console.log(port);
        }
        
      });
    });
  }
}

comms.get_ports();

// ### DEBUG
// comms.connect('/dev/ttyUSB0', 38400);


// Websocket server
var WSServer = require('ws').Server;
wss = new WSServer({port: 41148});

var wsclients = [];

wss.on('connection', function(ws){

  wsclients.push(ws);

  // ***********************

  ws.on('message', function(msg){
    console.log("Received message from client: " + msg);
    var sender = this;
   parseClientCommand(sender, JSON.parse(msg));
  });

  // ***********************

  ws.on('close', function(msg){
    console.log('Client has disconnected');
    wsclients = wsclients.filter(function(value, index, arr){
      return (value != ws);
    });
    console.log('Remaining clients: ' + wsclients.length);
  });
});

  // ***********************
  // ***********************
function parseClientCommand(sender, msg){

  var pass = msg.pass;
  if (pass != validPass && msg.cmd != "STS"){
    console.log("Admin command sent without admin password, ignore");
  
  } else {
    switch(msg.cmd){

      // ******
      case "PRT":
        status.port = msg.port;
        status.baudrate = msg.baudrate;
        status.comms_connected = true;

        comms.connect(status.port, status.baudrate);
        break;

      // ******
      case "ZERO":
        if (status.comms_connected){
          comms.send("Z");
          pos.hdg = 0;
          pos.turns = 0;
        
        } else {
          console.log("Sent Zero request but comms not connected");
        }
        break;

      // ******
      case "MODE":
        if (status.comms_connected){
          status.mode = 'A';
          comms.send(status.mode);
          
        } else {
          console.log("Sent A Mode request but comms not connected");
        }
        break;
  
    }
  }

  hello = {
    'cmd': 'STS',
    'status': status
  }
  sender.send(JSON.stringify(hello));
  
}


////////////////////////////////////////////////////
// DB Logging - influxdb
const Influx = require('influx');

const influx = new Influx.InfluxDB({
  host: 'localhost',
  database: 'umbilical_conditioning_magellan_db',
  schema: [
    {
      measurement: 'gyro',
      fields: {
        hdg: Influx.FieldType.FLOAT,
        turns: Influx.FieldType.FLOAT,
        cnt: Influx.FieldType.INTEGER,
        dive: Influx.FieldType.INTEGER
      },
      tags: [
        'rov'
      ]
    }
  ]
 });

 influx.createDatabase('umbilical_conditioning_magellan_db');

 function logGyroData(hdg, turns, cnt, dive, rovname){
  
  influx.writePoints([
    {
      measurement: 'gyro',
      tags: { rov: rovname },
      fields: { hdg: hdg, cnt: cnt, turns: turns, dive: dive},
    }
  ]);
 }

////////////////////////////////////////////////////
// Winfrog sockets
const net = require('net');


  
  vessel = net.connect(1700, '192.168.42.111', function () {
    console.log(('Connected'));

    this.on('data', function (data) {
      console.log("Vessel receives: " + data);
    });

  });

  vessel.on('error', function(e){
    console.log("Error in connection" + e);
  });

  var romeo = net.connect(1701, '192.168.42.111', function () {
    console.log(('Connected'));

    this.on('data', function (data) {
      console.log("Romeo receives: " + data);
    });
  });

  romeo.on('error', function(e){
    console.log("Error in connection" + e);
  });

  var juliet = net.connect(1702, '192.168.42.111', function () {
    console.log(('Connected'));

    this.on('data', function (data) {
      console.log("Juliet receives: " + data);
    });
  });

  juliet.on('error', function(e){
    console.log("Error in connection" + e);
  });


////////////////////////////////////////////////////
// Website
const express = require('express');
var app = express();


app.use(express.static('www'));

app.get('/cmd', function (req, res) {
  res.send('Hello World!');
});
 
app.listen(8000, function () {
  console.log('GMCC Server listening on port 8000');
});