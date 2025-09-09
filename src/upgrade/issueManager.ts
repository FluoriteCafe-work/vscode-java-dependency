// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import diagnosticsManager from "./display/diagnosticsManager";
import notificationManager from "./display/notificationManager";
import type { FileIssues, UpgradeIssue } from "./type";
import { normalizePath } from "./utility";

class IssueManager {
    private issuesList: Record</* filePath */ string, FileIssues> = {};


    public addIssue(pomPath: string, issue: UpgradeIssue) {
        const { rulePackageId } = issue;
        const normalizedPath = normalizePath(pomPath);
        if (!this.issuesList[normalizedPath]) {
            this.issuesList[normalizedPath] = {};
        }
        this.issuesList[normalizedPath][rulePackageId] = issue;
        this.refreshDisplay(normalizedPath, this.issuesList[normalizedPath]);
    }

    public removeIssue(pomPath: string, rulePackageId: string) {
        const normalizedPath = normalizePath(pomPath);
        if (!this.issuesList[normalizedPath] || !this.issuesList[normalizedPath][rulePackageId]) {
            return;
        }
        delete this.issuesList[normalizedPath][rulePackageId];
        this.refreshDisplay(normalizedPath, this.issuesList[normalizedPath]);
    }

    public getIssue(filePath: string): FileIssues {
        const normalizedPath = normalizePath(filePath);
        return this.issuesList[normalizedPath] ?? {};
    }

    private refreshDisplay(normalizedPath: string, issues: FileIssues) {
        diagnosticsManager.refresh(normalizedPath, issues);
        notificationManager.refresh(issues);
    }
}

const issueManager = new IssueManager();
export default issueManager;