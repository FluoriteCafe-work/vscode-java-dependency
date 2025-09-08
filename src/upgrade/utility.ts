// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import { UpgradeIssue, UpgradeReason } from "./type";

export function buildMessage(issue: UpgradeIssue): string {
    const { packageId, packageDisplayName, currentVersion, reason } = issue;
    const name = packageDisplayName ?? packageId;

    switch (reason) {
        case UpgradeReason.END_OF_LIFE: {
            return `Your project dependency ${name} (${currentVersion}) is in end-of-life. Consider upgrading using Java Upgrade Tool for better security and performance.`
        }
        case UpgradeReason.CVE: {
            return `Your project dependency ${name} (${currentVersion}) has CVE. Consider upgrading using Java Upgrade Tool for better security.`
        }
        case UpgradeReason.ENGINE_TOO_OLD: {
            return `Your project Java version (${currentVersion}) is too old. Consider upgrading using Java Upgrade Tool for better performance and features.`
        }
    }
}

export function buildFixPrompt(issue: UpgradeIssue): string {
    const { packageId, reason, suggestedVersion } = issue;

    const suffix = [
        ...(suggestedVersion ? [`The target version is ${suggestedVersion}.`] : [])
    ];

    switch (reason) {
        case UpgradeReason.END_OF_LIFE: {
            return [`Upgrade the package ${packageId} using Java Upgrade Tool.`, ...suffix].join(" ");
        }
        case UpgradeReason.CVE: {
            return [`Upgrade the package ${packageId} to resolve CVE.`, ...suffix].join(" ");
        }
        case UpgradeReason.ENGINE_TOO_OLD: {
            return [`Upgrade Java version.`, ...suffix].join(" ");
        }
    }
}

export function tryParse<T>(x: string): T | undefined {
    try {
        return JSON.parse(x)
    } catch (_) {
        return undefined
    }
}
