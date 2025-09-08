// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Diagnostic, DiagnosticSeverity, type Disposable, languages, Uri, Range } from "vscode";
import type { FileIssues, UpgradeIssue } from "../type";
import { Upgrade } from "../../constants";
import { buildMessage } from "../utility";

class DiagnosticsManager implements Disposable {
    private diagnostics = languages.createDiagnosticCollection('javaUpgrade');
    private diagIssueMap = new WeakMap<Diagnostic, UpgradeIssue>();

    dispose() {
        this.diagnostics.dispose();
    }

    public refresh(filePath: string, issues: FileIssues) {
        this.diagnostics.set(Uri.file(filePath), Object.entries(issues).map(([packageId, issue]) => {
            const diagnostic = new Diagnostic(
                // TODO: locate the actual version settings
                new Range(0, 0, 0, 0),
                buildMessage(issue),
                DiagnosticSeverity.Warning
            );
            this.diagIssueMap.set(diagnostic, issue);

            diagnostic.code = packageId;
            diagnostic.source = Upgrade.PROMOTION_DIAGNOSTIC_SOURCE;

            return diagnostic;
        }));
    }

    public getIssue(diagnostic: Diagnostic) {
        return this.diagIssueMap.get(diagnostic);
    }
}

const diagnosticsManager = new DiagnosticsManager();
export default diagnosticsManager;