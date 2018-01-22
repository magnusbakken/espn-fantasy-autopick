const fs = require("fs");

function zipFiles(filePaths, outputPath) {
    const cwd = process.cwd();
    const path = require("path");
    const zip = new require("node-zip")();
    for (const filePath of filePaths) {
        const fullPath = path.join(cwd, filePath);
        console.log(`Adding ${fullPath} to archive...`);
        zip.file(filePath, fs.readFileSync(fullPath));
    }
    const data = zip.generate({ base64: false, compression: 'DEFLATE' });
    console.log(`Writing archive to ${outputPath}...`);
    fs.writeFileSync(outputPath, data, "binary");
    console.log("Finished!");
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
    process.exit(1);
} else {
    const inputFilesData = fs.readFileSync(options.inputFiles);
    const inputFilesJson = JSON.parse(inputFilesData);
    zipFiles(inputFilesJson.inputFiles, options.zipPath);
}