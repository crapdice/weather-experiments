import fs from 'fs';
import path from 'path';

const SETTINGS_FILE = path.join(process.cwd(), 'private_data', 'admin_config.json');

export interface AdminSettings {
    publicApiWeeks: number; // Number of weeks of data to return
}

const DEFAULT_SETTINGS: AdminSettings = {
    publicApiWeeks: 2 // Default to 2 weeks (14 days)
};

export function getAdminSettings(): AdminSettings {
    try {
        if (!fs.existsSync(SETTINGS_FILE)) {
            // Write default if not exists
            fs.writeFileSync(SETTINGS_FILE, JSON.stringify(DEFAULT_SETTINGS, null, 2));
            return DEFAULT_SETTINGS;
        }

        const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
        return JSON.parse(raw) as AdminSettings;
    } catch (error) {
        console.error("Failed to read admin settings:", error);
        return DEFAULT_SETTINGS;
    }
}

export function saveAdminSettings(settings: AdminSettings) {
    try {
        fs.writeFileSync(SETTINGS_FILE, JSON.stringify(settings, null, 2));
    } catch (error) {
        console.error("Failed to save admin settings:", error);
        throw error;
    }
}
