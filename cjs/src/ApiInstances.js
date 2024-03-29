"use strict";

exports.__esModule = true;

var _ChainWebSocket = require("./ChainWebSocket");

var _ChainWebSocket2 = _interopRequireDefault(_ChainWebSocket);

var _GrapheneApi = require("./GrapheneApi");

var _GrapheneApi2 = _interopRequireDefault(_GrapheneApi);

var _ChainConfig = require("./ChainConfig");

var _ChainConfig2 = _interopRequireDefault(_ChainConfig);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } } // var { List } = require("immutable");


var inst = void 0;
var autoReconnect = true;
/**
 Configure: configure as follows `Apis.instance("ws://localhost:8090").init_promise`.  This returns a promise, once resolved the connection is ready.

 Import: import { Apis } from "@graphene/chain"

 Short-hand: Apis.db("method", "parm1", 2, 3, ...).  Returns a promise with results.

 Additional usage: Apis.instance().db_api().exec("method", ["method", "parm1", 2, 3, ...]).  Returns a promise with results.
 */

exports.default = {

  setRpcConnectionStatusCallback: function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;
    if (inst) inst.setRpcConnectionStatusCallback(callback);
  },

  /**
   @arg {boolean} auto means automatic reconnect if possible( browser case), default true
   */
  setAutoReconnect: function setAutoReconnect(auto) {
    autoReconnect = auto;
  },

  /**
   @arg {string} cs is only provided in the first call
   @return {Apis} singleton .. Check Apis.instance().init_promise to know when the connection is established
   */
  reset: function reset() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";

    var _this = this;

    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;

    return this.close().then(function () {
      inst = new ApisInstance();
      inst.setRpcConnectionStatusCallback(_this.statusCb);

      if (inst && connect) {
        inst.connect(cs, connectTimeout);
      }

      return inst;
    });
  },
  instance: function instance() {
    var cs = arguments.length > 0 && arguments[0] !== undefined ? arguments[0] : "ws://localhost:8090";
    var connect = arguments[1];
    var connectTimeout = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 4000;
    var enableCrypto = arguments[3];

    if (!inst) {
      inst = new ApisInstance();
      inst.setRpcConnectionStatusCallback(this.statusCb);
    }

    if (inst && connect) {
      inst.connect(cs, connectTimeout, enableCrypto);
    }

    return inst;
  },
  chainId: function chainId() {
    return Apis.instance().chain_id;
  },

  close: function close() {
    if (inst) {
      return new Promise(function (res) {
        inst.close().then(function () {
          inst = null;
          res();
        });
      });
    }

    return Promise.resolve();
  }
  // db: (method, ...args) => Apis.instance().db_api().exec(method, toStrings(args)),
  // network: (method, ...args) => Apis.instance().network_api().exec(method, toStrings(args)),
  // history: (method, ...args) => Apis.instance().history_api().exec(method, toStrings(args)),
  // crypto: (method, ...args) => Apis.instance().crypto_api().exec(method, toStrings(args))
};

