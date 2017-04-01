const EventEmitter = require('events');
const e = require('./errors.js');

const commands = {
  request(data) {
    const handler = this.handlers.get(data.name);
    if (!handler)
      return this.sendResponseError(data.id, e.nohandler());
    handler(data.req, (err, res) => {
      if (err)
        return this.sendResponseError(data.id, err);
      this.sendResponseSuccess(data.id, res);
    });
  },
  response(data) {
    const callback = this.callbacks.get(data.id);
    if (!callback)
      return this.close(e.unexpectedresponse());
    this.callbacks.delete(data.id);
    if (data.error)
      return callback(new e.SmartTransportError(data.error.code, data.error.message));
    callback(null, data.res);
  },
};

class SmartTransport extends EventEmitter {
  constructor(transport) {
    super();
    
    this.onMessage = message => {
      if (message.cmd) {
        const handler = commands[message.cmd];
        if (handler) {
          if (!message.data || typeof message.data != 'object')
            return this.close(e.badmessage());
          return handler.call(this, message.data);
        }
        return this.emit('command', message.cmd, message.data, message.error);
      }
      this.emit('message', message);
    };
    this.onClose = err => {
      this.open = false;
      this.flush(err || e.closed());
      this.emit('close', err);
    };
    
    transport.on('message', this.onMessage);
    transport.on('close', this.onClose);
    this.transport = transport;
    this.open = true;
    this.counter = 0;
    this.callbacks = new Map();
    this.handlers = new Map();
  }
  
  detach() {
    const transport = this.transport;
    transport.removeListener('message', this.onMessage);
    transport.removeListener('close', this.onClose);
    this.transport = null;
    this.flush(e.detached());
    return transport;
  }
  
  send(message, callback) {
    this.transport.send(message, callback);
  }
  
  command(cmd, data, callback) {
    this.transport.send({ cmd, data }, callback);
  }
  
  sendResponseSuccess(id, res) {
    this.transport.send({
      cmd: 'response',
      data: { id, res },
    });
  }
  
  sendResponseError(id, err) {
    this.transport.send({
      cmd: 'response',
      data: { id, error: err },
    });
  }
  
  handle(name, handler) {
    this.handlers.set(name, handler);
  }
  
  request(name, req, callback) {
    if (!this.open)
      return callback(e.closed());
    const id = this.counter++;
    this.callbacks.set(id, callback);
    this.transport.send({
      cmd: 'request',
      data: { name, id, req },
    });
  }
  
  flush(err) {
    for (let callback of this.callbacks.values())
      callback(err);
    this.callbacks.clear();
  }
  
  close(err) {
    if (!this.open)
      return;
    this.open = false;
    this.flush(err || e.closed());
    this.transport.close(err);
  }
}

module.exports = SmartTransport;
