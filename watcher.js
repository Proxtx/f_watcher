export const watcher = (obj = {}) => {
  const handlers = {
    get: function (target, key) {
      if (key != "watcher") {
        target.watcher.notify("get", ...arguments);
        if (typeof target[key] === "object" && !Array.isArray(target[key])) {
          let nestedWatcher = watcher.create(target[key]);
          nestedWatcher.watcher.addListener("any", function () {
            target.watcher.notify.bind(target.watcher)(...arguments);
          });
          return nestedWatcher;
        }
      }

      return target[key];
    },
    set: function (target, key, value) {
      target[key] = value;

      if (key != "watcher") {
        target.watcher.notify("set", ...arguments);
      }

      return value;
    },
  };

  let watchObj = new Proxy(obj, handlers);
  watchObj.watcher = {};
  watchObj.watcher.eventWatchers = { get: [], set: [], any: [], custom: {} };
  watchObj.watcher.addListener = function () {
    const job = arguments[0];
    for (let i = 1; i < arguments.length; i++) {
      if (arguments[i]) {
        switch (arguments[i]) {
          case "get":
            this.eventWatchers.get.push(job);
            break;

          case "set":
            this.eventWatchers.set.push(job);
            break;

          case "any":
            this.eventWatchers.any.push(job);
            break;

          default:
            this.eventWatchers.custom[arguments[i]]
              ? this.eventWatchers.custom[arguments[i]].push(job)
              : (this.eventWatchers.custom[arguments[i]] = [job]);
        }
      }
    }
    return watchObj;
  };

  watchObj.watcher.sync = function (target) {
    if (!target.watcher) return;
    for (let i = 1; i < arguments.length; i++) {
      this[arguments[i]] = target[arguments[i]];
      target.watcher.addListener(
        arguments[i],
        function (type, target, key, value) {
          if (type == "set") {
            this[key] = value;
          }
        }.bind(watchObj)
      );
    }
    return watchObj;
  }.bind(watchObj);

  watchObj.watcher.notify = function (type, target, key) {
    for (let i in this.eventWatchers[type]) {
      this.eventWatchers[type][i](...arguments);
    }
    for (let i in this.eventWatchers.any) {
      this.eventWatchers.any[i](...arguments);
    }
    for (let i in this.eventWatchers.custom[key]) {
      this.eventWatchers.custom[key][i](...arguments);
    }
  };

  return watchObj;
};