var ApisInstance = function () {
  function ApisInstance() {
    _classCallCheck(this, ApisInstance);
  }

  /** @arg {string} connection .. */
  ApisInstance.prototype.connect = function connect(cs, connectTimeout) {
    var _this2 = this;

    var enableCrypto = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : false;

    // console.log("INFO\tApiInstances\tconnect\t", cs);
    this.url = cs;
    var rpc_user = "*",
      rpc_password = "*";
    if (typeof window !== "undefined" && window.location && window.location.protocol === "https:" && cs.indexOf("wss://") < 0) {
      throw new Error("Secure domains require wss connection");
    }
    this.scrubTime = Date.now()

    this.ws_rpc = new _ChainWebSocket2.default(cs, this.statusCb, connectTimeout, autoReconnect, function () {
      var _now = Date.now()
      if (_this2._db && _now - _this2.scrubTime > 20000 ) {   
        _this2.scrubTime =  _now         
        // console.log('keep alive', _now)  
        _this2._db.exec('get_objects', [['2.1.0']]).catch(function (e) {});
      }
    });

    this.init_promise = this.ws_rpc.login(rpc_user, rpc_password).then(function () {
      console.log("Connected to API node:", cs);
      if (_this2.statusCb) _this2.statusCb('connect')
      _this2._db = new _GrapheneApi2.default(_this2.ws_rpc, "database");
      _this2._bitlender = new _GrapheneApi2.default(_this2.ws_rpc, "bitlender");
      _this2._finance = new _GrapheneApi2.default(_this2.ws_rpc, "finance");
      _this2._mobile = new _GrapheneApi2.default(_this2.ws_rpc, "mobile");
      _this2._admin = new _GrapheneApi2.default(_this2.ws_rpc, "admin");
      _this2._net = new _GrapheneApi2.default(_this2.ws_rpc, "network_broadcast");
      _this2._hist = new _GrapheneApi2.default(_this2.ws_rpc, "history");
      _this2._orders = new _GrapheneApi2.default(_this2.ws_rpc, "orders");
      if (enableCrypto) _this2._crypt = new _GrapheneApi2.default(_this2.ws_rpc, "crypto");
      var db_promise = _this2._db.init().then(function () {
        //https://github.com/cryptonomex/graphene/wiki/chain-locked-tx
        return _this2._db.exec("get_chain_id", []).then(function (_chain_id) {
          _this2.chain_id = _chain_id;
          return _ChainConfig2.default.setChainId(_chain_id);
          //DEBUG console.log("chain_id1",this.chain_id)
        });
      });
      _this2.ws_rpc.on_reconnect = function () {
        _this2.ws_rpc.login("", "").then(function () {
          _this2._db.init().then(function () {
            if (_this2.statusCb) _this2.statusCb("reconnect");
          });
          _this2._net.init();
          _this2._hist.init();
          _this2._bitlender.init();
          _this2._finance.init();
          _this2._mobile.init();
          _this2._admin.init();
          _this2._orders.init();
          if (enableCrypto) _this2._crypt.init();
        });
      };
      var initPromises = [db_promise, _this2._net.init(), _this2._hist.init(), _this2._bitlender.init(), _this2._finance.init(), _this2._mobile.init(), _this2._admin.init(), _this2._orders.init()];
      if (enableCrypto) initPromises.push(_this2._crypt.init());
      var initp = Promise.all(initPromises);
      if (_this2.statusCb) _this2.statusCb('initApi')
      return initp;
    });
  };

  ApisInstance.prototype.close = function close() {
    var _this3 = this;

    if (this.ws_rpc) {
      return this.ws_rpc.close().then(function () {
        _this3.ws_rpc = null;
      });
    };
    this.ws_rpc = null;
    return Promise.resolve();
  };
  ApisInstance.prototype.usersubscribe = function usersubscribe() {
    this.scrubTime = Date.now()
  }
  ApisInstance.prototype.db_api = function db_api() {
    return this._db;
  };

  ApisInstance.prototype.bitlender_api = function bitlender_api() {
    return this._bitlender;
  };

  ApisInstance.prototype.finance_api = function finance_api() {
    return this._finance;
  };

  ApisInstance.prototype.mobile_api = function mobile_api() {
      return this._mobile;
  };

  ApisInstance.prototype.admin_api = function admin_api() {
      return this._admin;
  };

  ApisInstance.prototype.network_api = function network_api() {
    return this._net;
  };

  ApisInstance.prototype.history_api = function history_api() {
    return this._hist;
  };

  ApisInstance.prototype.crypto_api = function crypto_api() {
    return this._crypt;
  };
  ApisInstance.prototype.orders_api = function crypto_api() {
    return this._orders;
  };

  ApisInstance.prototype.setRpcConnectionStatusCallback = function setRpcConnectionStatusCallback(callback) {
    this.statusCb = callback;
  };

  return ApisInstance;
}();

module.exports = exports["default"];
