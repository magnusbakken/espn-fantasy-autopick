const fs = require('fs');

RELEASE_TYPE_MAJOR = 'major';
RELEASE_TYPE_MINOR = 'minor';
RELEASE_TYPE_PATCH = 'patch';
RELEASE_TYPES = [RELEASE_TYPE_MAJOR, RELEASE_TYPE_MINOR, RELEASE_TYPE_PATCH];

VERSION_REGEX = /(\d+)\.(\d+)\.(\d+)/;
VERSION_DECLARATION_REGEX: /(\s*)'version':\s*'(\d+\.\d+\.\d+)'\s*(,?)(\s*)/

class Version {
    constructor(major, minor, patch) {
        this.major = major;
        this.minor = minor;
        this.patch = patch;
    }

    static parse(versionString) {
        const match = VERSION_REGEX.exec(versionString);
        if (!match) {
            throw Error(`Invalid version number: '${versionString}'. Must be on form '1.2.3'.`);
        }
        const major = Number.parseInt(match[1]);
        const minor = Number.parseInt(match[2]);
        const patch = Number.parseInt(match[3]);
        return new Version(major, minor, patch);
    }

    toString() {
        return `${this.major}.${this.minor}.${this.patch}`;
    }
}

function getNextVersion(version, releaseType) {
    switch (releaseType) {
        case RELEASE_TYPE_MAJOR: return new Version(version.major + 1, 0, 0);
        case RELEASE_TYPE_MINOR: return new Version(version.major, version.minor + 1, 0);
        case RELEASE_TYPE_PATCH: return new Version(version.major, version.minor, version.patch + 1);
        default: throw Error(`Unknown release type: ${releaseType}`);
    }
}

function versionUpdater(newVersion) {
    return (match, leadingWhitespace, version, comma, trailingWhitespace, offset, string) => {
        return `${leadingWhitespace}'version': ${newVersion.toString()}${comma}${trailingWhitespace}`;
    };
}

function updateJson(filePath, newVersion) {
    const input = fs.readFileSync(filePath, 'utf-8');
    const json = JSON.parse(input);
    json.version = newVersion.toString();
    const output = JSON.stringify(json, null, 4); // 4 is the number of spaces to use for indentation.
    fs.writeFileSync(filePath, output, 'utf-8');
}

function findCurrentVersion(packageFilePath) {
    const input = fs.readFileSync(packageFilePath, 'utf-8');
    return Version.parse(JSON.parse(input).version);
}

function bumpVersion(releaseType, manifestFilePaths, packageFilePath) {
    const currentVersion = findCurrentVersion(packageFilePath);
    const newVersion = getNextVersion(currentVersion, releaseType);
    console.log(`Bumping version number from ${currentVersion} to ${newVersion}`);
    for (const manifestFilePath of manifestFilePaths) {
        console.log(`Updating manifest file at ${manifestFilePath}`);
        updateJson(manifestFilePath, newVersion);
    }
    console.log(`Updating package file at ${packageFilePath}`);
    updateJson(packageFilePath, newVersion);
}

function releaseType(rt) {
    rt = rt.toLowerCase();
    if (RELEASE_TYPES.includes(rt)) {
        return rt;
    } else {
        console.error(`Invalid release type: ${rt}. Must be major/minor/patch.`);
        process.exit(1);
    }
}

const optionDefinitions = [
    { name: 'releaseType', type: releaseType },
    { name: 'manifestFilePaths', type: Array },
    { name: 'packageFilePath', type: String },
];

const commandLineArgs = require('command-line-args');
const options = commandLineArgs(optionDefinitions);

if (!options.releaseType) {
    console.error('No release type given (--releaseType)');
    process.exit(1);
} else if (!options.manifestFilePath) {
    console.error('No manifest file paths given (--manifestFilePaths)');
    process.exit(1);
} else if (!options.packageFilePath) {
    console.error('No package file path given (--packageFilePath)');
    process.exit(1);
} else {
    bumpVersion(options.releaseType, options.manifestFilePath, options.packageFilePath);
}