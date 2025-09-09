// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CodeActionKind, commands, type ExtensionContext, languages, workspace, type WorkspaceFolder } from "vscode";
import * as semver from 'semver'
import { Jdtls } from "../java/jdtls";
import { languageServerApiManager } from "../languageServerApi/languageServerApiManager";
import { NodeKind, type INodeData } from "../java/nodeData";
import issueManager from "./issueManager";
import { Upgrade } from "../constants";
import { UpgradeReason } from "./type";
import { instrumentOperationAsVsCodeCommand } from "vscode-extension-telemetry-wrapper";
import { Commands } from "../commands";
import metadataManager from "./metadataManager";
import UpgradeCodeActionProvider from "./upgradeCodeActionProvider";
import UpgradeCodeLensProvider from "./upgradeCodeLensProvider";
import { buildPackageId } from "./utility";
import pomDataManager from "./pomDataManager";

const DEFAULT_UPGRADE_PROMPT = "Upgrade Java project dependency";

class UpgradeManager {
    public initialize(context: ExtensionContext) {
        // Command to be used
        context.subscriptions.push(instrumentOperationAsVsCodeCommand(Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL, (promptText?: string) => {
            this.runUpgrade(promptText ?? DEFAULT_UPGRADE_PROMPT);
        }));

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
        context.subscriptions.push(languages.registerCodeLensProvider(
            {
                language: "xml",
                pattern: "**/pom.xml"
            },
            new UpgradeCodeLensProvider(),
        ));

        // Metadata update & initial scan
        metadataManager.tryRefreshMetadata(context).then(() => {
            upgradeManager.scan();
        });
    }

    public scan() {
        workspace.workspaceFolders?.forEach((folder) =>
            this.checkUpgradableComponents(folder)
        );
    }

    private async checkUpgradableComponents(folder: WorkspaceFolder) {
        if (!await languageServerApiManager.ready()) {
            return;
        }
        const hasJavaError: boolean = await Jdtls.checkImportStatus();
        if (hasJavaError) {
            return;
        }

        const uri = folder.uri.toString();
        const projects = await Jdtls.getProjects(uri);
        projects.forEach(async (project) => {
            const pomPath = project.metaData?.PomPath as string | undefined;
            if (!pomPath) {
                return;
            }
            await pomDataManager.parsePom(pomPath);
            this.checkJavaVersion(project, pomPath);
            const packageData = await Jdtls.getPackageData({ kind: NodeKind.Project, projectUri: project.uri });
            packageData
                .filter(x => x.kind === NodeKind.Container)
                .forEach(async (packageContainer) => {
                    const packages = await Jdtls.getPackageData({
                        kind: NodeKind.Container,
                        projectUri: project.uri,
                        path: packageContainer.path,
                    });
                    packages.forEach(
                        (pkg) => this.checkDependencyVersion(pkg, pomPath)
                    );
                });


        });

    }

    private checkJavaVersion(data: INodeData, pomPath: string) {
        const javaVersion = data.metaData?.MaxSourceVersion as number | undefined;
        if (!javaVersion) {
            return;
        }
        if (javaVersion < Upgrade.EARLIEST_JAVA_VERSION_NOT_TO_PROMPT) {
            issueManager.addIssue(pomPath, {
                packageId: buildPackageId(Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE, "*"),
                reason: UpgradeReason.ENGINE_TOO_OLD,
                currentVersion: String(javaVersion),
                suggestedVersion: String(Upgrade.EARLIEST_JAVA_VERSION_NOT_TO_PROMPT),
            });
        } else {
            issueManager.removeIssue(pomPath, Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE);
        }
    }

    private checkDependencyVersion(data: INodeData, dependingPomPath: string) {
        const versionString = data.metaData?.["maven.version"];
        const groupId = data.metaData?.["maven.groupId"];
        const artifactId = data.metaData?.["maven.artifactId"];
        const packageId = buildPackageId(groupId, artifactId);
        const supportedVersionDefinition = metadataManager.getMetadataById(packageId);
        if (!versionString || !groupId || !supportedVersionDefinition) {
            return;
        }
        const currentVersion = semver.coerce(versionString);
        if (!currentVersion) {
            issueManager.removeIssue(dependingPomPath, packageId);
            return;
        }
        if (!semver.satisfies(currentVersion, supportedVersionDefinition.supportedVersion)) {
            issueManager.addIssue(dependingPomPath, {
                packageId,
                packageDisplayName: supportedVersionDefinition.name,
                reason: UpgradeReason.END_OF_LIFE,
                currentVersion: versionString,
                suggestedVersion: "latest", // TODO
            });
        } else {
            issueManager.removeIssue(dependingPomPath, packageId);
        }
    }

    private async runUpgrade(promptText: string) {
        await commands.executeCommand("workbench.action.chat.open", {
            query: promptText,
            isPartialQuery: true
        });
    }
}

const upgradeManager = new UpgradeManager();
export default upgradeManager;