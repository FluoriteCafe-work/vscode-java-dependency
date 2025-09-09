// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Range, type TextDocument, Uri, workspace } from "vscode";
import type { Element } from "domhandler";
import { getChildrenByTags, getExactlyOneChildByTag, getTextFromNode, parseDocument, XmlTagName } from "./lexerUtils";
import { buildPackageId, normalizePath } from "./utility";
import { Dependency } from "./type";
import { Upgrade } from "../constants";

function getRangeOfNode(node: Element, vscodeDocument: TextDocument): Range | undefined {
    if (!node.startIndex || !node.endIndex) {
        return;
    }
    return new Range(
        vscodeDocument.positionAt(node.startIndex),
        vscodeDocument.positionAt(node.endIndex + 1),
    )
}

function readDependencyNode(node: Element, vscodeDocument: TextDocument): Dependency | undefined {
    const range = getRangeOfNode(node, vscodeDocument);
    if (!range) {
        return undefined;
    }
    const groupId = getExactlyOneChildByTag(node, XmlTagName.GroupId);
    const artifactId = getExactlyOneChildByTag(node, XmlTagName.ArtifactId);
    const version = getExactlyOneChildByTag(node, XmlTagName.Version);
    if (!groupId || !artifactId) {
        return undefined;
    }
    const groupIdText = getTextFromNode(groupId.children[0]);
    const artifactIdText = getTextFromNode(artifactId.children[0]);
    const versionText = version ? getTextFromNode(version.children[0]) : undefined;
    return {
        packageId: buildPackageId(groupIdText, artifactIdText),
        version: versionText,
        location: range,
    }
}



class PomDataManager {
    private pomMap: Record< /* pomPath */ string, Record<string /* packageId */, Range>> = {};

    public async parsePom(pomPath: string) {
        const normalizedPath = normalizePath(pomPath);
        const pomDocument = await workspace.openTextDocument(Uri.parse(normalizedPath));
        const documentText = pomDocument.getText();
        const xmlDocument = await parseDocument(documentText);
        this.pomMap[normalizedPath] = {};

        const projectNode = getExactlyOneChildByTag(xmlDocument, XmlTagName.Project);
        if (!projectNode) {
            return;
        }

        const dependenciesNode = getExactlyOneChildByTag(projectNode, XmlTagName.Dependencies);
        const dependencyManagementNode = getExactlyOneChildByTag(projectNode, XmlTagName.DependencyManagement);
        const pomMap: Record<string /* packageId */, Range> = {};

        if (dependencyManagementNode) {
            const deps = getChildrenByTags(dependencyManagementNode, [XmlTagName.Dependency]);
            deps.forEach((item) => {
                const dep = readDependencyNode(item, pomDocument);
                if (dep && (!pomMap[dep.packageId] || dep.version)) {
                    pomMap[dep.packageId] = dep.location;
                }
            })
        }
        if (dependenciesNode) {
            const deps = getChildrenByTags(dependenciesNode, [XmlTagName.Dependency]);
            deps.forEach((item) => {
                const dep = readDependencyNode(item, pomDocument);
                if (dep && (!pomMap[dep.packageId] || dep.version)) {
                    pomMap[dep.packageId] = dep.location;
                }
            })
        }

        const propertiesNode = getExactlyOneChildByTag(projectNode, XmlTagName.Properties);
        if (propertiesNode) {
            const javaVersionNode = getExactlyOneChildByTag(propertiesNode, "java.version");
            if (javaVersionNode) {
                const range = getRangeOfNode(javaVersionNode, pomDocument);
                if (range) {
                    pomMap[buildPackageId(Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE, "*")] = range;
                }
            }
        }

        this.pomMap[normalizedPath] = pomMap;
    }

    public getPomRange(pomPath: string, packageId: string): Range | undefined {
        return this.pomMap[pomPath]?.[packageId];
    }


}

const pomDataManager = new PomDataManager();
export default pomDataManager;