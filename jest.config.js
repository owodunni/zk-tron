const fs = require("fs");
const path = require("path");

const getProjects = function () {
  return fs
    .readdirSync(path.resolve(__dirname) + "/packages", { withFileTypes: true })
    .map((dirent) => `packages/${dirent.name}/jest.config.js`)
    .filter((file) => fs.existsSync(file))
    .map((file) => `<rootDir>/${file}`);
};

module.exports = {
  projects: getProjects(),
};
