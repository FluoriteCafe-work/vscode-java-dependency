import { commands, window, extensions } from "vscode";
import type { FileIssues } from "../type";
import { ExtensionName } from "../../constants";
import { buildFixPrompt, buildMessage } from "../utility";
import { Commands } from "../../commands";

class NotificationManager {
    private hasShown = false;


    async refresh(issues: FileIssues) {
        const targetIssue = Object.values(issues)[0];

        if (!targetIssue) {
            return;
        }

        if (this.hasShown) {
            return;
        }

        const hasJavaUpgradeToolExtension = !!extensions.getExtension(ExtensionName.JAVA_UPGRADE_TOOL);
        const buttonText = hasJavaUpgradeToolExtension ? "Upgrade" : "Install extension and upgrade";
        const selection = await window.showInformationMessage(
            buildMessage(targetIssue), buttonText);
        this.hasShown = true;
        if (selection === buttonText) {
            commands.executeCommand(Commands.VIEW_TRIGGER_JAVA_UPGRADE_TOOL, buildFixPrompt(targetIssue));
        }
    }
}

const notificationManager = new NotificationManager();
export default notificationManager;