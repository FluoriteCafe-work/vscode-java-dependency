// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.

import type { IncomingMessage } from "http";
import * as https from "https";
import type { ExtensionContext } from "vscode";

import type { DependencyCheckMetadata, DependencyCheckResult, MementoItem } from "./type";
import { Upgrade } from "../constants";
import { buildPackageId } from "./utility";

// TODO: change
const URL_DEPENDENCY_CHECK_METADATA = "https://gist.githubusercontent.com/FluoriteCafe-work/6126d5d93fe4e35c25c431d98bb9ff7e/raw/98a12c2e88bec82a0ec595d24cf1ed8628cfcabb/data.json";
const METADATA_UPDATE_INTERVAL_IN_DAYS = 7;
const METADATA_STORAGE_KEY = "dependencyCheckMetadata";

async function fetchDependencyCheckMetadata(): Promise<DependencyCheckMetadata> {
    const raw = await httpsGet(URL_DEPENDENCY_CHECK_METADATA);
    try {
        return JSON.parse(raw);
    } catch (error) {
        console.error(error);
        return {};
    }
}

async function httpsGet(urlString: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        let result = "";
        https.get(urlString, {
            headers: {
                'User-Agent': 'vscode-java-dependency/0.1',
            }
        }, (res: IncomingMessage) => {
            res.on("data", chunk => {
                result = result.concat(chunk.toString());
            });
            res.on("end", () => {
                resolve(result);
            });
            res.on("error", err => {
                reject(err);
            });
        });
    });
}

class MetadataManager {
    private dependencyCheckMetadata: DependencyCheckMetadata = {};

    public getMetadataById(givenPackageId: string): DependencyCheckResult | undefined {
        const splits = givenPackageId.split(":", 2);
        const groupId = splits[0];
        const artifactId = splits[1] ?? "";

        if (groupId === Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE) {
            return {
                name: Upgrade.DIAGNOSTICS_NAME_FOR_JAVA_ENGINE,
                supportedVersion: `>=${Upgrade.EARLIEST_JAVA_VERSION_NOT_TO_PROMPT}`,
                packageRuleUsed: Upgrade.DIAGNOSTICS_GROUP_ID_FOR_JAVA_ENGINE,
            };
        }

        const packageId = buildPackageId(groupId, artifactId);
        const packageIdWithWildcardArtifactId = buildPackageId(groupId, "*");
        return this.getMetadata(packageId) ?? this.getMetadata(packageIdWithWildcardArtifactId);
    }

    public async tryRefreshMetadata(context: ExtensionContext) {
        const metadata = context.globalState.get(METADATA_STORAGE_KEY) as MementoItem<DependencyCheckMetadata> | undefined;
        const nowTs = Number(new Date()) / 1000;
        if (!metadata || (nowTs - (metadata?.lastUpdatedTs ?? 0)) > METADATA_UPDATE_INTERVAL_IN_DAYS * 24 * 60 * 60) {
            const newMetadata = await fetchDependencyCheckMetadata().catch(() => null);
            if (newMetadata !== null) {
                context.globalState.update(METADATA_STORAGE_KEY, {
                    lastUpdatedTs: nowTs,
                    data: newMetadata
                });
                this.dependencyCheckMetadata = newMetadata;
            } else {
                this.dependencyCheckMetadata = {};
            }
            return;
        } else {
            this.dependencyCheckMetadata = metadata.data ?? {};
        }
    }

    private getMetadata(packageRuleUsed: string): DependencyCheckResult | undefined {
        return this.dependencyCheckMetadata[packageRuleUsed] ? {
            ...this.dependencyCheckMetadata[packageRuleUsed], packageRuleUsed
        } : undefined;
    }
}

const metadataManager = new MetadataManager();
export default metadataManager; 