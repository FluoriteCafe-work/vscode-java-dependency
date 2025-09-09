// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { Diagnostic, DiagnosticSeverity, type Disposable, languages, Uri, Range } from "vscode";
import type { FileIssues } from "../type";
import { Upgrade } from "../../constants";
import { buildMessage, normalizePath } from "../utility";
import pomDataManager from "../pomDataManager";

class DiagnosticsManager implements Disposable {
    private diagnostics = languages.createDiagnosticCollection('javaUpgrade');

    dispose() {
        this.diagnostics.dispose();
    }

    public refresh(filePath: string, issues: FileIssues) {
        this.diagnostics.set(Uri.parse(filePath), Object.entries(issues).map(([packageId, issue]) => {
            const range = pomDataManager.getPomRange(normalizePath(filePath), issue.packageId);
            const diagnostic = new Diagnostic(
                range ?? new Range(0, 0, 0, 0),
                buildMessage(issue),
                DiagnosticSeverity.Warning
            );

            diagnostic.code = packageId;
            diagnostic.source = Upgrade.PROMOTION_DIAGNOSTIC_SOURCE;

            return diagnostic;
        }));
    }
}

const diagnosticsManager = new DiagnosticsManager();
export default diagnosticsManager;