// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CancellationToken, CodeLens, CodeLensProvider, ProviderResult, Range, TextDocument } from "vscode";
import { Commands } from "../commands";
import { buildFixPrompt } from "./utility";
import issueManager from "./issueManager";
import metadataManager from "./metadataManager";

export default class UpgradeCodeLensProvider implements CodeLensProvider {
    provideCodeLenses(document: TextDocument, _token: CancellationToken): ProviderResult<CodeLens[]> {
        const documentPath = document.uri.toString();
        const issues = issueManager.getIssue(documentPath);
        return Object.values(issues).map((issue) => {
            const metadata = metadataManager.getDependencyMetadataByPackageId(issue.packageId);
            if (!metadata) {
                return;
            }
            const codeLens = new CodeLens(new Range(0, 0, 0, 0), {
                title: `Upgrade ${metadata.name} with Java Upgrade Tool`,
                command: Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL,
                arguments: [buildFixPrompt(issue)],
            });

            return codeLens;
        })
            .filter((x): x is CodeLens => Boolean(x))
            .sort((a, b) => {
                // always show Java engine upgrade first
                if (a.command?.title === `Upgrade Java Engine with Java Upgrade Tool`) return -1;
                if (b.command?.title === `Upgrade Java Engine with Java Upgrade Tool`) return 1;
                return (a.command?.title ?? "") < (b.command?.title ?? "") ? -1 : 1;
            })
            .slice(0, 2); // give 2 actions at most
    }
}