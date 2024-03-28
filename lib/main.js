"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = void 0;
const child_process_1 = __importDefault(require("child_process"));
const core_1 = __importDefault(require("@actions/core"));
async function run() {
    const input_token = core_1.default.getInput("token");
    const input_zone = core_1.default.getInput("zone");
    const input_name = core_1.default.getInput("name");
    const getCurrentRecord = (input_name, input_token, input_zone) => {
        const { status, stdout } = child_process_1.default.spawnSync("curl", [
            ...["--header", `Authorization: Bearer ${input_token}`],
            ...["--header", "Content-Type: application/json"],
            `https://api.cloudflare.com/client/v4/zones/${input_zone}/dns_records?name=${encodeURIComponent(input_name)}`,
        ]);
        if (status !== 0) {
            process.exit(status !== null && status !== void 0 ? status : 1);
        }
        const results = safeJsonParse(isZoneSearchType)(stdout.toString());
        if (results.hasError) {
            console.log(`::error ::Failed to parse JSON response`);
            process.exit(1);
        }
        const result = results.parsed.result.find((record) => record.name === input_name);
        if (!result) {
            return null;
        }
        return result;
    };
    const updateRecord = (record, input_token, input_zone) => {
        console.log(`Record exists with ${record.name}, updating...`);
        const { status, stdout } = child_process_1.default.spawnSync("curl", [
            ...["--request", "PUT"],
            ...["--header", `Authorization: Bearer ${input_token}`],
            ...["--header", "Content-Type: application/json"],
            ...["--silent", "--data"],
            JSON.stringify({
                type: process.env.INPUT_TYPE,
                name: process.env.INPUT_NAME,
                content: process.env.INPUT_CONTENT,
                ttl: Number(process.env.INPUT_TTL),
                proxied: process.env.INPUT_PROXIED == "true",
            }),
            `https://api.cloudflare.com/client/v4/zones/${input_zone}/dns_records/${record.id}`,
        ]);
        if (status !== 0) {
            process.exit(status !== null && status !== void 0 ? status : 1);
        }
        const result = JSON.parse(stdout.toString());
        console.log("Record updated successfully, result: ", result);
        // if (!success) {
        //   console.dir(errors[0]);
        //   console.log(`::error ::${errors[0].message}`);
        //   process.exit(1);
        // }
        // console.log(`::set-output name=record_id::${result.id}`);
        // console.log(`::set-output name=name::${result.name}`);
    };
    const record = getCurrentRecord(input_name, input_token, input_zone);
    if (record) {
        console.log(`Record found: ${record.name}`);
        updateRecord(record, input_token, input_zone);
    }
    else {
        console.log(`Record not found: ${input_name}`);
        console.log(`ToDo`);
        // createRecord();
    }
}
exports.run = run;
function isZoneSearchType(o) {
    return (o.result !== undefined &&
        o.success !== undefined &&
        o.errors !== undefined &&
        o.messages !== undefined &&
        o.result_info !== undefined);
}
const safeJsonParse = (guard) => (text) => {
    const parsed = JSON.parse(text);
    return guard(parsed) ? { parsed, hasError: false } : { hasError: true };
};
if (!process.env.JEST_WORKER_ID) {
    run();
}
