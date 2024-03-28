import axios from 'axios';
import { getInput, setFailed, setOutput } from '@actions/core';

export async function run() {
  const input_token = getInput('token');
  const input_zone = getInput('zone');
  const input_name = getInput('name');

  const input_body: InputBody = {
    type: getInput('type'),
    name: getInput('name'),
    content: getInput('content'),
    ttl: Number(getInput('ttl')),
    proxied: getInput('proxied') === 'true',
  };

  const headers = {
    Authorization: `Bearer ${input_token}`,
    'Content-Type': 'application/json',
  };

  const apiBaseUrl = `https://api.cloudflare.com/client/v4/zones/${input_zone}/dns_records`;

  async function getCurrentRecord(input_name: string) {
    try {
      const response = await axios.get(`${apiBaseUrl}?name=${encodeURIComponent(input_name)}`, { headers });
      const results = response.data;

      if (!results.success) {
        setFailed('Failed to retrieve current DNS records.');
        return null;
      }

      const record = results.result.find((r: ZoneTypeResult) => r.name === input_name);
      return record || null;
    } catch (error) {
      console.error(error);
      setFailed('Failed to parse JSON response of search for record');
    }
  }

  async function updateRecord(record: ZoneTypeResult, input_body: InputBody) {
    try {
      const response = await axios.put(`${apiBaseUrl}/${record.id}`, input_body, { headers });
      const results = response.data;

      if (!results.success) {
        setFailed(`Failed to update record: ${results.errors[0].message}`);
        return;
      }

      console.log('Record updated successfully');
      setOutput('record_id', results.result.id);
      setOutput('name', results.result.name);
    } catch (error) {
      console.error(error);
      setFailed('Failed to parse JSON response of update record');
    }
  }

  async function createRecord(input_body: InputBody) {
    try {
      const response = await axios.post(apiBaseUrl, input_body, { headers });
      const results = response.data;

      if (!results.success) {
        setFailed(`Failed to create record: ${results.errors[0].message}`);
        return;
      }

      console.log('Record created successfully');
      setOutput('record_id', results.result.id);
      setOutput('name', results.result.name);
    } catch (error) {
      console.error(error);
      setFailed('Failed to parse JSON response of create record');
    }
  }

  const record = await getCurrentRecord(input_name);

  if (record) {
    console.log(`Record found: ${record.name}`);
    await updateRecord(record, input_body);
  } else {
    console.log('Record not found, creating...');
    await createRecord(input_body);
  }
}

interface InputBody {
  type: string;
  name: string;
  content: string;
  ttl: number;
  proxied: boolean;
}

interface ZoneTypeResult {
  id: string;
  zone_id: string;
  zone_name: string;
  name: string;
  type: string;
  content: string;
  proxiable: boolean;
  proxied: boolean;
  ttl: number;
  locked: boolean;
  meta: {
    auto_added: boolean;
    managed_by_apps: boolean;
    managed_by_argo_tunnel: boolean;
  };
  comment: string | null;
  tags: any[];
  created_on: string;
  modified_on: string;
}

if (!process.env.JEST_WORKER_ID) {
  run();
}