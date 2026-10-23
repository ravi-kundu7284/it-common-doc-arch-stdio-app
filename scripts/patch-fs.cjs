// scripts/patch-fs.cjs
const fs = require("fs");
const path = require("path");

if (!process.env.NODE_OPTIONS || !process.env.NODE_OPTIONS.includes("patch-fs.cjs")) {
  process.env.NODE_OPTIONS = `${process.env.NODE_OPTIONS || ""} -r ${path.resolve(__dirname, "patch-fs.cjs")}`.trim();
}

const origPromisesMkdir = fs.promises.mkdir;
fs.promises.mkdir = async function (p, options) {
  for (let i = 0; i < 8; i++) {
    try {
      return await origPromisesMkdir.call(fs.promises, p, options);
    } catch (err) {
      if ((err.code === "EPERM" || err.code === "EBUSY") && i < 7) {
        await new Promise((r) => setTimeout(r, 60 * (i + 1)));
      } else {
        throw err;
      }
    }
  }
};

const origMkdir = fs.mkdir;
fs.mkdir = function (p, options, callback) {
  if (typeof options === "function") {
    callback = options;
    options = {};
  }
  const attempt = (retries = 8) => {
    origMkdir.call(fs, p, options, (err) => {
      if (err && (err.code === "EPERM" || err.code === "EBUSY") && retries > 0) {
        setTimeout(() => attempt(retries - 1), 60 * (9 - retries));
      } else {
        if (callback) callback(err);
      }
    });
  };
  attempt();
};

const origMkdirSync = fs.mkdirSync;
fs.mkdirSync = function (p, options) {
  for (let i = 0; i < 8; i++) {
    try {
      return origMkdirSync.call(fs, p, options);
    } catch (err) {
      if ((err.code === "EPERM" || err.code === "EBUSY") && i < 7) {
        const start = Date.now();
        while (Date.now() - start < 50) {}
      } else {
        throw err;
      }
    }
  }
};
