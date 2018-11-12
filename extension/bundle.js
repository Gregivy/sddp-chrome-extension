(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
var simpleDDP = require("simpleddp").default;

},{"simpleddp":9}],2:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _get = function get(object, property, receiver) { if (object === null) object = Function.prototype; var desc = Object.getOwnPropertyDescriptor(object, property); if (desc === undefined) { var parent = Object.getPrototypeOf(object); if (parent === null) { return undefined; } else { return get(parent, property, receiver); } } else if ("value" in desc) { return desc.value; } else { var getter = desc.get; if (getter === undefined) { return undefined; } return getter.call(receiver); } };

var _wolfy87Eventemitter = require("wolfy87-eventemitter");

var _wolfy87Eventemitter2 = _interopRequireDefault(_wolfy87Eventemitter);

var _queue = require("./queue");

var _queue2 = _interopRequireDefault(_queue);

var _socket = require("./socket");

var _socket2 = _interopRequireDefault(_socket);

var _utils = require("./utils");

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var DDP_VERSION = "1";
var PUBLIC_EVENTS = [
// Subscription messages
"ready", "nosub", "added", "changed", "removed",
// Method messages
"result", "updated",
// Error messages
"error"];
var DEFAULT_RECONNECT_INTERVAL = 10000;

var DDP = function (_EventEmitter) {
    _inherits(DDP, _EventEmitter);

    _createClass(DDP, [{
        key: "emit",
        value: function emit() {
            var _get2;

            setTimeout((_get2 = _get(DDP.prototype.__proto__ || Object.getPrototypeOf(DDP.prototype), "emit", this)).bind.apply(_get2, [this].concat(Array.prototype.slice.call(arguments))), 0);
        }
    }]);

    function DDP(options) {
        _classCallCheck(this, DDP);

        var _this = _possibleConstructorReturn(this, (DDP.__proto__ || Object.getPrototypeOf(DDP)).call(this));

        _this.status = "disconnected";

        // Default `autoConnect` and `autoReconnect` to true
        _this.autoConnect = options.autoConnect !== false;
        _this.autoReconnect = options.autoReconnect !== false;
        _this.reconnectInterval = options.reconnectInterval || DEFAULT_RECONNECT_INTERVAL;

        _this.messageQueue = new _queue2.default(function (message) {
            if (_this.status === "connected") {
                _this.socket.send(message);
                return true;
            } else {
                return false;
            }
        });

        _this.socket = new _socket2.default(options.SocketConstructor, options.endpoint);

        _this.socket.on("open", function () {
            // When the socket opens, send the `connect` message
            // to establish the DDP connection
            _this.socket.send({
                msg: "connect",
                version: DDP_VERSION,
                support: [DDP_VERSION]
            });
        });

        _this.socket.on("close", function () {
            _this.status = "disconnected";
            _this.messageQueue.empty();
            _this.emit("disconnected");
            if (_this.autoReconnect) {
                // Schedule a reconnection
                setTimeout(_this.socket.open.bind(_this.socket), _this.reconnectInterval);
            }
        });

        _this.socket.on("message:in", function (message) {
            if (message.msg === "connected") {
                _this.status = "connected";
                _this.messageQueue.process();
                _this.emit("connected");
            } else if (message.msg === "ping") {
                // Reply with a `pong` message to prevent the server from
                // closing the connection
                _this.socket.send({ msg: "pong", id: message.id });
            } else if ((0, _utils.contains)(PUBLIC_EVENTS, message.msg)) {
                _this.emit(message.msg, message);
            }
        });

        if (_this.autoConnect) {
            _this.connect();
        }

        return _this;
    }

    _createClass(DDP, [{
        key: "connect",
        value: function connect() {
            this.socket.open();
        }
    }, {
        key: "disconnect",
        value: function disconnect() {
            /*
            *   If `disconnect` is called, the caller likely doesn't want the
            *   the instance to try to auto-reconnect. Therefore we set the
            *   `autoReconnect` flag to false.
            */
            this.autoReconnect = false;
            this.socket.close();
        }
    }, {
        key: "method",
        value: function method(name, params) {
            var id = (0, _utils.uniqueId)();
            this.messageQueue.push({
                msg: "method",
                id: id,
                method: name,
                params: params
            });
            return id;
        }
    }, {
        key: "sub",
        value: function sub(name, params) {
            var id = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : null;

            id || (id = (0, _utils.uniqueId)());
            this.messageQueue.push({
                msg: "sub",
                id: id,
                name: name,
                params: params
            });
            return id;
        }
    }, {
        key: "unsub",
        value: function unsub(id) {
            this.messageQueue.push({
                msg: "unsub",
                id: id
            });
            return id;
        }
    }]);

    return DDP;
}(_wolfy87Eventemitter2.default);

