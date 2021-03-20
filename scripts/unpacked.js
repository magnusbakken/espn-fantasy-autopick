const fs = require('fs');
const path = require('path');

function copyFileSyncRecursive(inputPath, outputPath) {
    outputPath = outputPath.replace(/\\/g, '/');

    let root = '';
    if (outputPath[0] === '/') {
        root = '/';
        outputPath = outputPath.slice(1);
    }
    else if (outputPath[1] === ':') {
        root = outputPath.slice(0, 3);
        outputPath = outputPath.slice(3);
    }

    const folders = outputPath.split('/').slice(0, -1);
    folders.reduce(
        (acc, folder) => {
            const folderPath = acc + folder + '/';
            if (!fs.existsSync(folderPath)) {
                fs.mkdirSync(folderPath);
            }
            return folderPath;
        },
        root
    );

    // -- write file
    fs.copyFileSync(inputPath, outputPath);
}

function copyFiles(filePaths, outputPath) {
    const path = require('path');
    if (fs.existsSync(outputPath)) {
        fs.rmdirSync(outputPath, { recursive: true });
    }
    for (const filePath of filePaths) {
        const inputFilePath = Object.keys(filePath)[0];
        const outputFilePath = path.join(outputPath, filePath[inputFilePath]);
        console.log(`Copying ${inputFilePath} to output folder as ${outputFilePath}...`);
        copyFileSyncRecursive(inputFilePath, outputFilePath);
    }
    console.log('Finished!');
}

const optionDefinitions = [
    { name: 'inputFiles', type: String },
    { name: 'outputPath', type: String },
];

const commandLineArgs = require('command-line-args');
const options = commandLineArgs(optionDefinitions);

if (!options.inputFiles) {
    console.error('No input file list file given (--inputFiles)');
    process.exit(1);
} else if (!options.outputPath) {
    console.error('No output path given (--outputPath)');
    process.exit(1);
} else {
    const inputFilesData = fs.readFileSync(options.inputFiles);
    const inputFilesJson = JSON.parse(inputFilesData);
    copyFiles(inputFilesJson.inputFiles, options.outputPath);
}