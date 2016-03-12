require('./translate');
var fs = require("fs");
var client = require("webdriverio");

const ARG_TOKEN = "{arg}";
const JQUERY_TAG = /jquery\[(.*?)\]/;
const JQUERY_TAG_EOT = /jquery\[(.*?)\]$/;

var IS_VERBOSE = false;
var varStack = [];
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
  var timeout = 30000; // ms
  var output = [];

  for (var i = 0; i < lines.length; i++) {
    // Process line-by-line
    var line = lines[i].split(' ');
    const cmd = line[0];
    const args = line.slice(1);
    if (cmd == "!timeout") {
      timeout = timescale(args);
      if (VERBOSE_FLAG) console.log(`[VERBOSE: LINE ${i}] Set timeout to ${args.join(' ')}.`);
      continue;
    }

    try {
      processLine(cmd, args);
    } catch (err) {
      console.error(`[ERROR: LINE ${i}] Syntax error on: ${lines[i]}`);
      return;
    }
  }
}

// Converts all timescales to milliseconds
function timescale(args) {
  return args[0] * timescales[1];
}

// Translates a single line, given a command and an argument array.
function processLine(cmd, args) {
  switch (cmd) {
    case "goto":
      client = client.url(args[1]);
      break;
    case "set":
      var value = 0;
      
      // Check how we should interpret value
      if (JQUERY_TAG.test(args[2])) {
        value = jqueryEvalOrValue(args[2]);
      else
        value = args.slice(2).join(" ");  
      
      // Check what we should set
      if (JQUERY_TAG.test(args[0]))
        client = client.setValue(
          processJquery(args[0]),
          value
        );
      else
        varStack.push({args[0]: value});
      break;
    case "click":
      client = client.click(processJquery(args[1]));
      break;
    case "wait":
      if (args[0] === "for")
        client = client.waitForExist(processJquery(args[1]), timeout);
      break;
    case "return":
      return varStack[args[0]];
      break;
    default:
      throw;
  }
}

// Processes a jQuery argument.
function processJquery(arg) {
  return `'${JQUERY_TAG.exec(arg)[0]
    .replace(/"/g, '\\"')}'`;
}

// Determines whether to evaluate the argument as jQuery
// or to just return the value of the jQuery selector.
function jqueryEvalOrValue(arg) {
  var retval = 0;
  if (JQUERY_TAG_EOT.test(arg)) {
    client = client
      .getValue(processJquery(arg))
      .then((result, retval) => { retval = result; });
  } else {
    arg = arg.replace("jquery[", "$('").replace("]", ")")
    client = client
      .execute((arg) => { return eval(arg); })
      .then((result, retval) => { retval = result; });
  }
  
  return retval;
}

// Translates an argument array into valid JavaScript.
function processArgs(args) {

}

if (require.main === module) {
  main();
}
