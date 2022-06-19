/**
 * This is a node script to merge cobertura reports in XML format.
 * It requires `xml2js` : `npm i -D xml2js`
 *
 * Execute with:
 * ```
 * node merge-cobertura.js coverage/file1.xml coverage/file2.xml to=coverage-final.xml
 * ```
 * @see https://github.com/Leonidas-from-XIV/node-xml2js
 * @author Jérémy Legros
 * @license MIT
 */
(function () {
  "use strict";

  const fs = require("fs");
  const xml2js = require("xml2js");

  main();

  /**
   * Run merge
   */
  function main() {
    const files = process.argv;
    files.splice(0, 2);

    let destFile = "cobertura-merged.xml";
    let srcFiles = [];

    files.forEach((arg) => {
      if (arg.indexOf("=") > -1) {
        destFile = getDestinationFileFromArg(arg);
      } else {
        srcFiles.push(arg);
      }
    });

    console.log("merge-cobertura *", srcFiles, "to", destFile);

    let srcFilesJson = srcFiles
      .map((file) => (file.startsWith("/") ? file : "/" + file))
      .map((file) => getFileContent(file));
    if (srcFilesJson.length === 0) {
      throw new Error("You need to specify some files to merge.");
    }
    // use first file as reducer function initial value
    const firstFile = srcFilesJson[0];
    srcFilesJson.splice(0, 1);

    // Actually merge JSON reports
    const destJson = srcFilesJson.reduce(
      (acc, obj) => mergeReportValues(acc, obj),
      firstFile,
    );

    // Build destination file
    const buildOptions = {
      doctype: {
        sysID: "http://cobertura.sourceforge.net/xml/coverage-04.dtd",
      },
    };
    buildDestinationFile(destJson, destFile, buildOptions);

    if (srcFilesJson.length === 0) {
      console.log("merge-cobertura * Trivially copied the file to destination");
    } else {
      console.log("merge-cobertura *", srcFilesJson.length + 1, "files merged");
    }
  }

  function buildDestinationFile(destJson, destFile, buildOptions = undefined) {
    const builder = new xml2js.Builder(buildOptions);
    const xmlDest = builder.buildObject(destJson);
    const destFileName = destFile.startsWith("/") ? destFile : "/" + destFile;
    fs.writeFile(process.cwd() + destFileName, xmlDest, (err) => {
      if (err) {
        console.error("Error while writing", err);
        throw err;
      }
    });
  }

  /**
   * Return a report that is a merge from report1 and report2
   * @param {any} report1
   * @param {any} report2
   */
  function mergeReportValues(report1, report2) {
    let report = { ...report1 };
    report.coverage.$["lines-valid"] = addString(
      report1.coverage.$["lines-valid"],
      report2.coverage.$["lines-valid"],
    );
    report.coverage.$["lines-covered"] = addString(
      report1.coverage.$["lines-covered"],
      report2.coverage.$["lines-covered"],
    );
    report.coverage.$["line-rate"] = ratioString(
      report1.coverage.$["lines-covered"],
      report1.coverage.$["lines-valid"],
      4,
    );
    report.coverage.$["branches-valid"] = addString(
      report1.coverage.$["branches-valid"],
      report2.coverage.$["branches-valid"],
    );
    report.coverage.$["branches-covered"] = addString(
      report1.coverage.$["branches-covered"],
      report2.coverage.$["branches-covered"],
    );
    report.coverage.$["branch-rate"] = ratioString(
      report1.coverage.$["branches-covered"],
      report1.coverage.$["branches-valid"],
      4,
    );
    // report1.coverage.sources[0] = [...report1.coverage.sources[0], ...report2.coverage.sources[0]];
    report.coverage.packages[0] = {
      package: filterBestPackages(
        report1.coverage.packages[0].package,
        report2.coverage.packages[0].package,
      ),
    };
    report.coverage.$["timestamp"] = Date.now();
    return report;
  }

  /**
   * Add prefix for packages, assuming they are inside an "src" folder for each app or lib
   * @param {any[]} packages1
   * @param {any[]} packages2
   */
  function filterBestPackages(packages1, packages2) {
    const packMap1 = arrayToKeyedObject(
      processPackageNames(packages1),
      "$",
      "name",
    );
    const packMap2 = arrayToKeyedObject(
      processPackageNames(packages2),
      "$",
      "name",
    );
    let obj = {};
    // merge the best
    Object.keys(packMap1).forEach((name) => {
      if (packMap2[name]) {
        obj[name] = best(packMap1[name], packMap2[name]);
        delete packMap2[name];
      } else {
        obj[name] = packMap1[name];
      }
    });
    // add remaning tests from packMap2
    obj = { ...obj, ...packMap2 };
    // return results in alpha order
    return Object.values(obj).sort((a, b) => {
      return a["$"].name > b["$"].name ? 1 : b["$"].name > a["$"].name ? -1 : 0;
    });
  }

  /**
   * Pick best value
   * @param {any} test1
   * @param {any} test2
   */
  function best(test1, test2) {
    if (
      +test1["$"]["line-rate"] >= +test2["$"]["line-rate"] &&
      +test1["$"]["branch-rate"] >= +test2["$"]["branch-rate"]
    ) {
      return { ...test1 };
    } else if (
      +test2["$"]["line-rate"] >= +test1["$"]["line-rate"] &&
      +test2["$"]["branch-rate"] >= +test1["$"]["branch-rate"]
    ) {
      return { ...test2 };
    } else {
      throw new Error(
        `Unable to define *best* coverage for ${test1["$"].name}`,
      );
    }
  }

  function arrayToKeyedObject(arr, ...key) {
    return arr.reduce((acc, item) => {
      return {
        [item[key[0]][key[1]]]: item,
        ...acc,
      };
    }, {});
  }

  /**
   * Add prefix for packages, assuming they are inside an "src" folder for each app or lib
   * @param {any[]} packages
   */
  function processPackageNames(packages) {
    return packages.map((p) => {
      const newPack = { ...p };
      const fileName = newPack.classes[0].class[0]["$"].filename;
      const packagePrefix = fileName
        .substring(0, fileName.indexOf("src"))
        .replace(/\\/g, ".");
      if (!newPack["$"].name.startsWith(packagePrefix)) {
        newPack["$"].name = packagePrefix + newPack["$"].name;
      }
      // console.log('-> ', newPack['$'].name);
      return newPack;
    });
  }

  /**
   * Get file content as JS object
   * @param {string} fileName
   */
  function getFileContent(fileName) {
    let obj;
    console.log("merge-cobertura * reading", process.cwd() + fileName);
    const data = fs.readFileSync(process.cwd() + fileName, "utf-8", (err) => {
      if (err) {
        console.error("Error while reading", err);
        throw err;
      }
    });
    obj = xmlToJson(data);
    return obj;
  }

  /**
   * Add up the 2 values and returns a string value
   * @param {string} val1
   * @param {string} val2
   */
  function addString(val1, val2) {
    return String(parseInt(val1) + parseInt(val2));
  }

  function ratioString(num1, num2, dec) {
    const num = parseInt(num1) / parseInt(num2);
    return String(Math.round(num * Math.pow(10, dec)) / Math.pow(10, dec));
  }

  /**
   * Format XML content to JSON
   * @param {string} data XML string convertable to string
   */
  function xmlToJson(data, parserOptions = undefined) {
    const parser = new xml2js.Parser(parserOptions);
    let parsed;
    parser.parseString(data, (err, result) => {
      if (err) {
        console.error("Error while parsing", err);
        throw err;
      }
      parsed = result;
    });
    return parsed;
  }

  function getDestinationFileFromArg(arg) {
    const arr = arg.split("=");
    if (arr[0] !== "to") {
      throw new Error(
        `Unsupported argument '${arr[0]}'. Specify destination with 'to' key`,
      );
    } else if (arr.length > 2) {
      throw new Error(`Unsupported format for argument '${arr[0]}'`);
    } else {
      return arr[1];
    }
  }
})();