exports.default = DDP;
},{"./queue":3,"./socket":4,"./utils":5,"wolfy87-eventemitter":10}],3:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Queue = function () {

    /*
    *   As the name implies, `consumer` is the (sole) consumer of the queue.
    *   It gets called with each element of the queue and its return value
    *   serves as a ack, determining whether the element is removed or not from
    *   the queue, allowing then subsequent elements to be processed.
    */

    function Queue(consumer) {
        _classCallCheck(this, Queue);

        this.consumer = consumer;
        this.queue = [];
    }

    _createClass(Queue, [{
        key: "push",
        value: function push(element) {
            this.queue.push(element);
            this.process();
        }
    }, {
        key: "process",
        value: function process() {
            if (this.queue.length !== 0) {
                var ack = this.consumer(this.queue[0]);
                if (ack) {
                    this.queue.shift();
                    this.process();
                }
            }
        }
    }, {
        key: "empty",
        value: function empty() {
            this.queue = [];
        }
    }]);

    return Queue;
}();

exports.default = Queue;
},{}],4:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _wolfy87Eventemitter = require("wolfy87-eventemitter");

var _wolfy87Eventemitter2 = _interopRequireDefault(_wolfy87Eventemitter);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var Socket = function (_EventEmitter) {
    _inherits(Socket, _EventEmitter);

    function Socket(SocketConstructor, endpoint) {
        _classCallCheck(this, Socket);

        var _this = _possibleConstructorReturn(this, (Socket.__proto__ || Object.getPrototypeOf(Socket)).call(this));

        _this.SocketConstructor = SocketConstructor;
        _this.endpoint = endpoint;
        _this.rawSocket = null;
        return _this;
    }

    _createClass(Socket, [{
        key: "send",
        value: function send(object) {
            var message = JSON.stringify(object);
            this.rawSocket.send(message);
            // Emit a copy of the object, as the listener might mutate it.
            this.emit("message:out", JSON.parse(message));
        }
    }, {
        key: "open",
        value: function open() {
            var _this2 = this;

            /*
            *   Makes `open` a no-op if there's already a `rawSocket`. This avoids
            *   memory / socket leaks if `open` is called twice (e.g. by a user
            *   calling `ddp.connect` twice) without properly disposing of the
            *   socket connection. `rawSocket` gets automatically set to `null` only
            *   when it goes into a closed or error state. This way `rawSocket` is
            *   disposed of correctly: the socket connection is closed, and the
            *   object can be garbage collected.
            */
            if (this.rawSocket) {
                return;
            }
            this.rawSocket = new this.SocketConstructor(this.endpoint);

            /*
            *   Calls to `onopen` and `onclose` directly trigger the `open` and
            *   `close` events on the `Socket` instance.
            */
            this.rawSocket.onopen = function () {
                return _this2.emit("open");
            };
            this.rawSocket.onclose = function () {
                _this2.rawSocket = null;
                _this2.emit("close");
            };
            /*
            *   Calls to `onerror` trigger the `close` event on the `Socket`
            *   instance, and cause the `rawSocket` object to be disposed of.
            *   Since it's not clear what conditions could cause the error and if
            *   it's possible to recover from it, we prefer to always close the
            *   connection (if it isn't already) and dispose of the socket object.
            */
            this.rawSocket.onerror = function () {
                // It's not clear what the socket lifecycle is when errors occurr.
                // Hence, to avoid the `close` event to be emitted twice, before
                // manually closing the socket we de-register the `onclose`
                // callback.
                delete _this2.rawSocket.onclose;
                // Safe to perform even if the socket is already closed
                _this2.rawSocket.close();
                _this2.rawSocket = null;
                _this2.emit("close");
            };
            /*
            *   Calls to `onmessage` trigger a `message:in` event on the `Socket`
            *   instance only once the message (first parameter to `onmessage`) has
            *   been successfully parsed into a javascript object.
            */
            this.rawSocket.onmessage = function (message) {
                var object;
                try {
                    object = JSON.parse(message.data);
                } catch (ignore) {
                    // Simply ignore the malformed message and return
                    return;
                }
                // Outside the try-catch block as it must only catch JSON parsing
                // errors, not errors that may occur inside a "message:in" event
                // handler
                _this2.emit("message:in", object);
            };
        }
    }, {
        key: "close",
        value: function close() {
            /*
            *   Avoid throwing an error if `rawSocket === null`
            */
            if (this.rawSocket) {
                this.rawSocket.close();
            }
        }
    }]);

    return Socket;
}(_wolfy87Eventemitter2.default);

exports.default = Socket;
},{"wolfy87-eventemitter":10}],5:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
    value: true
});
exports.uniqueId = uniqueId;
exports.contains = contains;
var i = 0;
function uniqueId() {
    return (i++).toString();
}

