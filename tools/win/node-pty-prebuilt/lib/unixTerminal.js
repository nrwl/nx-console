"use strict";
/**
 * Copyright (c) 2012-2015, Christopher Jeffrey (MIT License)
 * Copyright (c) 2016, Daniel Imms (MIT License).
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
var net = require("net");
var path = require("path");
var os = require("os");
var terminal_1 = require("./terminal");
var utils_1 = require("./utils");
var pty = require(path.join('..', 'build', 'Release', 'pty.node'));
var DEFAULT_FILE = 'sh';
var DEFAULT_NAME = 'xterm';
var DESTROY_SOCKET_TIMEOUT_MS = 200;
var UnixTerminal = /** @class */ (function (_super) {
    __extends(UnixTerminal, _super);
    function UnixTerminal(file, args, opt) {
        var _this = _super.call(this, opt) || this;
        if (typeof args === 'string') {
            throw new Error('args as a string is not supported on unix.');
        }
        // Initialize arguments
        args = args || [];
        file = file || DEFAULT_FILE;
        opt = opt || {};
        opt.env = opt.env || process.env;
        var cols = opt.cols || terminal_1.DEFAULT_COLS;
        var rows = opt.rows || terminal_1.DEFAULT_ROWS;
        var uid = opt.uid || -1;
        var gid = opt.gid || -1;
        var env = utils_1.assign({}, opt.env);
        if (opt.env === process.env) {
            _this._sanitizeEnv(env);
        }
        var cwd = opt.cwd || process.cwd();
        var name = opt.name || env.TERM || DEFAULT_NAME;
        env.TERM = name;
        var parsedEnv = _this._parseEnv(env);
        var encoding = (opt.encoding === undefined ? 'utf8' : opt.encoding);
        var onexit = function (code, signal) {
            // XXX Sometimes a data event is emitted after exit. Wait til socket is
            // destroyed.
            if (!_this._emittedClose) {
                if (_this._boundClose) {
                    return;
                }
                _this._boundClose = true;
                // From macOS High Sierra 10.13.2 sometimes the socket never gets
                // closed. A timeout is applied here to avoid the terminal never being
                // destroyed when this occurs.
                var timeout_1 = setTimeout(function () {
                    timeout_1 = null;
                    // Destroying the socket now will cause the close event to fire
                    _this._socket.destroy();
                }, DESTROY_SOCKET_TIMEOUT_MS);
                _this.once('close', function () {
                    if (timeout_1 !== null) {
                        clearTimeout(timeout_1);
                    }
                    _this.emit('exit', code, signal);
                });
                return;
            }
            _this.emit('exit', code, signal);
        };
        // fork
        var term = pty.fork(file, args, parsedEnv, cwd, cols, rows, uid, gid, (encoding === 'utf8'), onexit);
        _this._socket = new PipeSocket(term.fd);
        if (encoding !== null) {
            _this._socket.setEncoding(encoding);
        }
        // setup
        _this._socket.on('error', function (err) {
            // NOTE: fs.ReadStream gets EAGAIN twice at first:
            if (err.code) {
                if (~err.code.indexOf('EAGAIN')) {
                    return;
                }
            }
            // close
            _this._close();
            // EIO on exit from fs.ReadStream:
            if (!_this._emittedClose) {
                _this._emittedClose = true;
                _this.emit('close');
            }
            // EIO, happens when someone closes our child process: the only process in
            // the terminal.
            // node < 0.6.14: errno 5
            // node >= 0.6.14: read EIO
            if (err.code) {
                if (~err.code.indexOf('errno 5') || ~err.code.indexOf('EIO')) {
                    return;
                }
            }
            // throw anything else
            if (_this.listeners('error').length < 2) {
                throw err;
            }
        });
        _this._pid = term.pid;
        _this._fd = term.fd;
        _this._pty = term.pty;
        _this._file = file;
        _this._name = name;
        _this._readable = true;
        _this._writable = true;
        _this._socket.on('close', function () {
            if (_this._emittedClose) {
                return;
            }
            _this._emittedClose = true;
            _this._close();
            _this.emit('close');
        });
        return _this;
    }
    Object.defineProperty(UnixTerminal.prototype, "master", {
        get: function () { return this._master; },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(UnixTerminal.prototype, "slave", {
        get: function () { return this._slave; },
        enumerable: true,
        configurable: true
    });
    /**
     * openpty
     */
    UnixTerminal.open = function (opt) {
        var self = Object.create(UnixTerminal.prototype);
        opt = opt || {};
        if (arguments.length > 1) {
            opt = {
                cols: arguments[1],
                rows: arguments[2]
            };
        }
        var cols = opt.cols || terminal_1.DEFAULT_COLS;
        var rows = opt.rows || terminal_1.DEFAULT_ROWS;
        var encoding = opt.encoding ? 'utf8' : opt.encoding;
        // open
        var term = pty.open(cols, rows);
        self._master = new PipeSocket(term.master);
        self._master.setEncoding(encoding);
        self._master.resume();
        self._slave = new PipeSocket(term.slave);
        self._slave.setEncoding(encoding);
        self._slave.resume();
        self._socket = self._master;
        self._pid = null;
        self._fd = term.master;
        self._pty = term.pty;
        self._file = process.argv[0] || 'node';
        self._name = process.env.TERM || '';
        self._readable = true;
        self._writable = true;
        self._socket.on('error', function (err) {
            self._close();
            if (self.listeners('error').length < 2) {
                throw err;
            }
        });
        self._socket.on('close', function () {
            self._close();
        });
        return self;
    };
    UnixTerminal.prototype.write = function (data) {
        this._socket.write(data);
    };
    UnixTerminal.prototype.destroy = function () {
        var _this = this;
        this._close();
        // Need to close the read stream so node stops reading a dead file
        // descriptor. Then we can safely SIGHUP the shell.
        this._socket.once('close', function () {
            _this.kill('SIGHUP');
        });
        this._socket.destroy();
    };
    UnixTerminal.prototype.kill = function (signal) {
        signal = signal || 'SIGHUP';
        if (signal in os.constants.signals) {
            try {
                // pty.kill will not be available on systems which don't support
                // the TIOCSIG/TIOCSIGNAL ioctl
                if (pty.kill && signal !== 'SIGHUP') {
                    pty.kill(this._fd, os.constants.signals[signal]);
                }
                else {
                    process.kill(this.pid, signal);
                }
            }
            catch (e) { }
        }
        else {
            throw new Error('Unknown signal: ' + signal);
        }
    };
    Object.defineProperty(UnixTerminal.prototype, "process", {
        /**
         * Gets the name of the process.
         */
        get: function () {
            return pty.process(this._fd, this._pty) || this._file;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * TTY
     */
    UnixTerminal.prototype.resize = function (cols, rows) {
        pty.resize(this._fd, cols, rows);
    };
    UnixTerminal.prototype._sanitizeEnv = function (env) {
        // Make sure we didn't start our server from inside tmux.
        delete env['TMUX'];
        delete env['TMUX_PANE'];
        // Make sure we didn't start our server from inside screen.
        // http://web.mit.edu/gnu/doc/html/screen_20.html
        delete env['STY'];
        delete env['WINDOW'];
        // Delete some variables that might confuse our terminal.
        delete env['WINDOWID'];
        delete env['TERMCAP'];
        delete env['COLUMNS'];
        delete env['LINES'];
    };
    return UnixTerminal;
}(terminal_1.Terminal));
exports.UnixTerminal = UnixTerminal;
/**
 * Wraps net.Socket to force the handle type "PIPE" by temporarily overwriting
 * tty_wrap.guessHandleType.
 * See: https://github.com/chjj/pty.js/issues/103
 */
var PipeSocket = /** @class */ (function (_super) {
    __extends(PipeSocket, _super);
    function PipeSocket(fd) {
        var _this = this;
        var tty = process.binding('tty_wrap');
        var guessHandleType = tty.guessHandleType;
        tty.guessHandleType = function () { return 'PIPE'; };
        // @types/node has fd as string? https://github.com/DefinitelyTyped/DefinitelyTyped/pull/18275
        _this = _super.call(this, { fd: fd }) || this;
        tty.guessHandleType = guessHandleType;
        return _this;
    }
    return PipeSocket;
}(net.Socket));
//# sourceMappingURL=unixTerminal.js.map