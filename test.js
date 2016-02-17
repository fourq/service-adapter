'use strict';

var adapter=require('./index.js');

/*
var inherits=require('util').inherits,Readable=require('stream').Readable;

inherits(readStream,Readable);
function readStream(){
	Readable.call(this);
	this.i=0;
	//this.a=['{','"','f','"',':','"','t','"','}','\n'];
	this.a=['{."f":"t"}\n{"f"',':"t","b":3}\n0','12{"f":"t"}\n'];
}
readStream.prototype._read=function(){
	this.push(this.i<this.a.length?this.a[this.i]:null);
	this.i++;
};

var fc={
	t:function(){console.log('t',arguments);}
};

new readStream().
	on('data',function(data){console.log('read onData',data);}).
	on('end',function(){console.log('read onEnd',this.i-1);}).
	pipe(new adapter(fc,{data:'obj',error:'err'})).//,{end:false}
		on('err',function(e){console.log('adapter onErr',e);}).
		on('error',function(e){console.log('adapter onError',e);}).
		on('finish',function(){console.log('adapter onFinish');}).
		on('end',function(){console.log('adapter onEnd');});
*/


var fc1 = {
	test1:function(next, head, body, data){
		console.log('test1 call', arguments);
	}
};
var fc2 = {
	test2:function(next, head, body, data){
		console.log('test2 call', arguments);
		next('test1', head+' back');
	}
};
var adapter1 = new adapter(fc1);
var adapter2 = new adapter(fc2);

adapter1.pipe(adapter2).pipe(adapter1);

adapter2.exec('test2', 'welcome');
adapter1.next('test2', 'welcome');

/*
var sock='/tmp/db.sock',fs=require('fs');
try{
	var stats=fs.lstatSync(sock);
	if(stats&&stats.isSocket()){fs.unlinkSync(sock);}
}catch(e){}

// pipe `adapter1` into server socket stream `serverSocket`
require('net').createServer(function(serverSocket){
	console.log('s onConnect');
	serverSocket.pipe(adapter1).pipe(serverSocket);
	//adapter1.next('test2','welcome');
}).listen(sock);

// pipe `adapter2` into client socket stream `clientSocket`
var clientSocket=require('net').connect(sock,function(){
	console.log('c onConnect');
	clientSocket.pipe(adapter2).pipe(clientSocket);
	startHttpServer(adapter2);
});

function startHttpServer(adapter2){
	require('http').createServer(function(req,res){
		console.log('http client connect');
		adapter2.data=res;
		adapter2.next('test1','ping');
	}).listen(80,'192.168.56.101');
}
*/