function contains(array, element) {
    return array.indexOf(element) !== -1;
}
},{}],6:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.ddpSubscription = exports.ddpEventListener = exports.ddpOnChange = exports.ddpFilter = exports.ddpCollection = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _fullCopy = require('./fullCopy.js');

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var ddpCollection = exports.ddpCollection = function () {
  function ddpCollection(name, server) {
    _classCallCheck(this, ddpCollection);

    this.name = name;
    this.server = server;
  }

  _createClass(ddpCollection, [{
    key: 'filter',
    value: function filter(f) {
      return new ddpFilter(this, f);
    }
  }, {
    key: 'fetch',
    value: function fetch() {
      var c = this.server.collections[this.name];
      return c ? (0, _fullCopy.fullCopy)(c) : [];
    }
  }, {
    key: 'onChange',
    value: function onChange(f) {
      var obj = {
        collection: this.name,
        f: f
      };

      return new ddpOnChange(obj, this.server);
    }
  }]);

  return ddpCollection;
}();

var ddpFilter = exports.ddpFilter = function () {
  function ddpFilter(ddpCollectionInstance, f) {
    _classCallCheck(this, ddpFilter);

    this.server = ddpCollectionInstance.server;
    this.collection = ddpCollectionInstance.name;
    this.ddpCollectionFetch = function () {
      return ddpCollectionInstance.fetch.call(ddpCollectionInstance);
    };
    this.f = f;
  }

  _createClass(ddpFilter, [{
    key: 'fetch',
    value: function fetch() {
      return this.ddpCollectionFetch().filter(this.f);
    }
  }, {
    key: 'onChange',
    value: function onChange(f) {
      var obj = {
        collection: this.collection,
        filter: this.f,
        f: f
      };

      return new ddpOnChange(obj, this.server);
    }
  }]);

  return ddpFilter;
}();

var ddpOnChange = exports.ddpOnChange = function () {
  function ddpOnChange(obj, server) {
    _classCallCheck(this, ddpOnChange);

    this.obj = obj;
    this.server = server;
    this.isStopped = true;
    this.start();
  }

  _createClass(ddpOnChange, [{
    key: 'stop',
    value: function stop() {
      var i = this.server.onChangeFuncs.indexOf(this.obj);
      if (i > -1) {
        this.isStopped = true;
        this.server.onChangeFuncs.splice(i, 1);
      }
    }
  }, {
    key: 'start',
    value: function start() {
      if (this.isStopped) {
        this.server.onChangeFuncs.push(this.obj);
        this.isStopped = false;
      }
    }
  }]);

  return ddpOnChange;
}();

var ddpEventListener = exports.ddpEventListener = function () {
  function ddpEventListener(eventname, f, ddplink) {
    _classCallCheck(this, ddpEventListener);

    this.ddplink = ddplink;
    this.eventname = eventname;
    this.f = f;
    this.started = false;
    this.start();
  }

  _createClass(ddpEventListener, [{
    key: 'stop',
    value: function stop() {
      if (this.started) {
        this.ddplink.ddpConnection.removeListener(this.eventname, this.f);
        this.started = false;
      }
    }
  }, {
    key: 'start',
    value: function start() {
      if (!this.started) {
        this.ddplink.ddpConnection.on(this.eventname, this.f);
        this.started = true;
      }
    }
  }]);

  return ddpEventListener;
}();

