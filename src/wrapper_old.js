// %PLACEHOLDER% SKIP
// TODO:
// - test arrays
// - wrap async functions
// - checking frezed objs
// - checking writable === false properties
// - support inheretence
// - key of undefined (and other) properties may be Symbol. we need to support these cases!
// %PLACEHOLDER% END
function Wrapper(logCallback, beforeFuncCallback, afterFuncCallback) {
  this.log = logCallback;
  this.beforeFunc = beforeFuncCallback;
  this.afterFunc = afterFuncCallback;
  this.cache = new WeakSet();
}

Wrapper.prototype.wrapPrototype = function (source, accessPath, level) {
  const proto = ReflectGetPrototypeOf(source);
  if (proto) {
    if (proto === ArrayPrototype ||
        proto === ArrayBufferPrototype ||
        proto === AsyncIteratorPrototype ||
        proto === BigIntPrototype ||
        proto === BigInt64ArrayPrototype ||
        proto === BigUint64ArrayPrototype ||
        proto === BooleanPrototype ||
        proto === DataViewPrototype ||
        proto === DatePrototype ||
        proto === ErrorPrototype ||
        proto === EvalErrorPrototype ||
        proto === Float32ArrayPrototype ||
        proto === Float64ArrayPrototype ||
        proto === FunctionPrototype ||
        proto === Int16ArrayPrototype ||
        proto === Int32ArrayPrototype ||
        proto === Int8ArrayPrototype ||
        proto === MapPrototype ||
        proto === NumberPrototype ||
        proto === ObjectPrototype ||
        proto === RangeErrorPrototype ||
        proto === ReferenceErrorPrototype ||
        proto === RegExpPrototype ||
        proto === SetPrototype ||
        proto === StringPrototype ||
        proto === SymbolPrototype ||
        proto === SyntaxErrorPrototype ||
        proto === TypeErrorPrototype ||
        proto === URIErrorPrototype ||
        proto === Uint16ArrayPrototype ||
        proto === Uint32ArrayPrototype ||
        proto === Uint8ArrayPrototype ||
        proto === Uint8ClampedArrayPrototype ||
        proto === WeakMapPrototype ||
        proto === WeakSetPrototype ||
        proto === PromisePrototype) {
      return;
    }

    this.wrap(proto, accessPath + '.__proto__', level + 1);
  }
}

Wrapper.prototype.wrapProperty = function (source, key, dest, accessPath, level) {
  const descriptor = ObjectGetOwnPropertyDescriptor(source, key);
  if (descriptor) {
    let keyString;
    if (typeof key === 'symbol') {
      keyString = `[symbol]${key.toString()}`
    } else {
      // key should be string
      keyString = key;
    }

    if (ObjectPrototypeHasOwnProperty(descriptor, 'value')) {
      const wrappedValue = this.wrap(descriptor.value, accessPath + '.' + keyString, level + 1);
      if (source !== dest) {
        ObjectDefineProperty(dest, key, {
          enumerable: descriptor.enumerable,
          configurable: descriptor.configurable,
          writable: descriptor.writable,
          value: wrappedValue
        });
      } else if (typeof descriptor.value === 'function') {
        if (descriptor.configurable) {
          ObjectDefineProperty(dest, key, {
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable,
            writable: descriptor.writable,
            value: wrappedValue
          });
        } else if (descriptor.writable) {
          dest[key] = wrappedValue;
        } else {
          this.log('[WARNING] Not replaced the property: ' + accessPath + '.' + keyString);
        }
      }
    }
    else {
      if (source !== dest || descriptor.configurable) {
        let wrappedGetter;
        if (descriptor.get) {
          wrappedGetter = this.wrap(descriptor.get, accessPath + '.[getter]' + keyString, level + 1);
        }

        let wrappedSetter;
        if (descriptor.set) {
          wrappedSetter = this.wrap(descriptor.set, accessPath + '.[setter]' + keyString, level + 1);
        }

        ObjectDefineProperty(dest, key, {
            enumerable: descriptor.enumerable,
            configurable: descriptor.configurable,
            get: wrappedGetter,
            set: wrappedSetter
        })
      } else {
        this.log(`[WARNING] The property ${accessPath + '.' + keyString} cannot be wrapped due to configurable is ${descriptor.configurable}`)
      }
    }
  }
}

Wrapper.prototype.wrap = function (source, accessPath, level = 0) {
  if (!source) {
    return source;
  }

  if (level > 9) {
    this.log('[WARNING] Interrupt wrapping the object: ' + accessPath)
    return source;
  }

  if (typeof source === 'function') {
    if (source.constructor.name === "AsyncFunction") {
      // TODO: don't support async functions for now
      return source;
    }

    if (this.cache.has(source)) {
      // we already wrapped the function
      return source;
    }

    if (source.constructor.name === 'GeneratorFunction' ||
        source.constructor.name === 'AsyncGeneratorFunction') {
      // https://stackoverflow.com/a/19660350/1815957
      // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Generator
      // https://javascript.info/generators
      this.log('[WARNING] Not support Generator functions');
      return source;
    }

    const wrapperThis = this;
    const f = function () {
      let accessPathNew = accessPath + '()';
      // if (!accessPath.includes('(') && arguments.length > 0) {
      //   accessPathNew = accessPath + `('${arguments[0]}')`;
      // } else {
      //   accessPathNew = accessPath + '()';
      // }

      const needToWrap = wrapperThis.beforeFunc(accessPathNew, arguments);
      let ret;
      if (new.target) {
        const newTarget = ReflectGetPrototypeOf(this).constructor;
        ret = ReflectConstruct(source, arguments, newTarget);
      } else {
        ret = ReflectApply(source, this, arguments);
      }

      if (wrapperThis.afterFunc) {
        wrapperThis.afterFunc(accessPathNew, arguments, ret);
      }

      if (needToWrap) {
        return wrapperThis.wrap(ret, accessPathNew, level + 1);
      } else {
        return ret;
      }
    }

    if (source.name && source.name != '') {
      ObjectDefineProperty(f, 'name', { value: source.name, writable: false });
    }

    // if source is a class, then properties are static members
    for (const key of ReflectOwnKeys(source)) {
      if (key === 'length' ||
          key === 'name' ||
          key === 'prototype') {
        // ignore built-in properties of functions
        continue;
      }

      this.wrapProperty(source, key, f, accessPath + '.' + source.name, level);
    }

    if (source.prototype) {
      f.prototype = ObjectCreate(source.prototype,
        { constructor: { value: f, enumerable: false, writable: true, configurable: true } }); // TODO: source.prototype.__proto__ must by Object.prototype
      for (const key of ReflectOwnKeys(source.prototype)) {
        if (key === 'constructor') {  // recursive link to the function `source`
          ObjectDefineProperty(f.prototype, 'constructor', {
            enumerable: false,
            configurable: true,
            writable: true,
            value: f
          })
        } else {
          this.wrapProperty(source.prototype, key, f.prototype, accessPath + '.' + source.name + '.prototype', level);
        }
      }
    }
    else {
      f.prototype = null;
    }

    this.cache.add(f);
    return f;
  }

  if (typeof source === 'object') {
    if (this.cache.has(source)) {
      return source;
    }

    this.cache.add(source);
    // HOW to wrap arrays?
    this.wrapPrototype(source, accessPath, level);
    for (const key of ReflectOwnKeys(source)) {
      this.wrapProperty(source, key, source, accessPath, level);
    }

    return source;
  }

  // seems it is a primitive value
  return source;
}
// %PLACEHOLDER% SKIP
module.exports = Wrapper;
