//get the HTTP module and create a server. This time we will store the returned server as "app"
var app = require('http').createServer(handler);
//grab socketio and pass in our server "app" to create a new socketio server running inside of our HTTP server
//Socket.io can also run individually, but in this case we want it to run with our webpages, so we will use the module's
//option to allow us to embed it
var io = require('socket.io')(app);
//grab our file system 
var fs = require('fs');

//get the PORT for the server
//Remember we use process.env.PORT or process.env.NODE_PORT to check if we are running on a server
//that already has set ports in the environment configuration
var PORT = process.env.PORT || process.env.NODE_PORT || 3000;

//tell your server to listen on the port
app.listen(PORT);

var lastUpdate;

//Overall object to show maintained by the server
/**Clients will have their own local objects, but the one on the server will be 
   assumed to be the master object. This is the correct up to date one. All others are just synced
   from this one. **/
//Our square object will have a last updated time (so the client know to use the latest if they receive multiple)
//Our square will also have an x/y position and height/width
var square = {
    lastUpdate: new Date().getTime(),
    x: 250,
    y: 250,
	xSpd: 0 /*see connection for speed values*/,
	ySpd: 0,
    height: 100,
    width: 100,
	index: 0,
	color: "#FFFFFF"
};

var squares = [];

//Our HTTP server handler. Remember with an HTTP server, we always receive the request and response objects
function handler (req, res) {
  //read our file ASYNCHRONOUSLY from the file system. This is much lower performance, but allows us to reload the page
  //changes during development. 
  //First parameter is the file to read, second is the callback to run when it's read ASYNCHRONOUSLY
  fs.readFile(__dirname + '/../client/index.html', function (err, data) {
    //if err, throw it for now
    if (err) {
      throw err;
    }

    //otherwise write a 200 code and send the page back
    //Notice this is slightly different from what we have done in the past. There is no reason for this, just to keep it simple.
    //There are multiple ways to send things in Node's HTTP server module. The documentation will show the optional parameters. 
    res.writeHead(200);
    res.end(data);
  });
}

/** Now we need to code our web sockets server. We are using the socket.io module to help with this. 
    This server is a SEPARATE server from our HTTP server. They are TWO DIFFERENT SERVERS. 
    That said, socket.io allows us to embed our websockets server INSIDE of our HTTP server. That will allow us to
    host the socket.io libraries on the client side as well as handle the websocket port automatically. 
**/
//When new connections occur on our socket.io server (we receive the new connection as a socket in the parameters)
io.on('connection', function (socket) {
  //join that socket to a hard-coded room. Remember rooms are just a collection of sockets. A socket can be in none, one or many rooms. 
  //A room's name is just a string identifier. It can be anything you make. If the room exists when you add someone, it adds them to the room.
  //If the room does not exist when you add someone, it creates the room and adds them to it. 
  socket.join('room1');
  
  
  square.x = Math.random()*250 +125;
  square.y = Math.random()*250 +125;
  square.xSpd = Math.floor(10+Math.random()*10) * (Math.random() < 0.5 ? -1 : 1);
  square.ySpd = Math.floor(10+Math.random()*10) * (Math.random() < 0.5 ? -1 : 1);
  //16777215 is FFFFFF in hex. tostring(16) converts it to base16
  square.color = "#" + Math.floor(Math.random()*16777215).toString(16);
  square.index = squares.length;
  
  lastUpdate = Date.now();
  
  squares[square.index]= Object.assign({},square);
 
  socket.emit('index',square);

  
  socket.on('objUpdate', function(data) {
		squares = data;
  });
  //When we receive a 'movementUpdate' message from this client
  //The messages are also just strings. They can be anything you write (or one of the few hard-coded built-in ones)
  //"movementUpdate" is one that we have made up right now to handle updates in movement.
  //The "data" is what data we have received from the client. This is usually unpacked as json. It can also be arrays, binary, strings and more.
  socket.on('movementUpdate', function(data) {
    //grab ALL sockets in the room and emit the newly updated square to them. 
    //We are sending an "updatedMovement" message back to the user of our updated square
    //Remember io.sockets.in sends a message to EVERYONE in the room vs broadcast which sends to everyone EXCEPT this user. 
	
	
	step();
	io.sockets.in('room1').emit('update', squares); 
  });
  
  //When the user disconnects, remove them from the room (since they are no longer here)
  //The socket is maintained for a bit in case they reconnect, but we do want to remove them from the room
  //Since they are currently disconnected.
  socket.on('disconnect', function(data) {
    socket.leave('room1');
  });
});

function step()
{
	var now = Date.now();
	var dt = (now - lastUpdate);
	//console.log(dt);
	lastUpdate = now;
	// schedule a call to step()
	
	//setinterval(step, 200);
	
	//window.requestanimationframe(step);
	
	squares.forEach(function(element,index,array)
	{
		//console.log();
		element.x += element.xSpd * dt/20;
		element.y += element.ySpd * dt/20;
		if(element.x<0)
		{
			element.x =0;
			element.xSpd *=-1;
		}
		if(element.x>400)
		{
			element.x =400;
			element.xSpd *=-1;
		}
		if(element.y<0)
		{
			element.y =0;
			element.ySpd *=-1;
		}
		if(element.y>400)
		{
			element.y =400;
			element.ySpd *=-1;
		}
	});
 }
//step();
console.log("listening on port " + PORT);