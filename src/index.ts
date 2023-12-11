import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as core from '@actions/core';
import * as tc from '@actions/tool-cache';
import * as exec from '@actions/exec';

export async function install(version: string): Promise<string> {
    const osName = getOs();
    const cpu = getArch();
    const ext = os.platform() == 'win32' ? 'zip' : 'tar.gz';
    const downloadUrl = `https://github.com/FileFormatInfo/fflint/releases/download/${version}/fflint_${osName}_${cpu}.${ext}`;

    core.info(`Downloading ${downloadUrl}`);
    const downloadPath: string = await tc.downloadTool(downloadUrl);
    core.debug(`Downloaded to ${downloadPath}`);

    core.info('Extracting fflint');
    let extPath: string;
    if (os.platform() == 'win32') {
        if (!downloadPath.endsWith('.zip')) {
            const newPath = downloadPath + '.zip';
            fs.renameSync(downloadPath, newPath);
            extPath = await tc.extractZip(newPath);
        } else {
            extPath = await tc.extractZip(downloadPath);
        }
    } else {
        extPath = await tc.extractTar(downloadPath);
    }
    core.debug(`Extracted to ${extPath}`);

    let realVersion = version;
    if (version == 'latest') {
        //LATER: run "fflint version --output=json" to get the real version
        realVersion = '0.0.12'
    } else {
        realVersion = realVersion.replace(/^v/, '');
    }

    const cachePath: string = await tc.cacheDir(extPath, 'fflint-gha', realVersion);
    core.debug(`Cached to ${cachePath}`);

    const exePath: string = path.join(cachePath, os.platform() == 'win32' ? 'fflint.exe' : 'fflint');
    core.debug(`Exe path is ${exePath}`);

    return exePath;
}

function getOs(): string {
    let retVal: string = os.platform();
    switch (retVal) {
        case 'darwin': {
            retVal = 'Darwin';
            break;
        }
        case 'linux': {
            retVal = 'Linux';
            break;
        }
        case 'win32': {
            retVal = 'Windows';
            break;
        }
        default: {
            core.warning(`Unknown OS ${retVal}`);
            break;
        }
    }
    return retVal;
}

function getArch(): string {
    let retVal: string = os.arch();
    switch (retVal) {
        case 'x64': {
            retVal = 'x86_64';
            break;
        }
        case 'x32': {
            retVal = 'i386';
            break;
        }
        case 'arm': {
            retVal = 'arm64';
            break;
        }
        default: {
            core.warning(`Unknown arch ${retVal}`);
            break;
        }
    }
    return retVal;
}


async function run() {
    try {
        const version: string = core.getInput('version') || 'latest';
        const exePath: string = await install(version);
        const command = core.getInput('command') || 'ext';
        const args = core.getInput('args') || '';
        const files = core.getInput('files') || '**/*';

        await exec.exec(`${exePath} ${command} ${args} ${files}`);
    } catch (err) {
        core.setFailed(err.message);
    }
}

run();