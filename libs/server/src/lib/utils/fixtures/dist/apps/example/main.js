(function (factory) {
  typeof define === 'function' && define.amd ? define(factory) :
    factory();
}(function () { 'use strict';

  /*! *****************************************************************************
  Copyright (c) Microsoft Corporation. All rights reserved.
  Licensed under the Apache License, Version 2.0 (the "License"); you may not use
  this file except in compliance with the License. You may obtain a copy of the
  License at http://www.apache.org/licenses/LICENSE-2.0

  THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
  KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
  WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
  MERCHANTABLITY OR NON-INFRINGEMENT.

  See the Apache Version 2.0 License for specific language governing permissions
  and limitations under the License.
  ***************************************************************************** */
  /* global Reflect, Promise */

  var extendStatics = function(d, b) {
    extendStatics = Object.setPrototypeOf ||
      ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
      function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };
    return extendStatics(d, b);
  };

  function __extends(d, b) {
    extendStatics(d, b);
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isFunction(x) {
    return typeof x === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var _enable_super_gross_mode_that_will_cause_bad_things = false;
  var config = {
    Promise: undefined,
    set useDeprecatedSynchronousErrorHandling(value) {
      if (value) {
        var error = /*@__PURE__*/ new Error();
        /*@__PURE__*/ console.warn('DEPRECATED! RxJS was set to use deprecated synchronous error handling behavior by code at: \n' + error.stack);
      }
      _enable_super_gross_mode_that_will_cause_bad_things = value;
    },
    get useDeprecatedSynchronousErrorHandling() {
      return _enable_super_gross_mode_that_will_cause_bad_things;
    },
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function hostReportError(err) {
    setTimeout(function () { throw err; });
  }

  /** PURE_IMPORTS_START _config,_util_hostReportError PURE_IMPORTS_END */
  var empty = {
    closed: true,
    next: function (value) { },
    error: function (err) {
      if (config.useDeprecatedSynchronousErrorHandling) {
        throw err;
      }
      else {
        hostReportError(err);
      }
    },
    complete: function () { }
  };

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var isArray = Array.isArray || (function (x) { return x && typeof x.length === 'number'; });

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isObject(x) {
    return x !== null && typeof x === 'object';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function UnsubscriptionErrorImpl(errors) {
    Error.call(this);
    this.message = errors ?
      errors.length + " errors occurred during unsubscription:\n" + errors.map(function (err, i) { return i + 1 + ") " + err.toString(); }).join('\n  ') : '';
    this.name = 'UnsubscriptionError';
    this.errors = errors;
    return this;
  }
  UnsubscriptionErrorImpl.prototype = /*@__PURE__*/ Object.create(Error.prototype);
  var UnsubscriptionError = UnsubscriptionErrorImpl;

  /** PURE_IMPORTS_START _util_isArray,_util_isObject,_util_isFunction,_util_UnsubscriptionError PURE_IMPORTS_END */
  var Subscription = /*@__PURE__*/ (function () {
    function Subscription(unsubscribe) {
      this.closed = false;
      this._parent = null;
      this._parents = null;
      this._subscriptions = null;
      if (unsubscribe) {
        this._unsubscribe = unsubscribe;
      }
    }
    Subscription.prototype.unsubscribe = function () {
      var hasErrors = false;
      var errors;
      if (this.closed) {
        return;
      }
      var _a = this, _parent = _a._parent, _parents = _a._parents, _unsubscribe = _a._unsubscribe, _subscriptions = _a._subscriptions;
      this.closed = true;
      this._parent = null;
      this._parents = null;
      this._subscriptions = null;
      var index = -1;
      var len = _parents ? _parents.length : 0;
      while (_parent) {
        _parent.remove(this);
        _parent = ++index < len && _parents[index] || null;
      }
      if (isFunction(_unsubscribe)) {
        try {
          _unsubscribe.call(this);
        }
        catch (e) {
          hasErrors = true;
          errors = e instanceof UnsubscriptionError ? flattenUnsubscriptionErrors(e.errors) : [e];
        }
      }
      if (isArray(_subscriptions)) {
        index = -1;
        len = _subscriptions.length;
        while (++index < len) {
          var sub = _subscriptions[index];
          if (isObject(sub)) {
            try {
              sub.unsubscribe();
            }
            catch (e) {
              hasErrors = true;
              errors = errors || [];
              if (e instanceof UnsubscriptionError) {
                errors = errors.concat(flattenUnsubscriptionErrors(e.errors));
              }
              else {
                errors.push(e);
              }
            }
          }
        }
      }
      if (hasErrors) {
        throw new UnsubscriptionError(errors);
      }
    };
    Subscription.prototype.add = function (teardown) {
      var subscription = teardown;
      switch (typeof teardown) {
        case 'function':
          subscription = new Subscription(teardown);
        case 'object':
          if (subscription === this || subscription.closed || typeof subscription.unsubscribe !== 'function') {
            return subscription;
          }
          else if (this.closed) {
            subscription.unsubscribe();
            return subscription;
          }
          else if (!(subscription instanceof Subscription)) {
            var tmp = subscription;
            subscription = new Subscription();
            subscription._subscriptions = [tmp];
          }
          break;
        default: {
          if (!teardown) {
            return Subscription.EMPTY;
          }
          throw new Error('unrecognized teardown ' + teardown + ' added to Subscription.');
        }
      }
      if (subscription._addParent(this)) {
        var subscriptions = this._subscriptions;
        if (subscriptions) {
          subscriptions.push(subscription);
        }
        else {
          this._subscriptions = [subscription];
        }
      }
      return subscription;
    };
    Subscription.prototype.remove = function (subscription) {
      var subscriptions = this._subscriptions;
      if (subscriptions) {
        var subscriptionIndex = subscriptions.indexOf(subscription);
        if (subscriptionIndex !== -1) {
          subscriptions.splice(subscriptionIndex, 1);
        }
      }
    };
    Subscription.prototype._addParent = function (parent) {
      var _a = this, _parent = _a._parent, _parents = _a._parents;
      if (_parent === parent) {
        return false;
      }
      else if (!_parent) {
        this._parent = parent;
        return true;
      }
      else if (!_parents) {
        this._parents = [parent];
        return true;
      }
      else if (_parents.indexOf(parent) === -1) {
        _parents.push(parent);
        return true;
      }
      return false;
    };
    Subscription.EMPTY = (function (empty) {
      empty.closed = true;
      return empty;
    }(new Subscription()));
    return Subscription;
  }());
  function flattenUnsubscriptionErrors(errors) {
    return errors.reduce(function (errs, err) { return errs.concat((err instanceof UnsubscriptionError) ? err.errors : err); }, []);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var rxSubscriber = typeof Symbol === 'function'
    ? /*@__PURE__*/ Symbol('rxSubscriber')
    : '@@rxSubscriber_' + /*@__PURE__*/ Math.random();

  /** PURE_IMPORTS_START tslib,_util_isFunction,_Observer,_Subscription,_internal_symbol_rxSubscriber,_config,_util_hostReportError PURE_IMPORTS_END */
  var Subscriber = /*@__PURE__*/ (function (_super) {
    __extends(Subscriber, _super);
    function Subscriber(destinationOrNext, error, complete) {
      var _this = _super.call(this) || this;
      _this.syncErrorValue = null;
      _this.syncErrorThrown = false;
      _this.syncErrorThrowable = false;
      _this.isStopped = false;
      switch (arguments.length) {
        case 0:
          _this.destination = empty;
          break;
        case 1:
          if (!destinationOrNext) {
            _this.destination = empty;
            break;
          }
          if (typeof destinationOrNext === 'object') {
            if (destinationOrNext instanceof Subscriber) {
              _this.syncErrorThrowable = destinationOrNext.syncErrorThrowable;
              _this.destination = destinationOrNext;
              destinationOrNext.add(_this);
            }
            else {
              _this.syncErrorThrowable = true;
              _this.destination = new SafeSubscriber(_this, destinationOrNext);
            }
            break;
          }
        default:
          _this.syncErrorThrowable = true;
          _this.destination = new SafeSubscriber(_this, destinationOrNext, error, complete);
          break;
      }
      return _this;
    }
    Subscriber.prototype[rxSubscriber] = function () { return this; };
    Subscriber.create = function (next, error, complete) {
      var subscriber = new Subscriber(next, error, complete);
      subscriber.syncErrorThrowable = false;
      return subscriber;
    };
    Subscriber.prototype.next = function (value) {
      if (!this.isStopped) {
        this._next(value);
      }
    };
    Subscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        this.isStopped = true;
        this._error(err);
      }
    };
    Subscriber.prototype.complete = function () {
      if (!this.isStopped) {
        this.isStopped = true;
        this._complete();
      }
    };
    Subscriber.prototype.unsubscribe = function () {
      if (this.closed) {
        return;
      }
      this.isStopped = true;
      _super.prototype.unsubscribe.call(this);
    };
    Subscriber.prototype._next = function (value) {
      this.destination.next(value);
    };
    Subscriber.prototype._error = function (err) {
      this.destination.error(err);
      this.unsubscribe();
    };
    Subscriber.prototype._complete = function () {
      this.destination.complete();
      this.unsubscribe();
    };
    Subscriber.prototype._unsubscribeAndRecycle = function () {
      var _a = this, _parent = _a._parent, _parents = _a._parents;
      this._parent = null;
      this._parents = null;
      this.unsubscribe();
      this.closed = false;
      this.isStopped = false;
      this._parent = _parent;
      this._parents = _parents;
      return this;
    };
    return Subscriber;
  }(Subscription));
  var SafeSubscriber = /*@__PURE__*/ (function (_super) {
    __extends(SafeSubscriber, _super);
    function SafeSubscriber(_parentSubscriber, observerOrNext, error, complete) {
      var _this = _super.call(this) || this;
      _this._parentSubscriber = _parentSubscriber;
      var next;
      var context = _this;
      if (isFunction(observerOrNext)) {
        next = observerOrNext;
      }
      else if (observerOrNext) {
        next = observerOrNext.next;
        error = observerOrNext.error;
        complete = observerOrNext.complete;
        if (observerOrNext !== empty) {
          context = Object.create(observerOrNext);
          if (isFunction(context.unsubscribe)) {
            _this.add(context.unsubscribe.bind(context));
          }
          context.unsubscribe = _this.unsubscribe.bind(_this);
        }
      }
      _this._context = context;
      _this._next = next;
      _this._error = error;
      _this._complete = complete;
      return _this;
    }
    SafeSubscriber.prototype.next = function (value) {
      if (!this.isStopped && this._next) {
        var _parentSubscriber = this._parentSubscriber;
        if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
          this.__tryOrUnsub(this._next, value);
        }
        else if (this.__tryOrSetError(_parentSubscriber, this._next, value)) {
          this.unsubscribe();
        }
      }
    };
    SafeSubscriber.prototype.error = function (err) {
      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;
        var useDeprecatedSynchronousErrorHandling = config.useDeprecatedSynchronousErrorHandling;
        if (this._error) {
          if (!useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(this._error, err);
            this.unsubscribe();
          }
          else {
            this.__tryOrSetError(_parentSubscriber, this._error, err);
            this.unsubscribe();
          }
        }
        else if (!_parentSubscriber.syncErrorThrowable) {
          this.unsubscribe();
          if (useDeprecatedSynchronousErrorHandling) {
            throw err;
          }
          hostReportError(err);
        }
        else {
          if (useDeprecatedSynchronousErrorHandling) {
            _parentSubscriber.syncErrorValue = err;
            _parentSubscriber.syncErrorThrown = true;
          }
          else {
            hostReportError(err);
          }
          this.unsubscribe();
        }
      }
    };
    SafeSubscriber.prototype.complete = function () {
      var _this = this;
      if (!this.isStopped) {
        var _parentSubscriber = this._parentSubscriber;
        if (this._complete) {
          var wrappedComplete = function () { return _this._complete.call(_this._context); };
          if (!config.useDeprecatedSynchronousErrorHandling || !_parentSubscriber.syncErrorThrowable) {
            this.__tryOrUnsub(wrappedComplete);
            this.unsubscribe();
          }
          else {
            this.__tryOrSetError(_parentSubscriber, wrappedComplete);
            this.unsubscribe();
          }
        }
        else {
          this.unsubscribe();
        }
      }
    };
    SafeSubscriber.prototype.__tryOrUnsub = function (fn, value) {
      try {
        fn.call(this._context, value);
      }
      catch (err) {
        this.unsubscribe();
        if (config.useDeprecatedSynchronousErrorHandling) {
          throw err;
        }
        else {
          hostReportError(err);
        }
      }
    };
    SafeSubscriber.prototype.__tryOrSetError = function (parent, fn, value) {
      if (!config.useDeprecatedSynchronousErrorHandling) {
        throw new Error('bad call');
      }
      try {
        fn.call(this._context, value);
      }
      catch (err) {
        if (config.useDeprecatedSynchronousErrorHandling) {
          parent.syncErrorValue = err;
          parent.syncErrorThrown = true;
          return true;
        }
        else {
          hostReportError(err);
          return true;
        }
      }
      return false;
    };
    SafeSubscriber.prototype._unsubscribe = function () {
      var _parentSubscriber = this._parentSubscriber;
      this._context = null;
      this._parentSubscriber = null;
      _parentSubscriber.unsubscribe();
    };
    return SafeSubscriber;
  }(Subscriber));

  /** PURE_IMPORTS_START _Subscriber PURE_IMPORTS_END */
  function canReportError(observer) {
    while (observer) {
      var _a = observer, closed_1 = _a.closed, destination = _a.destination, isStopped = _a.isStopped;
      if (closed_1 || isStopped) {
        return false;
      }
      else if (destination && destination instanceof Subscriber) {
        observer = destination;
      }
      else {
        observer = null;
      }
    }
    return true;
  }

  /** PURE_IMPORTS_START _Subscriber,_symbol_rxSubscriber,_Observer PURE_IMPORTS_END */
  function toSubscriber(nextOrObserver, error, complete) {
    if (nextOrObserver) {
      if (nextOrObserver instanceof Subscriber) {
        return nextOrObserver;
      }
      if (nextOrObserver[rxSubscriber]) {
        return nextOrObserver[rxSubscriber]();
      }
    }
    if (!nextOrObserver && !error && !complete) {
      return new Subscriber(empty);
    }
    return new Subscriber(nextOrObserver, error, complete);
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var observable = typeof Symbol === 'function' && Symbol.observable || '@@observable';

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function noop() { }

  /** PURE_IMPORTS_START _noop PURE_IMPORTS_END */
  function pipeFromArray(fns) {
    if (!fns) {
      return noop;
    }
    if (fns.length === 1) {
      return fns[0];
    }
    return function piped(input) {
      return fns.reduce(function (prev, fn) { return fn(prev); }, input);
    };
  }

  /** PURE_IMPORTS_START _util_canReportError,_util_toSubscriber,_internal_symbol_observable,_util_pipe,_config PURE_IMPORTS_END */
  var Observable = /*@__PURE__*/ (function () {
    function Observable(subscribe) {
      this._isScalar = false;
      if (subscribe) {
        this._subscribe = subscribe;
      }
    }
    Observable.prototype.lift = function (operator) {
      var observable = new Observable();
      observable.source = this;
      observable.operator = operator;
      return observable;
    };
    Observable.prototype.subscribe = function (observerOrNext, error, complete) {
      var operator = this.operator;
      var sink = toSubscriber(observerOrNext, error, complete);
      if (operator) {
        sink.add(operator.call(sink, this.source));
      }
      else {
        sink.add(this.source || (config.useDeprecatedSynchronousErrorHandling && !sink.syncErrorThrowable) ?
          this._subscribe(sink) :
          this._trySubscribe(sink));
      }
      if (config.useDeprecatedSynchronousErrorHandling) {
        if (sink.syncErrorThrowable) {
          sink.syncErrorThrowable = false;
          if (sink.syncErrorThrown) {
            throw sink.syncErrorValue;
          }
        }
      }
      return sink;
    };
    Observable.prototype._trySubscribe = function (sink) {
      try {
        return this._subscribe(sink);
      }
      catch (err) {
        if (config.useDeprecatedSynchronousErrorHandling) {
          sink.syncErrorThrown = true;
          sink.syncErrorValue = err;
        }
        if (canReportError(sink)) {
          sink.error(err);
        }
        else {
          console.warn(err);
        }
      }
    };
    Observable.prototype.forEach = function (next, promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var subscription;
        subscription = _this.subscribe(function (value) {
          try {
            next(value);
          }
          catch (err) {
            reject(err);
            if (subscription) {
              subscription.unsubscribe();
            }
          }
        }, reject, resolve);
      });
    };
    Observable.prototype._subscribe = function (subscriber) {
      var source = this.source;
      return source && source.subscribe(subscriber);
    };
    Observable.prototype[observable] = function () {
      return this;
    };
    Observable.prototype.pipe = function () {
      var operations = [];
      for (var _i = 0; _i < arguments.length; _i++) {
        operations[_i] = arguments[_i];
      }
      if (operations.length === 0) {
        return this;
      }
      return pipeFromArray(operations)(this);
    };
    Observable.prototype.toPromise = function (promiseCtor) {
      var _this = this;
      promiseCtor = getPromiseCtor(promiseCtor);
      return new promiseCtor(function (resolve, reject) {
        var value;
        _this.subscribe(function (x) { return value = x; }, function (err) { return reject(err); }, function () { return resolve(value); });
      });
    };
    Observable.create = function (subscribe) {
      return new Observable(subscribe);
    };
    return Observable;
  }());
  function getPromiseCtor(promiseCtor) {
    if (!promiseCtor) {
      promiseCtor = Promise;
    }
    if (!promiseCtor) {
      throw new Error('no Promise impl found');
    }
    return promiseCtor;
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Observable,_Subscriber,_Subscription,_util_ObjectUnsubscribedError,_SubjectSubscription,_internal_symbol_rxSubscriber PURE_IMPORTS_END */
  var SubjectSubscriber = /*@__PURE__*/ (function (_super) {
    __extends(SubjectSubscriber, _super);
    function SubjectSubscriber(destination) {
      var _this = _super.call(this, destination) || this;
      _this.destination = destination;
      return _this;
    }
    return SubjectSubscriber;
  }(Subscriber));

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
  function refCount() {
    return function refCountOperatorFunction(source) {
      return source.lift(new RefCountOperator(source));
    };
  }
  var RefCountOperator = /*@__PURE__*/ (function () {
    function RefCountOperator(connectable) {
      this.connectable = connectable;
    }
    RefCountOperator.prototype.call = function (subscriber, source) {
      var connectable = this.connectable;
      connectable._refCount++;
      var refCounter = new RefCountSubscriber(subscriber, connectable);
      var subscription = source.subscribe(refCounter);
      if (!refCounter.closed) {
        refCounter.connection = connectable.connect();
      }
      return subscription;
    };
    return RefCountOperator;
  }());
  var RefCountSubscriber = /*@__PURE__*/ (function (_super) {
    __extends(RefCountSubscriber, _super);
    function RefCountSubscriber(destination, connectable) {
      var _this = _super.call(this, destination) || this;
      _this.connectable = connectable;
      return _this;
    }
    RefCountSubscriber.prototype._unsubscribe = function () {
      var connectable = this.connectable;
      if (!connectable) {
        this.connection = null;
        return;
      }
      this.connectable = null;
      var refCount = connectable._refCount;
      if (refCount <= 0) {
        this.connection = null;
        return;
      }
      connectable._refCount = refCount - 1;
      if (refCount > 1) {
        this.connection = null;
        return;
      }
      var connection = this.connection;
      var sharedConnection = connectable._connection;
      this.connection = null;
      if (sharedConnection && (!connection || sharedConnection === connection)) {
        sharedConnection.unsubscribe();
      }
    };
    return RefCountSubscriber;
  }(Subscriber));

  /** PURE_IMPORTS_START tslib,_Subject,_Observable,_Subscriber,_Subscription,_operators_refCount PURE_IMPORTS_END */
  var ConnectableObservable = /*@__PURE__*/ (function (_super) {
    __extends(ConnectableObservable, _super);
    function ConnectableObservable(source, subjectFactory) {
      var _this = _super.call(this) || this;
      _this.source = source;
      _this.subjectFactory = subjectFactory;
      _this._refCount = 0;
      _this._isComplete = false;
      return _this;
    }
    ConnectableObservable.prototype._subscribe = function (subscriber) {
      return this.getSubject().subscribe(subscriber);
    };
    ConnectableObservable.prototype.getSubject = function () {
      var subject = this._subject;
      if (!subject || subject.isStopped) {
        this._subject = this.subjectFactory();
      }
      return this._subject;
    };
    ConnectableObservable.prototype.connect = function () {
      var connection = this._connection;
      if (!connection) {
        this._isComplete = false;
        connection = this._connection = new Subscription();
        connection.add(this.source
          .subscribe(new ConnectableSubscriber(this.getSubject(), this)));
        if (connection.closed) {
          this._connection = null;
          connection = Subscription.EMPTY;
        }
        else {
          this._connection = connection;
        }
      }
      return connection;
    };
    ConnectableObservable.prototype.refCount = function () {
      return refCount()(this);
    };
    return ConnectableObservable;
  }(Observable));
  var connectableProto = ConnectableObservable.prototype;
  var connectableObservableDescriptor = {
    operator: { value: null },
    _refCount: { value: 0, writable: true },
    _subject: { value: null, writable: true },
    _connection: { value: null, writable: true },
    _subscribe: { value: connectableProto._subscribe },
    _isComplete: { value: connectableProto._isComplete, writable: true },
    getSubject: { value: connectableProto.getSubject },
    connect: { value: connectableProto.connect },
    refCount: { value: connectableProto.refCount }
  };
  var ConnectableSubscriber = /*@__PURE__*/ (function (_super) {
    __extends(ConnectableSubscriber, _super);
    function ConnectableSubscriber(destination, connectable) {
      var _this = _super.call(this, destination) || this;
      _this.connectable = connectable;
      return _this;
    }
    ConnectableSubscriber.prototype._error = function (err) {
      this._unsubscribe();
      _super.prototype._error.call(this, err);
    };
    ConnectableSubscriber.prototype._complete = function () {
      this.connectable._isComplete = true;
      this._unsubscribe();
      _super.prototype._complete.call(this);
    };
    ConnectableSubscriber.prototype._unsubscribe = function () {
      var connectable = this.connectable;
      if (connectable) {
        this.connectable = null;
        var connection = connectable._connection;
        connectable._refCount = 0;
        connectable._subject = null;
        connectable._connection = null;
        if (connection) {
          connection.unsubscribe();
        }
      }
    };
    return ConnectableSubscriber;
  }(SubjectSubscriber));

  /** PURE_IMPORTS_START tslib,_Subscriber,_Subscription,_Observable,_Subject PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_util_ObjectUnsubscribedError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Action PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncAction PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Scheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _QueueAction,_QueueScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
  var EMPTY = /*@__PURE__*/ new Observable(function (subscriber) { return subscriber.complete(); });
  function empty$1(scheduler) {
    return scheduler ? emptyScheduled(scheduler) : EMPTY;
  }
  function emptyScheduled(scheduler) {
    return new Observable(function (subscriber) { return scheduler.schedule(function () { return subscriber.complete(); }); });
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  function isScheduler(value) {
    return value && typeof value.schedule === 'function';
  }

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */
  var subscribeToArray = function (array) {
    return function (subscriber) {
      for (var i = 0, len = array.length; i < len && !subscriber.closed; i++) {
        subscriber.next(array[i]);
      }
      if (!subscriber.closed) {
        subscriber.complete();
      }
    };
  };

  /** PURE_IMPORTS_START _Observable,_Subscription,_util_subscribeToArray PURE_IMPORTS_END */
  function fromArray(input, scheduler) {
    if (!scheduler) {
      return new Observable(subscribeToArray(input));
    }
    else {
      return new Observable(function (subscriber) {
        var sub = new Subscription();
        var i = 0;
        sub.add(scheduler.schedule(function () {
          if (i === input.length) {
            subscriber.complete();
            return;
          }
          subscriber.next(input[i++]);
          if (!subscriber.closed) {
            sub.add(this.schedule());
          }
        }));
        return sub;
      });
    }
  }

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */
  function scalar(value) {
    var result = new Observable(function (subscriber) {
      subscriber.next(value);
      subscriber.complete();
    });
    result._isScalar = true;
    result.value = value;
    return result;
  }

  /** PURE_IMPORTS_START _util_isScheduler,_fromArray,_empty,_scalar PURE_IMPORTS_END */
  function of() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
      args[_i] = arguments[_i];
    }
    var scheduler = args[args.length - 1];
    if (isScheduler(scheduler)) {
      args.pop();
    }
    else {
      scheduler = undefined;
    }
    switch (args.length) {
      case 0:
        return empty$1(scheduler);
      case 1:
        return scheduler ? fromArray(args, scheduler) : scalar(args[0]);
      default:
        return fromArray(args, scheduler);
    }
  }

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_empty,_observable_of,_observable_throwError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_Notification PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_scheduler_queue,_Subscription,_operators_observeOn,_util_ObjectUnsubscribedError,_SubjectSubscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_Subscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_util_Immediate,_AsyncAction PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _AsapAction,_AsapScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _AsyncAction,_AsyncScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncAction PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _AnimationFrameAction,_AnimationFrameScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_AsyncAction,_AsyncScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */
  function map(project, thisArg) {
    return function mapOperation(source) {
      if (typeof project !== 'function') {
        throw new TypeError('argument is not a function. Are you looking for `mapTo()`?');
      }
      return source.lift(new MapOperator(project, thisArg));
    };
  }
  var MapOperator = /*@__PURE__*/ (function () {
    function MapOperator(project, thisArg) {
      this.project = project;
      this.thisArg = thisArg;
    }
    MapOperator.prototype.call = function (subscriber, source) {
      return source.subscribe(new MapSubscriber(subscriber, this.project, this.thisArg));
    };
    return MapOperator;
  }());
  var MapSubscriber = /*@__PURE__*/ (function (_super) {
    __extends(MapSubscriber, _super);
    function MapSubscriber(destination, project, thisArg) {
      var _this = _super.call(this, destination) || this;
      _this.project = project;
      _this.count = 0;
      _this.thisArg = thisArg || _this;
      return _this;
    }
    MapSubscriber.prototype._next = function (value) {
      var result;
      try {
        result = this.project.call(this.thisArg, value, this.count++);
      }
      catch (err) {
        this.destination.error(err);
        return;
      }
      this.destination.next(result);
    };
    return MapSubscriber;
  }(Subscriber));

  /** PURE_IMPORTS_START _Observable,_AsyncSubject,_operators_map,_util_canReportError,_util_isArray,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_AsyncSubject,_operators_map,_util_canReportError,_util_isScheduler,_util_isArray PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _hostReportError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_subscribeToArray,_subscribeToPromise,_subscribeToIterable,_subscribeToObservable,_isArrayLike,_isPromise,_isObject,_symbol_iterator,_symbol_observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _InnerSubscriber,_subscribeTo PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_util_isScheduler,_util_isArray,_OuterSubscriber,_util_subscribeToResult,_fromArray PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _symbol_observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _symbol_iterator PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_Subscription,_util_subscribeToPromise PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_iterator,_util_subscribeToIterable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_Subscription,_symbol_observable,_util_subscribeToObservable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_isPromise,_util_isArrayLike,_util_isInteropObservable,_util_isIterable,_fromArray,_fromPromise,_fromIterable,_fromObservable,_util_subscribeTo PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_util_subscribeToResult,_OuterSubscriber,_InnerSubscriber,_map,_observable_from PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _mergeMap,_util_identity PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _mergeAll PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _of,_operators_concatAll PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_from,_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Observable,_util_isArray,_empty,_util_subscribeToResult,_OuterSubscriber,_operators_map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_isArray,_util_isFunction,_operators_map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_isArray,_util_isFunction,_operators_map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_identity,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _defer,_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _isArray PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_scheduler_async,_util_isNumeric PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_isScheduler,_operators_mergeAll,_fromArray PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_util_noop PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_from,_util_isArray,_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_Subscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_util_isArray,_fromArray,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_scheduler_async,_util_isNumeric,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Observable,_from,_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_fromArray,_util_isArray,_Subscriber,_OuterSubscriber,_util_subscribeToResult,_.._internal_symbol_iterator PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _scheduler_async,_audit,_observable_timer PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_scheduler_async,_Subscriber,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscription,_util_subscribeToResult,_OuterSubscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscription,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_combineLatest PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_isArray,_observable_combineLatest,_observable_from PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_concat PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _mergeMap PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _concatMap PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_scheduler_async PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_scheduler_async,_util_isDate,_Subscriber,_Notification PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_Observable,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _distinctUntilChanged PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_util_noop,_util_isFunction PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _tap,_util_EmptyError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_util_ArgumentOutOfRangeError,_observable_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_ArgumentOutOfRangeError,_filter,_throwIfEmpty,_defaultIfEmpty,_take PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_fromArray,_observable_scalar,_observable_empty,_observable_concat,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult,_map,_observable_from PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_Subscription PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _operators_find PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_EmptyError,_filter,_take,_defaultIfEmpty,_throwIfEmpty,_util_identity PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_util_ArgumentOutOfRangeError,_observable_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_EmptyError,_filter,_takeLast,_throwIfEmpty,_defaultIfEmpty,_util_identity PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_Notification PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _scan,_takeLast,_defaultIfEmpty,_util_pipe PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _reduce PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_merge PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _mergeMap PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_util_subscribeToResult,_OuterSubscriber,_InnerSubscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _reduce PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_ConnectableObservable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_observable_from,_util_isArray,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_not,_filter PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _Subject,_multicast PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _BehaviorSubject,_multicast PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _AsyncSubject,_multicast PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _ReplaySubject,_multicast PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _util_isArray,_observable_race PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_observable_empty PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_scheduler_async PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _multicast,_refCount,_Subject PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _ReplaySubject PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_util_EmptyError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_util_ArgumentOutOfRangeError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_fromArray,_observable_scalar,_observable_empty,_observable_concat,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Observable,_scheduler_asap,_util_isNumeric PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_SubscribeOnObservable PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_InnerSubscriber,_util_subscribeToResult,_map,_observable_from PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _switchMap,_util_identity PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _switchMap PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_scheduler_async,_throttle PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _scheduler_async,_scan,_observable_defer,_map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_scheduler_async,_util_isDate,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _scheduler_async,_util_TimeoutError,_timeoutWith,_observable_throwError PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _scheduler_async,_map PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _reduce PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subscriber,_Subject PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_scheduler_async,_Subscriber,_util_isNumeric,_util_isScheduler PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_Subscription,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_Subject,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START tslib,_OuterSubscriber,_util_subscribeToResult PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_zip PURE_IMPORTS_END */

  /** PURE_IMPORTS_START _observable_zip PURE_IMPORTS_END */

  /** PURE_IMPORTS_START  PURE_IMPORTS_END */

  function say(x) {
    console.log(x.msg);
  }

  var x = of('Hello');
  var y = x.pipe(map(function (s) { return s + "!"; }));
  say({ msg: 'Hello' });

}));
//# sourceMappingURL=main.js.map
