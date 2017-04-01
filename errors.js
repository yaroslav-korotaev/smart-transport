class SmartTransportError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
  
  toJSON() {
    return {
      code: this.code,
      message: this.message,
    };
  }
}

const e = {
  SmartTransportError,
  badmessage() {
    return new SmartTransportError('BADMESSAGE', 'bad message');
  },
  nohandler() {
    return new SmartTransportError('NOHANDLER', 'no handler registered for that request');
  },
  unexpectedresponse() {
    return new SmartTransportError('UNEXPECTEDRESPONSE', 'got response for no request');
  },
  detached() {
    return new SmartTransportError('DETACHED', 'transport detached');
  },
  closed() {
    return new SmartTransportError('CLOSED', 'transport closed');
  },
};

module.exports = e;
