// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { CancellationToken, CodeAction, CodeActionContext, CodeActionKind, CodeActionProvider, Command, ProviderResult, Range, Selection, TextDocument } from "vscode";
import { Upgrade } from "../constants";
import { Commands } from "../commands";
import metadataManager from "./metadataManager";
import { buildFixPrompt } from "./utility";
import issueManager from "./issueManager";

export default class UpgradeCodeActionProvider implements CodeActionProvider {
    provideCodeActions(document: TextDocument, _range: Range | Selection, context: CodeActionContext, _token: CancellationToken): ProviderResult<(CodeAction | Command)[]> {
        const actions: CodeAction[] = [];
        const documentPath = document.uri.toString();

        for (const diagnostic of context.diagnostics) {
            if (diagnostic.source === Upgrade.PROMOTION_DIAGNOSTIC_SOURCE) {
                if (!diagnostic.code) {
                    continue;
                }

                const packageId = String(diagnostic.code);
                const issue = issueManager.getIssues(documentPath)?.[packageId];
                if (!issue) {
                    continue;
                }
                const metadata = metadataManager.getMetadataById(issue.packageId);
                if (!metadata) {
                    continue;
                }
                const action = new CodeAction(
                    `Fix: Upgrade ${metadata.name}`,
                    CodeActionKind.QuickFix
                );

                action.command = {
                    title: "Upgrade",
                    command: Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL,
                    arguments: [buildFixPrompt(issue)]
                }

                actions.push(action);
            }
        }

        return actions;
    }
}