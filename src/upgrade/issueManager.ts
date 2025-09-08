// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import diagnosticsManager from "./display/diagnosticsManager";
import notificationManager from "./display/notificationManager";
import type { FileIssues, UpgradeIssue } from "./type";

class IssueManager {
    private issuesList: Record</* filePath */ string, FileIssues> = {};


    public addIssue(filePath: string, issue: UpgradeIssue) {
        const { packageId } = issue;
        if (!this.issuesList[filePath]) {
            this.issuesList[filePath] = {};
        }
        this.issuesList[filePath][packageId] = issue;
        this.refreshDisplay(filePath, this.issuesList[filePath]);
    }

    public removeIssue(filePath: string, packageId: string) {
        if (!this.issuesList[filePath] || !this.issuesList[filePath][packageId]) {
            return;
        }
        delete this.issuesList[filePath][packageId];
        this.refreshDisplay(filePath, this.issuesList[filePath]);
    }

    private refreshDisplay(filePath: string, issues: FileIssues) {
        diagnosticsManager.refresh(filePath, issues);
        notificationManager.refresh(issues);
    }
}

const issueManager = new IssueManager();
export default issueManager;