var ddpSubscription = exports.ddpSubscription = function () {
  function ddpSubscription(subname, args, ddplink) {
    _classCallCheck(this, ddpSubscription);

    this.ddplink = ddplink;
    this.subname = subname;
    this.args = args;
    this.started = false;
    this._ready = false;
    this.start();
  }

  _createClass(ddpSubscription, [{
    key: 'onReady',
    value: function onReady(f) {
      var _this = this;

      if (this.isReady()) {
        f();
      } else {
        var onReady = this.ddplink.on('ready', function (m) {
          if (m.subs.includes(_this.subid)) {
            _this._ready = true;
            onReady.stop();
            f();
          }
        });
        return onReady;
      }
    }
  }, {
    key: 'isReady',
    value: function isReady() {
      return this._ready;
    }
  }, {
    key: 'ready',
    value: function ready() {
      var _this2 = this;

      return new Promise(function (resolve, reject) {
        if (_this2.isReady()) {
          resolve();
        } else {
          var onReady = _this2.ddplink.on('ready', function (m) {
            if (m.subs.includes(_this2.subid)) {
              _this2._ready = true;
              onReady.stop();
              resolve();
            }
          });
        }
      });
    }
  }, {
    key: 'isOn',
    value: function isOn() {
      return this.started;
    }
  }, {
    key: 'remove',
    value: function remove() {
      if (this.started) this.stop();
      this.ddplink.removeSub(this);
    }
  }, {
    key: 'stop',
    value: function stop() {
      if (this.started) {
        this.ddplink.ddpConnection.unsub(this.subid);
        this.started = false;
        this._ready = false;
      }
    }
  }, {
    key: 'start',
    value: function start() {
      if (!this.started) {
        this.subid = this.ddplink.ddpConnection.sub(this.subname, this.args);
        this.started = true;
      }
    }
  }]);

  return ddpSubscription;
}();
},{"./fullCopy.js":7}],7:[function(require,module,exports){
"use strict";

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _typeof = typeof Symbol === "function" && typeof Symbol.iterator === "symbol" ? function (obj) { return typeof obj; } : function (obj) { return obj && typeof Symbol === "function" && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; };

var fullCopy = exports.fullCopy = function fullCopy(o) {
  var output, v, key;
  output = Array.isArray(o) ? [] : {};
  for (key in o) {
    v = o[key];
    output[key] = (typeof v === "undefined" ? "undefined" : _typeof(v)) === "object" && v !== null ? fullCopy(v) : v;
  }
  return output;
};
},{}],8:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});
var isEqual = exports.isEqual = function isEqual(value, other) {

	// Get the value type
	var type = Object.prototype.toString.call(value);

	// If the two objects are not the same type, return false
	if (type !== Object.prototype.toString.call(other)) return false;

	// If items are not an object or array, return false
	if (['[object Array]', '[object Object]'].indexOf(type) < 0) return false;

	// Compare the length of the length of the two items
	var valueLen = type === '[object Array]' ? value.length : Object.keys(value).length;
	var otherLen = type === '[object Array]' ? other.length : Object.keys(other).length;
	if (valueLen !== otherLen) return false;

	// Compare two items
	var compare = function compare(item1, item2) {

		// Get the object type
		var itemType = Object.prototype.toString.call(item1);

		// If an object or array, compare recursively
		if (['[object Array]', '[object Object]'].indexOf(itemType) >= 0) {
			if (!isEqual(item1, item2)) return false;
		}

		// Otherwise, do a simple comparison
		else {

				// If the two items are not the same type, return false
				if (itemType !== Object.prototype.toString.call(item2)) return false;

				// Else if it's a function, convert to a string and compare
				// Otherwise, just compare
				if (itemType === '[object Function]') {
					if (item1.toString() !== item2.toString()) return false;
				} else {
					if (item1 !== item2) return false;
				}
			}
	};

	// Compare properties
	if (type === '[object Array]') {
		for (var i = 0; i < valueLen; i++) {
			if (compare(value[i], other[i]) === false) return false;
		}
	} else {
		for (var key in value) {
			if (value.hasOwnProperty(key)) {
				if (compare(value[key], other[key]) === false) return false;
			}
		}
	}

	// If nothing failed, return true
	return true;
};
},{}],9:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, "__esModule", {
	value: true
});

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _ddp = require('ddp.js');

var _ddp2 = _interopRequireDefault(_ddp);

var _isequal = require('./isequal.js');

var _fullCopy = require('./fullCopy.js');

