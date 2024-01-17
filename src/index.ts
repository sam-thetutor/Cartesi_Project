import createClient from "openapi-fetch";
import { components, paths } from "./schema";
import { bytesToString } from 'viem'

// Importing and initializing DB
const { Database } = require("node-sqlite3-wasm");

import { User } from './interfaces';

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;

// Instatiate Database
const db = new Database('database.db');
db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT)');

type AdvanceRequestData = components["schemas"]["Advance"];
type InspectRequestData = components["schemas"]["Inspect"];
type RequestHandlerResult = components["schemas"]["Finish"]["status"];
type RollupsRequest = components["schemas"]["RollupRequest"];
type InspectRequestHandler = (data: InspectRequestData) => Promise<void>;
type AdvanceRequestHandler = (
  data: AdvanceRequestData
) => Promise<RequestHandlerResult>;

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollupServer);

const handleAdvance: AdvanceRequestHandler = async (data) => {
  console.log("Received advance request data " + JSON.stringify(data));
  try {
    const userToAdd = JSON.parse(bytesToString(Uint8Array.from(Buffer.from(data.payload, 'hex'))))
    console.log(`Adding user ${userToAdd.id}/${userToAdd.name}`);
    db.run('INSERT INTO products VALUES (?, ?)', [userToAdd.id, userToAdd.name]);
  } catch (e) {
    console.log(`Error executing parameters: "${data.payload}"`);
  }
  const advance_req = await fetch(rollup_server + '/notice', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ data })
  });
  const json = await advance_req.json();
  console.log("Received notice status " + advance_req.status + " with body " + JSON.stringify(json));
  return "accept";
};

const handleInspect: InspectRequestHandler = async (data) => {
  console.log("Received inspect request data " + JSON.stringify(data));

  // Retrieve and print the data
  const listOfProducts = await db.get('SELECT id, name FROM products');
  console.log(listOfProducts);
  const payload = data["payload"];
  try {
    const payloadStr = JSON.parse(bytesToString(Uint8Array.from(Buffer.from(payload, 'hex'))))
    console.log(`Adding report "${payloadStr}"`);
  } catch (e) {
    console.log(`Adding report with binary value "${payload}"`);
  }
  const inspect_req = await fetch(rollup_server + '/report', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ payload })
  });
  console.log("Received report status " + inspect_req.status);
  // return "accept";
};

const main = async () => {
  const { POST } = createClient<paths>({ baseUrl: rollupServer });
  let status: RequestHandlerResult = "accept";
  while (true) {
    const { response } = await POST("/finish", {
      body: { status },
      parseAs: "text",
    });

    if (response.status === 200) {
      const data = (await response.json()) as RollupsRequest;
      switch (data.request_type) {
        case "advance_state":
          status = await handleAdvance(data.data as AdvanceRequestData);
          break;
        case "inspect_state":
          await handleInspect(data.data as InspectRequestData);
          break;
      }
    } else if (response.status === 202) {
      console.log(await response.text());
    }
  }
};

main().catch((e) => {
  console.log(e);
  process.exit(1);
});
