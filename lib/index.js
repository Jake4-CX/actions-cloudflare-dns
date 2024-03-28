"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const axios_1 = __importDefault(require("axios"));
const core_1 = require("@actions/core");
async function run() {
    const input_token = (0, core_1.getInput)('token');
    const input_zone = (0, core_1.getInput)('zone');
    const input_name = (0, core_1.getInput)('name');
    const input_body = {
        type: (0, core_1.getInput)('type'),
        name: (0, core_1.getInput)('name'),
        content: (0, core_1.getInput)('content'),
        ttl: Number((0, core_1.getInput)('ttl')),
        proxied: (0, core_1.getInput)('proxied') === 'true',
    };
    const headers = {
        Authorization: `Bearer ${input_token}`,
        'Content-Type': 'application/json',
    };
    const apiBaseUrl = `https://api.cloudflare.com/client/v4/zones/${input_zone}/dns_records`;
    async function getCurrentRecord(input_name) {
        try {
            const response = await axios_1.default.get(`${apiBaseUrl}?name=${encodeURIComponent(input_name)}`, { headers });
            const results = response.data;
            if (!results.success) {
                (0, core_1.setFailed)('Failed to retrieve current DNS records.');
                return null;
            }
            const record = results.result.find((r) => r.name === input_name);
            return record || null;
        }
        catch (error) {
            console.error(error);
            (0, core_1.setFailed)('Failed to parse JSON response of search for record');
        }
    }
    async function updateRecord(record, input_body) {
        try {
            const response = await axios_1.default.put(`${apiBaseUrl}/${record.id}`, input_body, { headers });
            const results = response.data;
            if (!results.success) {
                (0, core_1.setFailed)(`Failed to update record: ${results.errors[0].message}`);
                return;
            }
            console.log('Record updated successfully');
            (0, core_1.setOutput)('record_id', results.result.id);
            (0, core_1.setOutput)('name', results.result.name);
        }
        catch (error) {
            console.error(error);
            (0, core_1.setFailed)('Failed to parse JSON response of update record');
        }
    }
    async function createRecord(input_body) {
        try {
            const response = await axios_1.default.post(apiBaseUrl, input_body, { headers });
            const results = response.data;
            if (!results.success) {
                (0, core_1.setFailed)(`Failed to create record: ${results.errors[0].message}`);
                return;
            }
            console.log('Record created successfully');
            (0, core_1.setOutput)('record_id', results.result.id);
            (0, core_1.setOutput)('name', results.result.name);
        }
        catch (error) {
            console.error(error);
            (0, core_1.setFailed)('Failed to parse JSON response of create record');
        }
    }
    const record = await getCurrentRecord(input_name);
    if (record) {
        console.log(`Record found: ${record.name}`);
        await updateRecord(record, input_body);
    }
    else {
        console.log('Record not found, creating...');
        await createRecord(input_body);
    }
}
exports.run = run;
if (!process.env.JEST_WORKER_ID) {
    run();
}
