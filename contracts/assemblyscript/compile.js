const compile = require("near-sdk-as/compiler").compile;
const fs = require("fs");
const path = require("path");

scanProjects().map(compileContract);

// ----------------------------------------------------------------------------
// Helper functions for the code above
// ----------------------------------------------------------------------------

function compileContract(fqPath) {
  const folder = fqPath.replace(`${__dirname}/`, "");
  const name = folder
    .replace(/(a-z)*\/main\.ts/, "")
    .split(/[\.\/]/)
    .pop();

  const output = `out/${name}.wasm`;

  console.log(`\ncompiling contract [ ${folder} ] to [ ${output} ]`);

  compile(
    fqPath, // input file
    output, // output file
    [
      "-O3z",
      "--debug", // Shows debug output
      "--validate", // Validate the generated wasm module
      "--measure", // shows compiler run time
      "--runPasses",
      "inlining-optimizing,dce", // inlines to optimize and removes deadcode
    ],
    {
      verbose: false, // Output the cli args passed to asc
    }
  );

  reportFilesize(output);
}

function scanProjects() {
  let filter = "main.ts";

  const target = process.argv.pop();
  if (target !== __filename) {
    filter = target;
  }

  return readDirR(path.resolve(__dirname)) // only AssemblyScript files
    .filter((fqPath) => fqPath.includes(filter)) // ignore cross contract calls
    .filter((fqPath) => fqPath.includes("main.ts")); // just the contract entry points
}

function reportFilesize(fqPath) {
  const stats = fs.statSync(fqPath);
  console.log(`Filesize  : ${stats.size / 1000.0} kb`);
}

/**
 * List all files in a directory recursively in a synchronous fashion
 * adapted from https://gist.github.com/kethinov/6658166#gistcomment-2109513
 * @param {string} dir top level to begin recursive descent through gstall subfolders
 */
function readDirR(dir) {
  return fs.statSync(dir).isDirectory()
    ? [].concat(...fs.readdirSync(dir).map((f) => readDirR(path.join(dir, f))))
    : dir;
}
