import { workspace, WorkspaceFolder, type WorkspaceFoldersChangeEvent } from "vscode";
import { Jdtls } from "../java/jdtls";
import { languageServerApiManager } from "../languageServerApi/languageServerApiManager";
import type { INodeData } from "../java/nodeData";
import issueManager from "./issueManager";
import { Upgrade } from "../constants";
import { UpgradeReason } from "./type";

const EARLIEST_JAVA_VERSION_NOT_TO_PROMPT = 21;

class UpgradeManager {
    public initialize() {
        workspace.workspaceFolders?.forEach((folder) =>
            this.checkUpgradableComponents(folder)
        );
    }

    public scan() {
        workspace.onDidChangeWorkspaceFolders(
            (e) => this.onDidChangeWorkspaceFolders(e)
        );
    }

    private onDidChangeWorkspaceFolders(e: WorkspaceFoldersChangeEvent) {
        e.added.forEach((folder) => {
            this.checkUpgradableComponents(folder)
        });
    }

    private async checkUpgradableComponents(folder: WorkspaceFolder) {
        if (!await languageServerApiManager.ready()) {
            return;
        }
        const hasJavaError: boolean = await Jdtls.checkImportStatus();
        if (hasJavaError) {
            console.log("JAVA ERR");
            return;
        }

        const uri = folder.uri.toString();
        const projects = await Jdtls.getProjects(uri);
        projects.forEach((project) => this.checkJavaVersion(project));

    }

    private checkJavaVersion(data: INodeData) {
        const javaVersion = data.metaData?.MaxSourceVersion as number | undefined;
        const pomPath = data.metaData?.PomPath as string | undefined;
        if (!pomPath || !javaVersion) {
            return;
        }
        if (javaVersion < EARLIEST_JAVA_VERSION_NOT_TO_PROMPT) {
            issueManager.addIssue(pomPath, {
                packageId: Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE,
                reason: UpgradeReason.ENGINE_TOO_OLD,
                currentVersion: String(javaVersion),
                suggestedVersion: String(EARLIEST_JAVA_VERSION_NOT_TO_PROMPT),
            });
        } else {
            issueManager.removeIssue(pomPath, Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE);
        }
    }
}

const upgradeManager = new UpgradeManager();
export default upgradeManager;