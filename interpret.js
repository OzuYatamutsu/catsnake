var fs = require("fs");

var IS_VERBOSE = false;
const ERROR_NUM_ARGS = "Error: Number of arguments was invalid.";
const ERROR_FILEIO = "Error: Could not open the file specified. Does it exist, and do we have read access to it?";
const ERROR_SYNTAX = "Error: Syntax error on line ";
const INFO_USAGE = "Usage: node interpret.js [-v | --verbose] <path-to-task>";
/*
 * Interprets a CSL task and translates to WebdriverIO.
 */
function main() {
  var data = readArgs(process.argv);
  if (!data)
    return; // Abandon ship!
  parse(data);
}

function readArgs(args) {
  // Usage: interpret.js [-v] <task>

  // Check number of args
  if (!args || args.length < 3 || args.length > 4) {
    console.error(ERROR_NUM_ARGS);
    console.error(INFO_USAGE);
    return;
  }

  // Check for verbose flag
  var flag = args.indexOf("--verbose");
  if (flag == -1)
    flag = args.indexOf("-v");
  if (flag != -1) {
    args.splice(flag, 1);
    if (args.length < 3) {
      console.error(ERROR_NUM_ARGS);
      console.error(INFO_USAGE);
      return;
    }

    VERBOSE_FLAG = true;
  }

  // Check if we can open file specified
  var data = "";
  try {
    data = fs.readFileSync(args[2]);
  } catch (err) {
    console.error(ERROR_FILEIO);
    return;
  }

  // If all goes well...
  return data;
}

/*
 * Parses file data as CSL and interprets as WebdriverIO code.
 */
function parse(data) {
  var lines = data.split('\n');
  var timeout = 30000;
  var output = [];

  for (var i = 0; i < lines.length; i++) {
    // Process line-by-line
    var line = lines[i].split(' ');
    const cmd = line[0];
    const args = line.slice(1);

    try {
      output.push(processLine(lines[i]));
    } catch (err) {
      console.error(ERROR_SYNTAX + i);
      return;
    }
  }
}

function processTimeout(line) {

}

function processLine(line) {

}

if (require.main === module) {
  main();
}