var _ddpclasses = require('./ddpclasses.js');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var simpleDDP = function () {
	function simpleDDP(opts, plugins) {
		var _this = this;

		_classCallCheck(this, simpleDDP);

		this._opts = opts;
		this.ddpConnection = new _ddp2.default(opts);
		this.subs = [];
		this.collections = {};
		this.onChangeFuncs = [];
		this.connected = false;
		this.tryingToConnect = opts.autoConnect === undefined ? true : opts.autoConnect;
		this.tryingToDisconnect = false;
		this.willTryToReconnect = opts.autoReconnect === undefined ? true : opts.autoReconnect;

		this.connectedEvent = this.on('connected', function (m) {
			_this.connected = true;
			_this.tryingToConnect = false;
		});

		this.disconnectedEvent = this.on('disconnected', function (m) {
			_this.connected = false;
			_this.tryingToDisconnect = false;
			_this.tryingToConnect = _this.willTryToReconnect;
		});

		this.readyEvent = this.on('ready', function (m) {
			_this.subs.forEach(function (sub) {
				if (m.subs.includes(sub)) {
					sub._ready = true;
				}
			});
		});

		this.addedEvent = this.on('added', function (m) {
			return _this.dispatchAdded(m);
		});
		this.changedEvent = this.on('changed', function (m) {
			return _this.dispatchChanged(m);
		});
		this.removedEvent = this.on('removed', function (m) {
			return _this.dispatchRemoved(m);
		});

		if (Array.isArray(plugins)) {
			plugins.forEach(function (p) {
				if (p.init) {
					p.init.call(_this);
				}
			});
		}
	}

	_createClass(simpleDDP, [{
		key: 'collection',
		value: function collection(name) {
			return new _ddpclasses.ddpCollection(name, this);
		}
	}, {
		key: 'dispatchAdded',
		value: function dispatchAdded(m) {
			var _this2 = this;

			if (!this.collections.hasOwnProperty(m.collection)) this.collections[m.collection] = [];
			var newObj = Object.assign({ id: m.id }, m.fields);
			var i = this.collections[m.collection].push(newObj);
			var fields = {};
			if (m.fields) {
				Object.keys(m.fields).map(function (p) {
					fields[p] = 1;
				});
			}
			this.onChangeFuncs.forEach(function (l) {
				if (l.collection == m.collection) {
					var hasFilter = l.hasOwnProperty('filter');
					var newObjFullCopy = (0, _fullCopy.fullCopy)(newObj);
					if (!hasFilter) {
						l.f({ changed: false, added: newObjFullCopy, removed: false });
					} else if (hasFilter && l.filter(newObjFullCopy, i - 1, _this2.collections[m.collection])) {
						l.f({ prev: false, next: newObjFullCopy, fields: fields, fieldsChanged: newObjFullCopy, fieldsRemoved: [] });
					}
				}
			});
		}
	}, {
		key: 'dispatchChanged',
		value: function dispatchChanged(m) {
			var _this3 = this;

			var i = this.collections[m.collection].findIndex(function (obj) {
				return obj.id == m.id;
			});
			if (i > -1) {
				var prev = (0, _fullCopy.fullCopy)(this.collections[m.collection][i]);
				var fields = {},
				    fieldsChanged = {},
				    fieldsRemoved = [];
				if (m.fields) {
					fieldsChanged = m.fields;
					Object.keys(m.fields).map(function (p) {
						fields[p] = 1;
					});
					Object.assign(this.collections[m.collection][i], m.fields);
				}
				if (m.cleared) {
					fieldsRemoved = m.cleared;
					m.cleared.forEach(function (fieldName) {
						fields[fieldName] = 0;
						delete _this3.collections[m.collection][i][fieldName];
					});
				}
				var next = this.collections[m.collection][i];
				this.onChangeFuncs.forEach(function (l) {
					if (l.collection == m.collection) {
						var hasFilter = l.hasOwnProperty('filter');
						if (!hasFilter) {
							l.f({ changed: { prev: prev, next: (0, _fullCopy.fullCopy)(next), fields: fields, fieldsChanged: fieldsChanged, fieldsRemoved: fieldsRemoved }, added: false, removed: false });
						} else {
							var fCopyNext = (0, _fullCopy.fullCopy)(next);
							var prevFilter = l.filter(prev, i, _this3.collections[m.collection]);
							var nextFilter = l.filter(fCopyNext, i, _this3.collections[m.collection]);
							if (prevFilter || nextFilter) {
								l.f({ prev: prev, next: fCopyNext, fields: fields, fieldsChanged: fieldsChanged, fieldsRemoved: fieldsRemoved, predicatePassed: [prevFilter, nextFilter] });
							}
						}
					}
				});
			} else {
				this.dispatchAdded(m);
			}
		}
	}, {
		key: 'dispatchRemoved',
		value: function dispatchRemoved(m) {
			var _this4 = this;

			var i = this.collections[m.collection].findIndex(function (obj) {
				return obj.id == m.id;
			});
			if (i > -1) {
				var prevProps = void 0;
				var removedObj = this.collections[m.collection].splice(i, 1)[0];
				this.onChangeFuncs.forEach(function (l) {
					if (l.collection == m.collection) {
						var hasFilter = l.hasOwnProperty('filter');
						if (!hasFilter) {
							l.f({ changed: false, added: false, removed: removedObj });
						} else {
							if (l.filter(removedObj, i, _this4.collections[m.collection])) {
								l.f({ prev: removedObj, next: false });
							}
						}
					}
				});
			}
		}
	}, {
		key: 'connect',
		value: function connect() {
			var _this5 = this;

			this.willTryToReconnect = this._opts.autoReconnect === undefined ? true : this._opts.autoReconnect;
			return new Promise(function (resolve, reject) {
				if (!_this5.tryingToConnect) {
					_this5.ddpConnection.connect();
					_this5.tryingToConnect = true;
				}
				if (!_this5.connected) {
					var connectionHandler = _this5.on('connected', function () {
						connectionHandler.stop();
						_this5.tryingToConnect = false;
						resolve();
					});
				} else {
					resolve();
				}
			});
		}
	}, {
		key: 'disconnect',
		value: function disconnect() {
			var _this6 = this;

			this.willTryToReconnect = false;
			return new Promise(function (resolve, reject) {
				if (!_this6.tryingToDisconnect) {
					_this6.ddpConnection.disconnect();
					_this6.tryingToDisconnect = true;
				}
				if (_this6.connected) {
					var connectionHandler = _this6.on('disconnected', function () {
						connectionHandler.stop();
						_this6.tryingToDisconnect = false;
						resolve();
					});
				} else {
					resolve();
				}
			});
		}
	}, {
		key: 'call',
		value: function call(method, args) {
			var _this7 = this;

			return new Promise(function (resolve, reject) {
				var methodId = _this7.ddpConnection.method(method, args ? args : []);
				var _self = _this7;
				_this7.ddpConnection.on("result", function onMethodResult(message) {
					if (message.id == methodId) {
						if (!message.error) {
							resolve(message.result);
						} else {
							reject(message.error);
						}
						_self.ddpConnection.removeListener('result', onMethodResult);
					}
				});
			});
		}
	}, {
		key: 'sub',
		value: function sub(subname, args) {
			var hasSuchSub = this.subs.find(function (sub) {
				return sub.subname == subname && (0, _isequal.isEqual)(sub.args, args ? args : []);
			});
			if (!hasSuchSub) {
				var i = this.subs.push(new _ddpclasses.ddpSubscription(subname, args ? args : [], this));
				return this.subs[i - 1];
			} else {
				return hasSuchSub;
			}
		}
	}, {
		key: 'removeSub',
		value: function removeSub(subobj) {
			var i = this.subs.indexOf(subobj);
			if (i > -1) {
				subobj.stop();
				this.subs.splice(i, 1);
			}
		}
	}, {
		key: 'on',
		value: function on(event, f) {
			return new _ddpclasses.ddpEventListener(event, f, this);
		}
	}, {
		key: 'stopChangeListeners',
		value: function stopChangeListeners() {
			this.onChangeFuncs = [];
		}
	}]);

	return simpleDDP;
}();

