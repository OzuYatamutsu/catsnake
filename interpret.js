var IS_VERBOSE = false;

const VERBOSE_FLAG = ["-v", "--verbose"];
const ERROR_NUM_ARGS = "Error: Number of arguments was invalid.";
const INFO_USAGE = "Usage: node interpret.js [-v | --verbose] <path-to-task>";
/*
 * Interprets a CSL task and translates to WebdriverIO.
 */
function main() {
  readArgs(process.argv);  
}

function readArgs(args) {
  // Usage: interpret.js [-v] <task>
  if (!args || args.length < 3 || args.length > 4) {
    console.log(ERROR_NUM_ARGS);
    console.log(INFO_USAGE);
    return;
  }

  // TODO  
}

if (require.main === module) {
  main();
}
