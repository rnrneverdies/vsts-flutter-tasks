import * as os from "os";
import * as path from "path";
import * as task from "vsts-task-lib/task";
import * as tool from "vsts-task-tool-lib/tool";

const FLUTTER_TOOL_NAME: string = "Flutter";
const FLUTTER_EXE_RELATIVEPATH = "flutter/bin";
const FLUTTER_TOOL_PATH_ENV_VAR: string = "FlutterToolPath";

async function main(): Promise<void> {
  // 1. Getting current platform identifier
  let arch = findArchitecture();

  // 2. Building version spec
  let downloadUrl = task.getInput("downloadUrl", true);
  let versionSpec = task.getInput("versionSpec", true);

  // 3. Check if already available
  task.debug(
    `Trying to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`
  );
  let toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);

  if (!toolPath) {
    // 4.1. Downloading SDK
    await downloadAndCacheSdk(downloadUrl, versionSpec, arch);

    // 4.2. Verifying that tool is now available
    task.debug(
      `Trying again to get (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch}) tool from local cache`
    );
    toolPath = tool.findLocalTool(FLUTTER_TOOL_NAME, versionSpec, arch);
  }

  // 5. Creating the environment variable
  let fullFlutterPath: string = path.join(toolPath, FLUTTER_EXE_RELATIVEPATH);
  task.debug(`Set ${FLUTTER_TOOL_PATH_ENV_VAR} with '${fullFlutterPath}'`);
  task.setVariable(FLUTTER_TOOL_PATH_ENV_VAR, fullFlutterPath);
  task.setResult(task.TaskResult.Succeeded, "Installed");
}

function findArchitecture() {
  if (os.platform() === "darwin") return "macos";
  else if (os.platform() === "linux") return "linux";
  return "windows";
}

async function downloadAndCacheSdk(
  downloadUrl: string,
  versionSpec: string,
  arch: string
): Promise<void> {
  // 1. Download SDK archive
  task.debug(`Starting download archive from '${downloadUrl}'`);
  var bundleZip = await tool.downloadTool(downloadUrl);
  task.debug(
    `Succeeded to download '${bundleZip}' archive from '${downloadUrl}'`
  );

  // 2. Extracting SDK bundle
  task.debug(`Extracting '${downloadUrl}' archive`);
  var bundleDir = await tool.extractZip(bundleZip);
  task.debug(`Extracted to '${bundleDir}' '${downloadUrl}' archive`);

  // 3. Adding SDK bundle to cache
  task.debug(
    `Adding '${bundleDir}' to cache (${FLUTTER_TOOL_NAME},${versionSpec}, ${arch})`
  );
  tool.cacheDir(bundleDir, FLUTTER_TOOL_NAME, versionSpec, arch);
}

main().catch(error => {
  task.setResult(task.TaskResult.Failed, error);
});
