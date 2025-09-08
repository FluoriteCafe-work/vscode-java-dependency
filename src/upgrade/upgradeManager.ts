import { CodeActionKind, commands, type ExtensionContext, extensions, languages, workspace, type WorkspaceFolder, type WorkspaceFoldersChangeEvent } from "vscode";
import { Jdtls } from "../java/jdtls";
import { languageServerApiManager } from "../languageServerApi/languageServerApiManager";
import type { INodeData } from "../java/nodeData";
import issueManager from "./issueManager";
import { ExtensionName, Upgrade } from "../constants";
import { UpgradeReason } from "./type";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import { Commands } from "../commands";
import metadataManager from "./metadataManager";
import UpgradeCodeActionProvider from "./upgradeCodeActionProvider";

const EARLIEST_JAVA_VERSION_NOT_TO_PROMPT = 21;
const DEFAULT_UPGRADE_PROMPT = "Upgrade project dependency version with Java Upgrade Tool";

class UpgradeManager {
    public initialize(context: ExtensionContext) {
        // Command to be used
        context.subscriptions.push(instrumentOperationAsVsCodeCommand(Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL, (promptText?: string) => {
            this.runUpgrade(promptText ?? DEFAULT_UPGRADE_PROMPT);
        }));

        // Event handler on workspace changes
        workspace.onDidChangeWorkspaceFolders(
            (e) => this.onDidChangeWorkspaceFolders(e)
        );

        // Quick Fix provider
        context.subscriptions.push(languages.registerCodeActionsProvider(
            {
                language: "xml",
                pattern: "**/pom.xml"
            },
            new UpgradeCodeActionProvider(),
            {
                providedCodeActionKinds: [CodeActionKind.QuickFix],
            }
        ));

        // Metadata update & initial scan
        metadataManager.tryRefreshMetadata(context).then(() => {
            upgradeManager.scan();
        });
    }

    private scan() {
        workspace.workspaceFolders?.forEach((folder) =>
            this.checkUpgradableComponents(folder)
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

    private async runUpgrade(promptText: string) {
        const hasJavaUpgradeToolExtension = !!extensions.getExtension(ExtensionName.JAVA_UPGRADE_TOOL);
        if (!hasJavaUpgradeToolExtension) {
            await commands.executeCommand("workbench.extensions.installExtension", ExtensionName.JAVA_UPGRADE_TOOL);
        }
        await commands.executeCommand("workbench.action.chat.open", {
            query: promptText,
            isPartialQuery: true
        });
    }
}

const upgradeManager = new UpgradeManager();
export default upgradeManager;