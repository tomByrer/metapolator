(function(
  // Reliable reference to the global object (i.e. window in browsers).
  global,

  // Dummy constructor that we use as the .constructor property for
  // functions that return Generator objects.
  GeneratorFunction
) {
  var hasOwn = Object.prototype.hasOwnProperty;
  var undefined; // More compressible than void 0.
  var iteratorSymbol =
    typeof Symbol === "function" && Symbol.iterator || "@@iterator";

  try {
    // Make a reasonable attempt to provide a Promise polyfill.
    var Promise = global.Promise || (global.Promise = require("promise"));
  } catch (ignored) {}

  if (global.regeneratorRuntime) {
    return;
  }

  var runtime = global.regeneratorRuntime =
    typeof exports === "undefined" ? {} : exports;

  function wrap(innerFn, outerFn, self, tryList) {
    return new Generator(innerFn, outerFn, self || null, tryList || []);
  }
  runtime.wrap = wrap;

  var GenStateSuspendedStart = "suspendedStart";
  var GenStateSuspendedYield = "suspendedYield";
  var GenStateExecuting = "executing";
  var GenStateCompleted = "completed";

  // Returning this object from the innerFn has the same effect as
  // breaking out of the dispatch switch statement.
  var ContinueSentinel = {};

  var Gp = Generator.prototype;
  var GFp = GeneratorFunction.prototype = Object.create(Function.prototype);
  GFp.constructor = GeneratorFunction;
  GFp.prototype = Gp;
  Gp.constructor = GFp;

  runtime.mark = function(genFun) {
    genFun.__proto__ = GFp;
    genFun.prototype = Object.create(Gp);
    return genFun;
  };

  runtime.async = function(innerFn, outerFn, self, tryList) {
    return new Promise(function(resolve, reject) {
      var generator = wrap(innerFn, outerFn, self, tryList);
      var callNext = step.bind(generator.next);
      var callThrow = step.bind(generator.throw);

      function step(arg) {
        try {
          var info = this(arg);
          var value = info.value;
        } catch (error) {
          return reject(error);
        }

        if (info.done) {
          resolve(value);
        } else {
          Promise.resolve(value).then(callNext, callThrow);
        }
      }

      callNext();
    });
  };

  // Ensure isGeneratorFunction works when Function#name not supported.
  if (GeneratorFunction.name !== "GeneratorFunction") {
    GeneratorFunction.name = "GeneratorFunction";
  }

  runtime.isGeneratorFunction = function(genFun) {
    var ctor = genFun && genFun.constructor;
    return ctor ? GeneratorFunction.name === ctor.name : false;
  };

  function Generator(innerFn, outerFn, self, tryList) {
    var generator = outerFn ? Object.create(outerFn.prototype) : this;
    var context = new Context(tryList);
    var state = GenStateSuspendedStart;

    function invoke(method, arg) {
      if (state === GenStateExecuting) {
        throw new Error("Generator is already running");
      }

      if (state === GenStateCompleted) {
        throw new Error("Generator has already finished");
      }

      while (true) {
        var delegate = context.delegate;
        if (delegate) {
          try {
            var info = delegate.iterator[method](arg);

            // Delegate generator ran and handled its own exceptions so
            // regardless of what the method was, we continue as if it is
            // "next" with an undefined arg.
            method = "next";
            arg = undefined;

          } catch (uncaught) {
            context.delegate = null;

            // Like returning generator.throw(uncaught), but without the
            // overhead of an extra function call.
            method = "throw";
            arg = uncaught;

            continue;
          }

          if (info.done) {
            context[delegate.resultName] = info.value;
            context.next = delegate.nextLoc;
          } else {
            state = GenStateSuspendedYield;
            return info;
          }

          context.delegate = null;
        }

        if (method === "next") {
          if (state === GenStateSuspendedStart &&
              typeof arg !== "undefined") {
            // https://people.mozilla.org/~jorendorff/es6-draft.html#sec-generatorresume
            throw new TypeError(
              "attempt to send " + JSON.stringify(arg) + " to newborn generator"
            );
          }

          if (state === GenStateSuspendedYield) {
            context.sent = arg;
          } else {
            delete context.sent;
          }

        } else if (method === "throw") {
          if (state === GenStateSuspendedStart) {
            state = GenStateCompleted;
            throw arg;
          }

          if (context.dispatchException(arg)) {
            // If the dispatched exception was caught by a catch block,
            // then let that catch block handle the exception normally.
            method = "next";
            arg = undefined;
          }

        } else if (method === "return") {
          context.abrupt("return", arg);
        }

        state = GenStateExecuting;

        try {
          var value = innerFn.call(self, context);

          // If an exception is thrown from innerFn, we leave state ===
          // GenStateExecuting and loop back for another invocation.
          state = context.done
            ? GenStateCompleted
            : GenStateSuspendedYield;

          var info = {
            value: value,
            done: context.done
          };

          if (value === ContinueSentinel) {
            if (context.delegate && method === "next") {
              // Deliberately forget the last sent value so that we don't
              // accidentally pass it on to the delegate.
              arg = undefined;
            }
          } else {
            return info;
          }

        } catch (thrown) {
          state = GenStateCompleted;

          if (method === "next") {
            context.dispatchException(thrown);
          } else {
            arg = thrown;
          }
        }
      }
    }

    generator.next = invoke.bind(generator, "next");
    generator.throw = invoke.bind(generator, "throw");
    generator.return = invoke.bind(generator, "return");

    return generator;
  }

  Gp[iteratorSymbol] = function() {
    return this;
  };

  Gp.toString = function() {
    return "[object Generator]";
  };

  function pushTryEntry(triple) {
    var entry = { tryLoc: triple[0] };

    if (1 in triple) {
      entry.catchLoc = triple[1];
    }

    if (2 in triple) {
      entry.finallyLoc = triple[2];
    }

    this.tryEntries.push(entry);
  }

  function resetTryEntry(entry, i) {
    var record = entry.completion || {};
    record.type = i === 0 ? "normal" : "return";
    delete record.arg;
    entry.completion = record;
  }

  function Context(tryList) {
    // The root entry object (effectively a try statement without a catch
    // or a finally block) gives us a place to store values thrown from
    // locations where there is no enclosing try statement.
    this.tryEntries = [{ tryLoc: "root" }];
    tryList.forEach(pushTryEntry, this);
    this.reset();
  }

  runtime.keys = function(object) {
    var keys = [];
    for (var key in object) {
      keys.push(key);
    }
    keys.reverse();

    // Rather than returning an object with a next method, we keep
    // things simple and return the next function itself.
    return function next() {
      while (keys.length) {
        var key = keys.pop();
        if (key in object) {
          next.value = key;
          next.done = false;
          return next;
        }
      }

      // To avoid creating an additional object, we just hang the .value
      // and .done properties off the next function object itself. This
      // also ensures that the minifier will not anonymize the function.
      next.done = true;
      return next;
    };
  };

  function values(iterable) {
    var iterator = iterable;
    if (iteratorSymbol in iterable) {
      iterator = iterable[iteratorSymbol]();
    } else if (!isNaN(iterable.length)) {
      var i = -1;
      iterator = function next() {
        while (++i < iterable.length) {
          if (i in iterable) {
            next.value = iterable[i];
            next.done = false;
            return next;
          }
        };
        next.done = true;
        return next;
      };
      iterator.next = iterator;
    }
    return iterator;
  }
  runtime.values = values;

  Context.prototype = {
    constructor: Context,

    reset: function() {
      this.prev = 0;
      this.next = 0;
      this.sent = undefined;
      this.done = false;
      this.delegate = null;

      this.tryEntries.forEach(resetTryEntry);

      // Pre-initialize at least 20 temporary variables to enable hidden
      // class optimizations for simple generators.
      for (var tempIndex = 0, tempName;
           hasOwn.call(this, tempName = "t" + tempIndex) || tempIndex < 20;
           ++tempIndex) {
        this[tempName] = null;
      }
    },

    stop: function() {
      this.done = true;

      var rootEntry = this.tryEntries[0];
      var rootRecord = rootEntry.completion;
      if (rootRecord.type === "throw") {
        throw rootRecord.arg;
      }

      return this.rval;
    },

    dispatchException: function(exception) {
      if (this.done) {
        throw exception;
      }

      var context = this;
      function handle(loc, caught) {
        record.type = "throw";
        record.arg = exception;
        context.next = loc;
        return !!caught;
      }

      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        var record = entry.completion;

        if (entry.tryLoc === "root") {
          // Exception thrown outside of any try block that could handle
          // it, so set the completion value of the entire function to
          // throw the exception.
          return handle("end");
        }

        if (entry.tryLoc <= this.prev) {
          var hasCatch = hasOwn.call(entry, "catchLoc");
          var hasFinally = hasOwn.call(entry, "finallyLoc");

          if (hasCatch && hasFinally) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            } else if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else if (hasCatch) {
            if (this.prev < entry.catchLoc) {
              return handle(entry.catchLoc, true);
            }

          } else if (hasFinally) {
            if (this.prev < entry.finallyLoc) {
              return handle(entry.finallyLoc);
            }

          } else {
            throw new Error("try statement without catch or finally");
          }
        }
      }
    },

    _findFinallyEntry: function(finallyLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc <= this.prev &&
            hasOwn.call(entry, "finallyLoc") && (
              (entry.finallyLoc === finallyLoc || this.prev < entry.finallyLoc))) {
          return entry;
        }
      }
    },

    abrupt: function(type, arg) {
      var entry = this._findFinallyEntry();
      var record = entry ? entry.completion : {};

      record.type = type;
      record.arg = arg;

      if (entry) {
        this.next = entry.finallyLoc;
      } else {
        this.complete(record);
      }

      return ContinueSentinel;
    },

    complete: function(record) {
      if (record.type === "throw") {
        throw record.arg;
      }

      if (record.type === "break" ||
          record.type === "continue") {
        this.next = record.arg;
      } else if (record.type === "return") {
        this.rval = record.arg;
        this.next = "end";
      }

      return ContinueSentinel;
    },

    finish: function(finallyLoc) {
      var entry = this._findFinallyEntry(finallyLoc);
      return this.complete(entry.completion);
    },

    "catch": function(tryLoc) {
      for (var i = this.tryEntries.length - 1; i >= 0; --i) {
        var entry = this.tryEntries[i];
        if (entry.tryLoc === tryLoc) {
          var record = entry.completion;
          if (record.type === "throw") {
            var thrown = record.arg;
            resetTryEntry(entry, i);
          }
          return thrown;
        }
      }

      // The context.catch method must only be called with a location
      // argument that corresponds to a known catch block.
      throw new Error("illegal catch attempt");
    },

    delegateYield: function(iterable, resultName, nextLoc) {
      this.delegate = {
        iterator: values(iterable),
        resultName: resultName,
        nextLoc: nextLoc
      };

      return ContinueSentinel;
    }
  };
}).apply(this, Function("return [this, function GeneratorFunction(){}]")());
define([
    'metapolator/errors'
  , 'metapolator/rendering/glyphBasics'
  , 'metapolator/models/MOM/Glyph'
  , 'metapolator/timer'
  , 'ufojs/ufoLib/glifLib/GlyphSet'
  , 'ufojs/plistLib/main'
  , 'ufojs/plistLib/IntObject'
], function(
    errors
  , glyphBasics
  , MOMGlyph
  , timer
  , GlyphSet
  , plistLib
  , IntObject
) {
    "use strict";

    // FIXME: make this available for browsers too
    // Specify formatVersion as an int, as required by
    // unifiedfontobject.org, otherwise it becomes a 'real' in the plist.
    var metainfoV3 = {
            creator: 'org.ufojs.lib'
          , formatVersion: new IntObject(3)
        }
      , metainfoV2 = {
            creator: 'org.ufojs.lib'
          , formatVersion: new IntObject(2)
        }
      , // fontforge requires a fontinfo.plist that defines unitsPerEm
        minimalFontinfo = {
            unitsPerEm: new IntObject(1000)
          , ascender: new IntObject(800)
          , descender: new IntObject(-200)
        }

    function UFOExportController(io, project, masterName, dirName, precision) {
        this._io = io;
        this._project = project;
        this._masterName = masterName;
        this._dirName = dirName;
        this._precision = precision;
    }
    var _p = UFOExportController.prototype;

    _p.exportGenerator = regeneratorRuntime.mark(function callee$1$0() {
        var model, master, glyphs, glyphSet, glyph, drawFunc, updatedUFOData, i, l, v, ki, kil, k, keys, style, time, one, total;

        return regeneratorRuntime.wrap(function callee$1$0$(context$2$0) {
            while (1) switch (context$2$0.prev = context$2$0.next) {
            case 0:
                model = this._project.open(this._masterName), master = model.query('master#' + this._masterName), glyphs = master.children, total = 0;

                console.warn('setting up UFO directory structure...');

                // create a bare ufoV2 directory
                this._io.mkDir(false, this._dirName);

                // create dirName/metainfo.plist
                this._io.writeFile(false, this._dirName+'/metainfo.plist'
                                        , plistLib.createPlistString(metainfoV2));

                // fontforge requires a fontinfo.plist that defines unitsPerEm
                this._io.writeFile(false, this._dirName+'/fontinfo.plist'
                                        , plistLib.createPlistString(minimalFontinfo));

                this._io.mkDir(false, this._dirName+'/glyphs');
                this._io.writeFile(false, this._dirName+'/glyphs/contents.plist', plistLib.createPlistString({}));

                glyphSet = GlyphSet.factory(false, this._io, this._dirName+'/glyphs', undefined, 2);

                console.warn('exporting glyphs...');
                i = 0,l=glyphs.length;
            case 11:
                if (!(i < l)) {
                    context$2$0.next = 42;
                    break;
                }

                glyph = glyphs[i];
                style = model.getComputedStyle(glyph);
                time = timer.now();
                drawFunc = glyphBasics.drawGlyphToPointPen.bind(
                    this
                  , {
                          penstroke: glyphBasics.renderPenstrokeOutline
                        , contour: glyphBasics.renderContour
                    }
                  , model, glyph);

                // Allow the glyph ufo data to be updated by the CPS.
                updatedUFOData = glyph.getUFOData();
                keys = Object.keys(updatedUFOData);
                ki=0,kil=keys.length;
            case 19:
                if (!(ki < kil)) {
                    context$2$0.next = 33;
                    break;
                }

                context$2$0.prev = 20;
                k = keys[ki];
                v = style.get(MOMGlyph.convertUFOtoCPSKey(k));
                updatedUFOData[k] = v;
                context$2$0.next = 30;
                break;
            case 26:
                context$2$0.prev = 26;
                context$2$0.t0 = context$2$0.catch(20);

                if (context$2$0.t0 instanceof errors.Key) {
                    context$2$0.next = 30;
                    break;
                }

                throw context$2$0.t0;
            case 30:
                ki++;
                context$2$0.next = 19;
                break;
            case 33:
                glyphSet.writeGlyph(false, glyph.id, updatedUFOData, drawFunc,
                                          undefined, {precision: this._precision});
                one = timer.now() - time;
                total += one;
                console.warn('exported', glyph.id, 'this took', one,'ms');
                context$2$0.next = 39;
                return {'current_glyph':i, 'total_glyphs':l, 'glyph_id':glyph.id};
            case 39:
                i++;
                context$2$0.next = 11;
                break;
            case 42:
                console.warn('finished ', i, 'glyphs in', total
                    , 'ms\n\tthat\'s', total/i, 'per glyph\n\t   and'
                    , (1000 * i / total)  ,' glyphs per second.'
                );
                glyphSet.writeContents(false);
            case 44:
            case "end":
                return context$2$0.stop();
            }
        }, callee$1$0, this, [[20, 26]]);
    });

    _p.doExport = function() {
        var gen = this.exportGenerator();
        while(!(gen.next().done));
    };

    return UFOExportController;
});
