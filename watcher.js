export const watcher = (obj = {}) => {
  const handlers = {
    get: function (target, key) {
      if (key != "watcher") {
        target.watcher.notify({ operation: "get", target, key, nested: false });
        if (typeof target[key] === "object" && !Array.isArray(target[key])) {
          let nestedWatcher = target[key].watcher
            ? target[key]
            : watcher(target[key]);
          nestedWatcher.watcher.addListener(function (notify) {
            target.watcher.notify.bind(target.watcher)({
              target,
              key,
              nested: true,
              event: notify,
              operation: notify.operation,
            });
          }, "any");
          return nestedWatcher;
        }
      }

      return target[key];
    },
    set: function (target, key, value) {
      target[key] = value;

      if (key != "watcher") {
        target.watcher.notify({
          operation: "set",
          target,
          key,
          value,
          nested: false,
        });
      }

      return value || true;
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
        function (notify) {
          if (notify.operation == "set") {
            this[notify.key] = notify.value;
          }
        }.bind(watchObj),
        "set"
      );
    }
    return watchObj;
  }.bind(watchObj);

  watchObj.watcher.notify = function (notify) {
    for (let i in this.eventWatchers[notify.operation]) {
      this.eventWatchers[notify.operation][i](notify);
    }
    for (let i in this.eventWatchers.any) {
      this.eventWatchers.any[i](notify);
    }
    for (let i in this.eventWatchers.custom[notify.key]) {
      this.eventWatchers.custom[notify.key][i](notify);
    }
  };

  watchObj.watcher.replace = function (obj, apply = false) {
    const keys = Object.keys(this);
    for (let i in obj) {
      this[i] = obj[i];
    }
    if (apply) return;
    for (let i in keys) {
      if (keys[i] == "watcher") continue;
      obj[keys[i]] == undefined && delete this[keys[i]];
    }
  }.bind(watchObj);

  return watchObj;
};
