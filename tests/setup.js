"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
if (!process.env.TEST_DATABASE_URL) {
    throw new Error('TEST_DATABASE_URL environment variable is not set');
}
beforeAll(async () => {
    try {
        (0, child_process_1.execSync)('npx prisma migrate deploy', {
            env: { ...process.env, DATABASE_URL: process.env.TEST_DATABASE_URL },
            stdio: 'inherit',
        });
    }
    catch (error) {
        console.error('Migration failed:', error);
        throw error;
    }
});
//# sourceMappingURL=setup.js.map