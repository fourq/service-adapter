/* Copyright (c) 2016 Micro Service Adapter - Tanase Laurentiu Iulian - https://github.com/RTComm/service-adapter */

'use strict';

var fs=require('fs'),
inherits=require('util').inherits,
Transform=require('stream').Transform;

inherits(adapter,Transform);
function adapter(functions,options){
	if(!(this instanceof adapter)){return new adapter(functions,options);}
	Transform.call(this);//,options
	this._b=0;// private, body length
	this._h=null;// private, header object
	this._x=new Buffer(0);// private, empty buffer
	this._c=this._x;// private, cache buffer
	this._f=functions;// private, functions object
	this._s=new Buffer('\n');// private, separator
	this.data=typeof options==='object'&&'data' in options?options.data:undefined;// public, extra data pass
	this.error=typeof options==='object'&&'error' in options?options.error.toString():'err';// public, error event name
	this.isOpen=true;// public (read-only), connection status
}

adapter.prototype._callback=function(f,header,body){
	//console.log('push',this.isOpen,f,header,body);
	if(this.isOpen){
		if(typeof f==='string'){
			// only one push, do not split data !
			if(body===undefined||body===null){
				this.push(Buffer.concat([new Buffer(JSON.stringify({f:f,h:header})),this._s]));
			}else{
				if(!Buffer.isBuffer(body)){body=new Buffer(typeof body==='string'?body:body.toString());}
				this.push(Buffer.concat([new Buffer(JSON.stringify({f:f,h:header,b:body.length})),this._s,body]));
			}
		}else{this.emit(this.error,new Error('invalid callback function name [ '+typeof f+' ]'));}
	}else{this.emit(this.error,new Error('callback after end'));}
};

adapter.prototype._send=function(header,body){
	try{
		if(!('f' in header)){throw new Error('function call name not found');}
		if(!(header.f in this._f)){throw new Error('invalid function call name [ '+header.f+' ]');}
		this._f[header.f](this._callback.bind(this),header.h,body,this.data);
	}catch(e){// got error
		this.emit(this.error,e);
	}
	return false;
};

adapter.prototype._transform=function(data,enc,cb){
	var c=true;// default, run cb()
	//console.log('_transform',data.toString());
	if(this._b===0){// header
		var l=this._c.length;
		this._c=Buffer.concat([this._c,data]);// append data to chache
		var index=this._c.indexOf(this._s,l>0?l-1:0);// search for separator, move pointer one byte (separator length) back
		if(index!==-1){// separator is found
			var left=this._c.slice(index+1),i=left.length;// extra bytes
			try{
				//console.log('parse',this._c.slice(0,index).toString());
				var header=JSON.parse(this._c.slice(0,index).toString());// deserialize header
				if('b' in header){// body set
					if(header.b>i){// need more bytes, wait for next call
						// set init object values
						this._b=header.b;
						this._h=header;
						this._c=left;// set chache
						//console.log('NbytesB',i);
					}else{
						if(header.b===i){// got exact bytes
							//console.log('0bytesB',i);
							this._send(header,left);
							this._c=this._x;// no extra bytes, empty cache
						}else{// got extra bytes
							//console.log('XbytesB',i);
							c=this._send(header,left.slice(0,header.b));// no cb() run
							this._c=this._x;// set empty chache
							this._transform(left.slice(header.b),enc,cb);// parse extra bytes
						}
					}
				}else{// body is empty
					this._c=this._x;// set empty chache
					if(i===0){
						//console.log('0bytes-',i);
						this._send(header);
					}else{
						//console.log('Xbytes-',i);
						c=this._send(header);// no cb() run
						this._transform(left,enc,cb);// parse extra bytes
					}
				}
			}catch(e){// got error
				this.emit(this.error,e);
				//console.log('-bytesE',i);
				this._c=this._x;// set empty chache
				if(i>0){
					c=false;// no cb() run
					this._transform(left,enc,cb);// parse extra bytes
				}
			}
		}// else, need more bytes, wait for next call
	}else{// body
		var i=this._c.length+data.length;
		if(this._b>i){// need more bytes, wait for next call
			this._c=Buffer.concat([this._c,data]);// append data to chache
		}else{
			if(this._b===i){// got exact bytes
				this._send(this._h,Buffer.concat([this._c,data]));
				this._c=this._x;// no extra bytes, empty cache
				// reset init object values
				this._b=0;
				this._h=null;
			}else{// got extra bytes
				var l=this._b-this._c.length;
				c=this._send(this._h,Buffer.concat([this._c,data.slice(0,l)]));// no cb() run
				this._c=this._x;// set empty chache
				// reset init object values
				this._b=0;
				this._h=null;
				this._transform(data.slice(l),enc,cb);// parse extra bytes
			}
		}
	}
	if(c){cb();}
};

adapter.prototype._flush=function(cb){
	this.isOpen=false;
	//console.log('adapter _flush');
	cb();
};

module.exports=adapter;