exports.default = simpleDDP;
},{"./ddpclasses.js":6,"./fullCopy.js":7,"./isequal.js":8,"ddp.js":2}],10:[function(require,module,exports){
/*!
 * EventEmitter v5.2.5 - git.io/ee
 * Unlicense - http://unlicense.org/
 * Oliver Caldwell - http://oli.me.uk/
 * @preserve
 */

;(function (exports) {
    'use strict';

    /**
     * Class for managing events.
     * Can be extended to provide event functionality in other classes.
     *
     * @class EventEmitter Manages event registering and emitting.
     */
    function EventEmitter() {}

    // Shortcuts to improve speed and size
    var proto = EventEmitter.prototype;
    var originalGlobalValue = exports.EventEmitter;

    /**
     * Finds the index of the listener for the event in its storage array.
     *
     * @param {Function[]} listeners Array of listeners to search through.
     * @param {Function} listener Method to look for.
     * @return {Number} Index of the specified listener, -1 if not found
     * @api private
     */
    function indexOfListener(listeners, listener) {
        var i = listeners.length;
        while (i--) {
            if (listeners[i].listener === listener) {
                return i;
            }
        }

        return -1;
    }

    /**
     * Alias a method while keeping the context correct, to allow for overwriting of target method.
     *
     * @param {String} name The name of the target method.
     * @return {Function} The aliased method
     * @api private
     */
    function alias(name) {
        return function aliasClosure() {
            return this[name].apply(this, arguments);
        };
    }

    /**
     * Returns the listener array for the specified event.
     * Will initialise the event object and listener arrays if required.
     * Will return an object if you use a regex search. The object contains keys for each matched event. So /ba[rz]/ might return an object containing bar and baz. But only if you have either defined them with defineEvent or added some listeners to them.
     * Each property in the object response is an array of listener functions.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Function[]|Object} All listener functions for the event.
     */
    proto.getListeners = function getListeners(evt) {
        var events = this._getEvents();
        var response;
        var key;

        // Return a concatenated array of all matching events if
        // the selector is a regular expression.
        if (evt instanceof RegExp) {
            response = {};
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    response[key] = events[key];
                }
            }
        }
        else {
            response = events[evt] || (events[evt] = []);
        }

        return response;
    };

    /**
     * Takes a list of listener objects and flattens it into a list of listener functions.
     *
     * @param {Object[]} listeners Raw listener objects.
     * @return {Function[]} Just the listener functions.
     */
    proto.flattenListeners = function flattenListeners(listeners) {
        var flatListeners = [];
        var i;

        for (i = 0; i < listeners.length; i += 1) {
            flatListeners.push(listeners[i].listener);
        }

        return flatListeners;
    };

    /**
     * Fetches the requested listeners via getListeners but will always return the results inside an object. This is mainly for internal use but others may find it useful.
     *
     * @param {String|RegExp} evt Name of the event to return the listeners from.
     * @return {Object} All listener functions for an event in an object.
     */
    proto.getListenersAsObject = function getListenersAsObject(evt) {
        var listeners = this.getListeners(evt);
        var response;

        if (listeners instanceof Array) {
            response = {};
            response[evt] = listeners;
        }

        return response || listeners;
    };

    function isValidListener (listener) {
        if (typeof listener === 'function' || listener instanceof RegExp) {
            return true
        } else if (listener && typeof listener === 'object') {
            return isValidListener(listener.listener)
        } else {
            return false
        }
    }

    /**
     * Adds a listener function to the specified event.
     * The listener will not be added if it is a duplicate.
     * If the listener returns true then it will be removed after it is called.
     * If you pass a regular expression as the event name then the listener will be added to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListener = function addListener(evt, listener) {
        if (!isValidListener(listener)) {
            throw new TypeError('listener must be a function');
        }

        var listeners = this.getListenersAsObject(evt);
        var listenerIsWrapped = typeof listener === 'object';
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key) && indexOfListener(listeners[key], listener) === -1) {
                listeners[key].push(listenerIsWrapped ? listener : {
                    listener: listener,
                    once: false
                });
            }
        }

        return this;
    };

    /**
     * Alias of addListener
     */
    proto.on = alias('addListener');

    /**
     * Semi-alias of addListener. It will add a listener that will be
     * automatically removed after its first execution.
     *
     * @param {String|RegExp} evt Name of the event to attach the listener to.
     * @param {Function} listener Method to be called when the event is emitted. If the function returns true then it will be removed after calling.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addOnceListener = function addOnceListener(evt, listener) {
        return this.addListener(evt, {
            listener: listener,
            once: true
        });
    };

    /**
     * Alias of addOnceListener.
     */
    proto.once = alias('addOnceListener');

    /**
     * Defines an event name. This is required if you want to use a regex to add a listener to multiple events at once. If you don't do this then how do you expect it to know what event to add to? Should it just add to every possible match for a regex? No. That is scary and bad.
     * You need to tell it what event names should be matched by a regex.
     *
     * @param {String} evt Name of the event to create.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvent = function defineEvent(evt) {
        this.getListeners(evt);
        return this;
    };

    /**
     * Uses defineEvent to define multiple events.
     *
     * @param {String[]} evts An array of event names to define.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.defineEvents = function defineEvents(evts) {
        for (var i = 0; i < evts.length; i += 1) {
            this.defineEvent(evts[i]);
        }
        return this;
    };

    /**
     * Removes a listener function from the specified event.
     * When passed a regular expression as the event name, it will remove the listener from all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to remove the listener from.
     * @param {Function} listener Method to remove from the event.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListener = function removeListener(evt, listener) {
        var listeners = this.getListenersAsObject(evt);
        var index;
        var key;

        for (key in listeners) {
            if (listeners.hasOwnProperty(key)) {
                index = indexOfListener(listeners[key], listener);

                if (index !== -1) {
                    listeners[key].splice(index, 1);
                }
            }
        }

        return this;
    };

    /**
     * Alias of removeListener
     */
    proto.off = alias('removeListener');

    /**
     * Adds listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can add to multiple events at once. The object should contain key value pairs of events and listeners or listener arrays. You can also pass it an event name and an array of listeners to be added.
     * You can also pass it a regular expression to add the array of listeners to all events that match it.
     * Yeah, this function does quite a bit. That's probably a bad thing.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add to multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.addListeners = function addListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(false, evt, listeners);
    };

    /**
     * Removes listeners in bulk using the manipulateListeners method.
     * If you pass an object as the first argument you can remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be removed.
     * You can also pass it a regular expression to remove the listeners from all events that match it.
     *
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeListeners = function removeListeners(evt, listeners) {
        // Pass through to manipulateListeners
        return this.manipulateListeners(true, evt, listeners);
    };

    /**
     * Edits listeners in bulk. The addListeners and removeListeners methods both use this to do their job. You should really use those instead, this is a little lower level.
     * The first argument will determine if the listeners are removed (true) or added (false).
     * If you pass an object as the second argument you can add/remove from multiple events at once. The object should contain key value pairs of events and listeners or listener arrays.
     * You can also pass it an event name and an array of listeners to be added/removed.
     * You can also pass it a regular expression to manipulate the listeners of all events that match it.
     *
     * @param {Boolean} remove True if you want to remove listeners, false if you want to add.
     * @param {String|Object|RegExp} evt An event name if you will pass an array of listeners next. An object if you wish to add/remove from multiple events at once.
     * @param {Function[]} [listeners] An optional array of listener functions to add/remove.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.manipulateListeners = function manipulateListeners(remove, evt, listeners) {
        var i;
        var value;
        var single = remove ? this.removeListener : this.addListener;
        var multiple = remove ? this.removeListeners : this.addListeners;

        // If evt is an object then pass each of its properties to this method
        if (typeof evt === 'object' && !(evt instanceof RegExp)) {
            for (i in evt) {
                if (evt.hasOwnProperty(i) && (value = evt[i])) {
                    // Pass the single listener straight through to the singular method
                    if (typeof value === 'function') {
                        single.call(this, i, value);
                    }
                    else {
                        // Otherwise pass back to the multiple function
                        multiple.call(this, i, value);
                    }
                }
            }
        }
        else {
            // So evt must be a string
            // And listeners must be an array of listeners
            // Loop over it and pass each one to the multiple method
            i = listeners.length;
            while (i--) {
                single.call(this, evt, listeners[i]);
            }
        }

        return this;
    };

    /**
     * Removes all listeners from a specified event.
     * If you do not specify an event then all listeners will be removed.
     * That means every event will be emptied.
     * You can also pass a regex to remove all events that match it.
     *
     * @param {String|RegExp} [evt] Optional name of the event to remove all listeners for. Will remove from every event if not passed.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.removeEvent = function removeEvent(evt) {
        var type = typeof evt;
        var events = this._getEvents();
        var key;

        // Remove different things depending on the state of evt
        if (type === 'string') {
            // Remove all listeners for the specified event
            delete events[evt];
        }
        else if (evt instanceof RegExp) {
            // Remove all events matching the regex.
            for (key in events) {
                if (events.hasOwnProperty(key) && evt.test(key)) {
                    delete events[key];
                }
            }
        }
        else {
            // Remove all listeners in all events
            delete this._events;
        }

        return this;
    };

    /**
     * Alias of removeEvent.
     *
     * Added to mirror the node API.
     */
    proto.removeAllListeners = alias('removeEvent');

    /**
     * Emits an event of your choice.
     * When emitted, every listener attached to that event will be executed.
     * If you pass the optional argument array then those arguments will be passed to every listener upon execution.
     * Because it uses `apply`, your array of arguments will be passed as if you wrote them out separately.
     * So they will not arrive within the array on the other side, they will be separate.
     * You can also pass a regular expression to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {Array} [args] Optional array of arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emitEvent = function emitEvent(evt, args) {
        var listenersMap = this.getListenersAsObject(evt);
        var listeners;
        var listener;
        var i;
        var key;
        var response;

        for (key in listenersMap) {
            if (listenersMap.hasOwnProperty(key)) {
                listeners = listenersMap[key].slice(0);

                for (i = 0; i < listeners.length; i++) {
                    // If the listener returns true then it shall be removed from the event
                    // The function is executed either with a basic call or an apply if there is an args array
                    listener = listeners[i];

                    if (listener.once === true) {
                        this.removeListener(evt, listener.listener);
                    }

                    response = listener.listener.apply(this, args || []);

                    if (response === this._getOnceReturnValue()) {
                        this.removeListener(evt, listener.listener);
                    }
                }
            }
        }

        return this;
    };

    /**
     * Alias of emitEvent
     */
    proto.trigger = alias('emitEvent');

    /**
     * Subtly different from emitEvent in that it will pass its arguments on to the listeners, as opposed to taking a single array of arguments to pass on.
     * As with emitEvent, you can pass a regex in place of the event name to emit to all events that match it.
     *
     * @param {String|RegExp} evt Name of the event to emit and execute listeners for.
     * @param {...*} Optional additional arguments to be passed to each listener.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.emit = function emit(evt) {
        var args = Array.prototype.slice.call(arguments, 1);
        return this.emitEvent(evt, args);
    };

    /**
     * Sets the current value to check against when executing listeners. If a
     * listeners return value matches the one set here then it will be removed
     * after execution. This value defaults to true.
     *
     * @param {*} value The new value to check for when executing listeners.
     * @return {Object} Current instance of EventEmitter for chaining.
     */
    proto.setOnceReturnValue = function setOnceReturnValue(value) {
        this._onceReturnValue = value;
        return this;
    };

    /**
     * Fetches the current value to check against when executing listeners. If
     * the listeners return value matches this one then it should be removed
     * automatically. It will return true by default.
     *
     * @return {*|Boolean} The current value to check for or the default, true.
     * @api private
     */
    proto._getOnceReturnValue = function _getOnceReturnValue() {
        if (this.hasOwnProperty('_onceReturnValue')) {
            return this._onceReturnValue;
        }
        else {
            return true;
        }
    };

    /**
     * Fetches the events object and creates one if required.
     *
     * @return {Object} The events storage object.
     * @api private
     */
    proto._getEvents = function _getEvents() {
        return this._events || (this._events = {});
    };

    /**
     * Reverts the global {@link EventEmitter} to its previous value and returns a reference to this version.
     *
     * @return {Function} Non conflicting EventEmitter class.
     */
    EventEmitter.noConflict = function noConflict() {
        exports.EventEmitter = originalGlobalValue;
        return EventEmitter;
    };

    // Expose the class either via AMD, CommonJS or the global object
    if (typeof define === 'function' && define.amd) {
        define(function () {
            return EventEmitter;
        });
    }
    else if (typeof module === 'object' && module.exports){
        module.exports = EventEmitter;
    }
    else {
        exports.EventEmitter = EventEmitter;
    }
}(typeof window !== 'undefined' ? window : this || {}));

},{}]},{},[1]);
