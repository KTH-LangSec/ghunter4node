function createProxy(name) {
  const proto = Object.create(null);
  Object.defineProperty(proto, 'hasOwnProperty', {
    value: function(prop) {
      return Object.prototype.hasOwnProperty.call(this, prop);
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  Object.defineProperty(proto, 'isPrototypeOf', {
    value: function(object) {
      return Object.prototype.isPrototypeOf.call(this, object);
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  Object.defineProperty(proto, 'propertyIsEnumerable', {
    value: function(prop) {
      return Object.prototype.propertyIsEnumerable.call(this, prop);
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  /*to support for-of loop*/
  Object.defineProperty(proto, Symbol.iterator, {
    value: function* () {
      yield '0xEFFACED';
    },
    configurable: false,
    enumerable: false,
    writable: false
  });

  /*toPrimitive is called in `${proxy}`*/
  Object.defineProperty(proto, Symbol.toPrimitive, {
    value: function(hint) {
      if (hint === "number") {
        return this.n;
      }

      return '0xEFFACED';
    },
    configurable: false,
    enumerable: false,
    writable: false
  });

  /*TODO: what we want to return*/
  Object.defineProperty(proto, 'valueOf', {
    value: function() {
      return this.n;
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  Object.defineProperty(proto, 'toLocaleString', {
    value: function() {
      return '0xEFFACED';
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  Object.defineProperty(proto, 'toString', {
    value: function() {
      return '0xEFFACED';
    },
    configurable: true,
    enumerable: false,
    writable: true
  });

  const target = Object.create(proto);
  target.__effaced = name;
  target.n = 0xEFFACED;

  return new Proxy(target, {
    get(target, prop, receiver) {
      if (prop === '__proto__') {
        return Object.getPrototypeOf(target);
      }

      if (!Object.hasOwn(target, prop) && !Object.hasOwn(Object.getPrototypeOf(target), prop)) {
        let count = 0;
        for (let i = 0; i < target.__effaced.length; i++) {
          if (target.__effaced[i] == '.')
            count++;
        }

        if (count >= 9)
          return undefined;

        let propString = '';
        if (typeof prop === 'symbol') {
            propString = `[symbol]${prop.toString()}`;
        } else {
          propString = prop;
        }

        target[prop] = createProxy(target.__effaced + '.' + propString);
      }

      return target[prop];
    },

    set(obj, prop, value) {
      if (prop === '__proto__') {
        Object.setPrototypeOf(obj, value);
      } else {
        obj[prop] = value;
      }
    }
  })
}
