// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CancellationToken, CodeLens, CodeLensProvider, ProviderResult, Range, TextDocument } from "vscode";
import { Commands } from "../commands";
import { buildFixPrompt, normalizePath, toFirstLine } from "./utility";
import issueManager from "./issueManager";
import metadataManager from "./metadataManager";
import { Upgrade } from "../constants";
import pomDataManager from "./pomDataManager";

export default class UpgradeCodeLensProvider implements CodeLensProvider {
    provideCodeLenses(document: TextDocument, _token: CancellationToken): ProviderResult<CodeLens[]> {
        const documentPath = document.uri.toString();
        const issues = issueManager.getIssues(documentPath);
        const topOfFileCodeLens: CodeLens[] = [];
        const inlineCodeLens: CodeLens[] = [];
        Object.values(issues).forEach((issue) => {
            const metadata = metadataManager.getMetadataById(issue.packageId);
            if (!metadata) {
                return;
            }
            const range = pomDataManager.getPomRange(normalizePath(documentPath), issue.packageId);
            if (range) {
                const codeLens = new CodeLens(
                    toFirstLine(range),
                    {
                        title: "Upgrade",
                        command: Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL,
                        tooltip: `Upgrade ${metadata.name} with GitHub Copilot`,
                        arguments: [buildFixPrompt(issue)],
                    });
                inlineCodeLens.push(codeLens);
            } else {
                const codeLens = new CodeLens(
                    new Range(0, 0, 0, 0),
                    {
                        title: "Upgrade",
                        command: Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL,
                        tooltip: `Upgrade ${metadata.name} with GitHub Copilot`,
                        arguments: [buildFixPrompt(issue)],
                    });
                topOfFileCodeLens.push(codeLens);
            }
        });

        return [
            ...topOfFileCodeLens.sort((a, b) => {
                // always show Java engine upgrade first, if any
                if (a.command?.title === `Upgrade ${Upgrade.DIAGNOSTICS_NAME_FOR_JAVA_ENGINE}`) return -1;
                if (b.command?.title === `Upgrade ${Upgrade.DIAGNOSTICS_NAME_FOR_JAVA_ENGINE}`) return 1;
                return (a.command?.title ?? "") < (b.command?.title ?? "") ? -1 : 1;
            })
                // give 1 top-of-file Code Lens action at most
                .slice(0, 1),
            ...inlineCodeLens,
        ];
    }
}