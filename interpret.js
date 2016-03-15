require('./translate');
var tokens = require("./tokens.js");

var fs = require("fs");
var webdriverio = require("webdriverio");
var selenium = require('selenium-standalone');
var client = ""; // WebdriverIO client


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
    var flag = args.indexOf(tokens.VERBOSE_ARG_LONG);
    if (flag == -1)
        flag = args.indexOf(tokens.VERBOSE_ARG);
    if (flag != -1) {
        args.splice(flag, 1);
        if (args.length < 3) {
            console.error(ERROR_NUM_ARGS);
            console.error(INFO_USAGE);
            return;
        }

        IS_VERBOSE = true;
    }

    // Check if we can open file specified
    var data = "";
    try {
            data = fs.readFileSync(args[2], {encoding: "utf8"});
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
        var line = lines[i].trim().split(' ');
        var cmd = line[0];
        var args = line.slice(1);
        if (cmd === "!timeout") {
                timeout = timescale(args);
                if (IS_VERBOSE) console.log(`[VERBOSE: LINE ${i}] Set timeout to ${args.join(' ')}.`);
                continue;
        } else if (cmd === "#") {
                continue;
        } else if (line.length <= 1) {
                continue;
        }

        try {
            processLine(cmd, args);
            sleep(5); // TODO: terrible
        } catch (err) {
            console.error(`[ERROR: LINE ${i}] Syntax error on: ${lines[i]}`);
            return;
        }
    }
}

// Converts all timescales to milliseconds
function timescale(args) {
    return parseInt(args[0]) * tokens.TIMESCALES[args[1]];
}

// Translates a single line, given a command and an argument array.
function processLine(cmd, args) {
    switch (cmd) {
        case "goto":
            if (IS_VERBOSE) console.log(`[VERBOSE] Navigating to ${args[0]}.`);
            return `.url(${args[0]})`;
        case "set":
            if (IS_VERBOSE) console.log(`[VERBOSE] Setting value.`);
            var value = 0;
            
            // Check how we should interpret value
            if (tokens.JQUERY_TAG.test(args[2])) {
                if (IS_VERBOSE) console.log(`[VERBOSE] Getting value as jQuery.`);
                value = jqueryEvalOrValue(args[2]);
            }
            else {
                if (IS_VERBOSE) console.log(`[VERBOSE] Getting value as string.`);
                value = args.slice(2).join(" ");    
            }
            // Check what we should set
            if (JQUERY_TAG.test(args[0])) {
                if (IS_VERBOSE) console.log(`[VERBOSE] Setting variable as jQuery.`);
                return `.setValue(
                        processJquery(${args[0]}),
                        ${value}
                )`;
            }
            else {
                if (IS_VERBOSE) console.log(`[VERBOSE] Setting local variable.`);
                var obj = {}; obj[args[0]] = value;
                varStack.push(obj);
            }
            break;
        case "click":
            if (IS_VERBOSE) console.log(`[VERBOSE] Clicking on ${args[0]}.`);
            return `.click(${processJquery(args[0])})`;
            break;
        case "wait":
            if (args[0] === "for") {
                if (IS_VERBOSE) console.log(`[VERBOSE] Waiting for ${args[1]}.`);
                return `.waitForExist(
                        ${processJquery(args[1])}, 
                        ${timeout}
                )`;
            } else {
                // Process as timestamp
                if (IS_VERBOSE) console.log(`[VERBOSE] Waiting for timeslice.`);
                return `.pause(${timescale(args)})`;
            }
            break;
        case "return":
            return varStack[args[0]];
            break;
        default:
            throw new Error();
    }
}

// Processes a jQuery argument.
function processJquery(arg) {
    return `'${tokens.JQUERY_TAG.exec(arg)[0]
        .replace(/"/g, '\\"')}'`;
}

// Determines whether to evaluate the argument as jQuery
// or to just return the value of the jQuery selector.
function jqueryEvalOrValue(arg) {
    var retval = 0;
    if (tokens.JQUERY_TAG_EOT.test(arg)) {
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

function seleniumPrep() {
        selenium.install(() => {
                selenium.start(() => {
                        client = webdriverio.remote();
                        client.init().then(() => main());
                });
        });
}

// Terrible debug
function sleep(seconds) 
{
    var e = new Date().getTime() + (seconds * 1000);
    while (new Date().getTime() <= e) {}
}

if (require.main === module) {
    seleniumPrep();
}
