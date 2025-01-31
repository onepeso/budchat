import { useState, useEffect } from "react";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Terminal } from "lucide-react";
import { getVersion } from "@tauri-apps/api/app";
import semver from "semver";

const GITHUB_REPO_API =
  "https://api.github.com/repos/onepeso/budchat/releases/latest";

const UpdateAlert = () => {
  const [showUpdateAlert, setShowUpdateAlert] = useState(false);
  const [latestVersion, setLatestVersion] = useState("");
  const [currentVersion, setCurrentVersion] = useState("");

  useEffect(() => {
    const checkForUpdates = async () => {
      try {
        // Get current app version
        const appVersion = await getVersion();
        console.log("Current app version:", appVersion);
        setCurrentVersion(appVersion);

        // Get latest release from GitHub
        const response = await fetch(GITHUB_REPO_API);
        const data = await response.json();
        const latestVersion = data.tag_name.replace("v", ""); // Remove 'v' prefix if present
        setLatestVersion(latestVersion);

        // Compare versions
        if (semver.gt(latestVersion, appVersion)) {
          setShowUpdateAlert(true);
        } else {
          setShowUpdateAlert(false);
        }
      } catch (error) {
        console.error("Error checking for updates:", error);
        setShowUpdateAlert(false);
      }
    };

    checkForUpdates();
    // Check for updates every hour
    const interval = setInterval(checkForUpdates, 3600000);

    return () => clearInterval(interval);
  }, []);

  if (!showUpdateAlert) return null;

  return (
    <div className="p-2">
      <Alert className="bg-gray-300 dark:bg-blue-950">
        <Terminal className="w-4 h-4" />
        <AlertTitle>New Update Available!</AlertTitle>
        <AlertDescription>
          Version {latestVersion} is now available. Your current version is{" "}
          {currentVersion}. Head over here:{" "}
          <a
            href="https://github.com/onepeso/budchat/releases/latest"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            Download
          </a>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default UpdateAlert;
