const fs = require("fs");

function zipFiles(filePaths, outputPath) {
    const cwd = process.cwd();
    const path = require("path");
    const zip = new require("node-zip")();
    for (const filePath of filePaths) {
        zip.file(filePath, fs.readFileSync(path.join(cwd, filePath)));
    }
    const data = zip.generate({ base64: false, compression: 'DEFLATE' });
    fs.writeFileSync(outputPath, data, "binary");
}

const optionDefinitions = [
    { name: 'inputFiles', type: String },
    { name: 'zipPath', type: String },
];

const commandLineArgs = require("command-line-args");
const options = commandLineArgs(optionDefinitions);

if (!options.inputFiles) {
    console.error("No input file list file given (--inputFiles)");
    process.exit(1);
} else if (!options.zipPath) {
    console.error("No zip file output path given (--zipPath)");
    process.exit(2);
} else {
    const inputFilesData = fs.readFileSync(options.inputFiles);
    const inputFilesJson = JSON.parse(inputFilesData);
    zipFiles(inputFilesJson.inputFiles, options.zipPath);
}