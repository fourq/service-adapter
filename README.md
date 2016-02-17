## Micro Service Adapter
[![NPM](https://nodei.co/npm/service-adapter.png?downloads=true&downloadRank=true&stars=true)](https://nodei.co/npm/service-adapter/)

[![Build Status](https://travis-ci.org/RTComm/service-adapter.svg?branch=master)](http://travis-ci.org/RTComm/service-adapter)

**Micro Service Adapter - stream transform protocol for node.js**

```sh
$ npm install service-adapter
```
```js
var adapter=require('service-adapter');
```
#### Socket adapter type
* `AaS` - Adapter as Server
* `AaC` - Adapter as Client

#### Diagram example
```
HTTP Server          DB Server
-----------          ---------
 AaC | AaC <----------> AaS
  ^                      ^
  |        Log Server    |
  |        ----------    |
  --------> AaS | AaC <---
```
A socket connection can `only` be made between two different socket adapter type, see the diagram above. You can use the same set of `functions` for different adapters.
```js
var functions = {
	func1:function(next, head, body, data){
		console.log('func1 call', arguments);
	},
	func2:function(next, head, body, data){
		console.log('func2 call', arguments);
	}
	// ... and so on
};
// pipe `AaS` into server socket stream `serverSocket`
require('net').createServer(function(serverSocket){
	var AaS = new adapter(functions);
	serverSocket.pipe(AaS).pipe(serverSocket);
}).listen('/tmp/AaS.sock');

// pipe `AaC` into client socket stream `clientSocket`
var AaC = new adapter(functions);
var clientSocket = require('net').connect('/tmp/AaS.sock', function(){
	clientSocket.pipe(AaC).pipe(clientSocket);
});
// the `AaS` is listening on unix socket `/tmp/AaS.sock` and `AaC` is connecting to it
```
#### Basic routing
Adapters can be use to create logic routing between internal app functions, without connecting to any socket. This way, you can split the code between multiple micro services (adapters) in the same application for individual maintenance and debugging.
```js
// object functions for adapter1
var fc1 = {
	test1:function(next, head, body, data){
		console.log('test1 call', arguments);
	}
};
// object functions for adapter2
var fc2 = {
	test2:function(next, head, body, data){
		console.log('test2 call', arguments);
		// `adapter1` is next on the pipe, after `adapter2`
		// call function `test1` from `adapter1`
		next('test1', head+' back');
	}
};
// adapters
var adapter1 = new adapter(fc1);
var adapter2 = new adapter(fc2);

// create the routing (data flow) logic
adapter1.pipe(adapter2).pipe(adapter1);

// call function `test2` from `adapter2`
adapter2.exec('test2', 'welcome');

// `adapter2` is next on the pipe, after `adapter1`
// call function `test2` from `adapter2`
adapter1.next('test2', 'welcome');
/*
Output two times:
------
test2 call { '0': [Function: bound ],
  '1': 'welcome',
  '2': undefined,
  '3': undefined }
test1 call { '0': [Function: bound ],
  '1': 'welcome back',
  '2': undefined,
  '3': undefined }

Because, `adapter2.exec` has the same effect as `adapter1.next` for the routing logic created
*/
```
##### Adapter constructor `new adapter (functions, options)`
* `functions` - Object functions list
* `options` - Object { `data`:Object, `error`:String }

##### Adapter prototype function
* `exec (func, head, body)` - call function `func` from this adapter
* `next (func, head, body)` - call function `func` from next adapter on the pipe

##### Function adapter `(next, head, body, data)`
* `next (func, head, body)` - call function `func` from next adapter on the pipe
* `head` - Object
* `body` - Buffer
* `data` - Object data `adapter.data`

The adapter emit, by default, the event named `err` for errors, to ensure the data flow (non-blocking state). For blocking state (no data flow), name it `error` on constructor options `{error:'error'}`, or later `adapter.error='error'`.
```js
new adapter(functions, {data:'obj', error:'err'}).
// custom error `err` event, non-blocking mode
on('err', function(e){ console.log('adapter onErr', e); }).
// standard error event, blocking mode
on('error', function(e){ console.log('adapter onError', e); });
```

**For more informations consult or run the <a href="https://github.com/RTComm/service-adapter/blob/master/test.js"><b>test.js</b></a> file.**

--------------------------------------------------------
**Micro Service Adapter** is licensed under the MIT license. See the included `LICENSE` file for more details.