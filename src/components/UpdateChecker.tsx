import {useEffect} from "react";
import {check} from "@tauri-apps/plugin-updater";
import {relaunch} from "@tauri-apps/plugin-process";
import {ask} from "@tauri-apps/plugin-dialog"; // Updated import

const UpdateChecker = () => {
    useEffect(() => {
        const checkForUpdates = async () => {
            try {
                console.log("Checking for updates...");
                const update = await check();

                if (update) {
                    console.log("Update available:", update.version);
                    const confirmed = await ask(
                        `A new version (${update.version}) is available. Do you want to update now?`,
                        {title: "Update Available"}
                    );

                    if (confirmed) {
                        console.log("Downloading and installing update...");
                        await update.downloadAndInstall((progress) => {
                            console.log(`Download progress: ${progress.event}`);
                        });

                        console.log("Update installed. Relaunching app...");
                        await relaunch();
                    }
                } else {
                    console.log("No updates available.");
                }
            } catch (error) {
                console.error("Failed to check for updates:", error);
            }
        };

        checkForUpdates();
    }, []);

    return null; // This component doesn't render anything
};

export default UpdateChecker;