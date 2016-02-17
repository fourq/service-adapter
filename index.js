/* Copyright (c) 2016 Micro Service Adapter - Tanase Laurentiu Iulian - https://github.com/RTComm/service-adapter */

'use strict';

var inherits=require('util').inherits,Transform=require('stream').Transform;

inherits(adapter,Transform);
function adapter(functions,options){
	if(!(this instanceof adapter)){return new adapter(functions,options);}
	Transform.call(this);//,options
	this._b=0;// private, body length
	this._h=null;// private, head object
	this._x=new Buffer(0);// private, empty buffer
	this._c=this._x;// private, cache buffer
	this._f=functions;// private, functions object
	this._s=new Buffer('\n');// private, separator
	this.data=typeof options==='object'&&'data' in options?options.data:undefined;// public, extra data pass
	this.error=typeof options==='object'&&'error' in options?options.error.toString():'err';// public, error event name
	this.isOpen=true;// public (read-only), connection status
}

adapter.prototype.next=function(f,head,body){
	//console.log('push',this.isOpen,f,head,body);
	if(this.isOpen){
		if(typeof f==='string'){
			// only one push, do not split data !
			if(body===undefined||body===null){
				this.push(Buffer.concat([new Buffer(JSON.stringify({f:f,h:head})),this._s]));
			}else{
				if(!Buffer.isBuffer(body)){body=new Buffer(typeof body==='string'?body:body.toString());}
				this.push(Buffer.concat([new Buffer(JSON.stringify({f:f,h:head,b:body.length})),this._s,body]));
			}
		}else{this.emit(this.error,new Error('next() invalid function name'));}
	}else{this.emit(this.error,new Error('next() after end'));}
};
adapter.prototype._callback=adapter.prototype.next;// deprecate

adapter.prototype._send=function(head,body){
	try{
		if(!('f' in head)){throw new Error('_send() function not found');}
		if(!(head.f in this._f)){throw new Error('_send() invalid function name [ '+head.f+' ]');}
		this._f[head.f](this.next.bind(this),head.h,body,this.data);
	}catch(e){// got error
		this.emit(this.error,e);
	}
	return false;
};
adapter.prototype.exec=function(f,head,body){
	if(typeof f==='string'){
		if(f in this._f){
			this._f[f](this.next.bind(this),head,body,this.data);
		}else{this.emit(this.error,new Error('exec() invalid function name [ '+f+' ]'));}
	}else{this.emit(this.error,new Error('exec() function not found'));}
};

adapter.prototype._transform=function(data,enc,cb){
	var c=true;// default, run cb()
	//console.log('_transform',data.toString());
	if(this._b===0){// head
		var l=this._c.length;
		this._c=Buffer.concat([this._c,data]);// append data to cache
		var index=this._c.indexOf(this._s,l>0?l-1:0);// search for separator, move pointer one byte (separator length) back
		if(index!==-1){// separator is found
			var left=this._c.slice(index+1),i=left.length;// extra bytes
			try{
				//console.log('parse',this._c.slice(0,index).toString());
				var head=JSON.parse(this._c.slice(0,index).toString());// deserialize head
				if('b' in head){// body set
					if(head.b>i){// need more bytes, wait for next call
						// set init object values
						this._b=head.b;
						this._h=head;
						this._c=left;// set cache
						//console.log('NbytesB',i);
					}else{
						if(head.b===i){// got exact bytes
							//console.log('0bytesB',i);
							this._send(head,left);
							this._c=this._x;// no extra bytes, empty cache
						}else{// got extra bytes
							//console.log('XbytesB',i);
							c=this._send(head,left.slice(0,head.b));// no cb() run
							this._c=this._x;// set empty cache
							this._transform(left.slice(head.b),enc,cb);// parse extra bytes
						}
					}
				}else{// body is empty
					this._c=this._x;// set empty cache
					if(i===0){
						//console.log('0bytes-',i);
						this._send(head);
					}else{
						//console.log('Xbytes-',i);
						c=this._send(head);// no cb() run
						this._transform(left,enc,cb);// parse extra bytes
					}
				}
			}catch(e){// got error
				this.emit(this.error,e);
				//console.log('-bytesE',i);
				this._c=this._x;// set empty cache
				if(i>0){
					c=false;// no cb() run
					this._transform(left,enc,cb);// parse extra bytes
				}
			}
		}// else, need more bytes, wait for next call
	}else{// body
		var i=this._c.length+data.length;
		if(this._b>i){// need more bytes, wait for next call
			this._c=Buffer.concat([this._c,data]);// append data to cache
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
				this._c=this._x;// set empty cache
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
