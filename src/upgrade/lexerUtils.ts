// Copyright (c) Microsoft Corporation. All rights reserved.
// Licensed under the MIT license.
import { Document, isTag, Node, NodeWithChildren, Element, isText } from "domhandler";
import * as hp from "htmlparser2";

export type ElementNode = Node;
export enum XmlTagName {
    GroupId = "groupId",
    ArtifactId = "artifactId",
    Version = "version",
    Dependencies = "dependencies",
    DependencyManagement = "dependencyManagement",
    Exclusions = "exclusions",
    Plugins = "plugins",
    Plugin = "plugin",
    Project = "project",
    Dependency = "dependency",
    Properties = "properties",
    Packaging = "packaging",
    Module = "module",
    Modules = "modules",
    Parent = "parent",
    RelativePath = "relativePath"
}

export function parseDocument(text: string): Document {
    return hp.parseDocument(text, {
        withEndIndices: true,
        withStartIndices: true,
        lowerCaseTags: false,
        xmlMode: true,
    });
}

export function getChildrenByTags(parentElement: NodeWithChildren, tags: string[]): Element[] {
    const ret: Element[] = [];
    for (const child of parentElement.children) {
        if (isTag(child) && tags.includes(child.tagName)) {
            ret.push(child);
        }
    }
    return ret;
}

export function getExactlyOneChildByTag(parentElement: NodeWithChildren, tag: string): Element | undefined {
    const items = getChildrenByTags(parentElement, [tag]);
    if (items.length !== 1) {
        return undefined;
    }
    return items[0];
}

export function getTextFromNode(node: Node | undefined | null, fallbackValue = "") {
    return node && isText(node) ? node.data : fallbackValue;
}