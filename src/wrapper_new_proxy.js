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
  this.cache = new WeakMap();
}

Wrapper.prototype.wrap = function (source, accessPath, level, sourceReceiver, proxyReceiver) {
  if (!source) {
    return source;
  }

  if (!level) {
    level = 0;
  }

  if (level > 9) {
    this.log('[WARNING] Interrupt wrapping the object: ' + accessPath)
    return source;
  }

  if (source instanceof Object) {
    let proxy = this.cache.get(source);
    if (proxy) {
      // we already wrapped the object
      this.log('CACHED!')
      return proxy;
    }

    const wrapperThis = this;
    proxy = new Proxy(source, {
      sourceReceiver,
      proxyReceiver,
      getPropertyDescriptorEx(target, prop) {
        while (target) {
          const descriptor = ObjectGetOwnPropertyDescriptor(target, prop);
          if (descriptor) {
            return descriptor;
          }

          target = ReflectGetPrototypeOf(target);
        }

        return undefined;
      },
      get(target, prop, receiver) {
        const propStr = typeof prop === 'symbol' ? `[symbol]${prop.toString()}` : prop;
        let value = undefined;
        try {
          // it could be a getter call that can throw an exeption
          value = target[prop];
        } catch {}

        if (!value) {
          return value;
        }

        const descriptor = this.getPropertyDescriptorEx(target, prop);
        if (!descriptor) {
          wrapperThis.log(`[WARNING] The property ${accessPath + '.' + propStr} cannot be wrapped due to descriptor is ${descriptor}`);
          return value;
        }

        if ((!descriptor.configurable || !descriptor.writable) || prop === 'prototype' || prop === 'builtinIds') {
          // https://stackoverflow.com/a/75150991
          return value;
        }

        return wrapperThis.wrap(value, accessPath + '.' + propStr, level + 1, target, receiver);
      },
      apply: function (target, thisArg, args) {
        const accessPathNew = accessPath + '()';
        const needToWrap = wrapperThis.beforeFunc(accessPathNew, args);
        const ret = ReflectApply(target, thisArg === this.proxyReceiver ? sourceReceiver : thisArg, args);
        if (wrapperThis.afterFunc) {
          wrapperThis.afterFunc(accessPathNew, args, ret);
        }

        if (needToWrap) {
          return wrapperThis.wrap(ret, accessPathNew, level + 1); // TODO: should we pass sourceReceiver, proxyReceiver?
        } else {
          return ret;
        }
      },
      construct(target, args, newTarget) {
        const accessPathNew = accessPath + '.ctor()';
        const needToWrap = wrapperThis.beforeFunc(accessPathNew, args);
        const ret = ReflectConstruct(target, args, newTarget);
        if (wrapperThis.afterFunc) {
          wrapperThis.afterFunc(accessPathNew, args, ret);
        }

        if (needToWrap) {
          return wrapperThis.wrap(ret, accessPathNew, level + 1); // TODO: should we pass sourceReceiver, proxyReceiver?
        } else {
          return ret;
        }
      }
    });

    // if (source.prototype) {
    //   Reflect.setPrototypeOf(source, this.wrap(source.prototype, accessPath + '.prototype', level + 1));
    // }

    this.cache.set(source, proxy);
    return proxy;
  }

  // seems it is a primitive value
  return source;
}
// %PLACEHOLDER% SKIP
module.exports = Wrapper;
