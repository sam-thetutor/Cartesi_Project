import createClient from "openapi-fetch";
import { components, paths } from "./schema";
import { fromHex, toHex, hexToString } from 'viem'

// Importing and initializing DB
const { Database } = require("node-sqlite3-wasm");

import { Product, ProductPayload } from './interfaces';

const rollup_server = process.env.ROLLUP_HTTP_SERVER_URL;

console.log('Will start SQLITE Database');

// Instatiate Database
const db = new Database('/tmp/database.db');
try {
  db.run('CREATE TABLE IF NOT EXISTS products (id INTEGER PRIMARY KEY, name TEXT,description TEXT,owner TEXT,price INTEGER,instock INTEGER)');
  db.run('CREATE TABLE IF NOT EXISTS purchases (id INTEGER PRIMARY KEY, name TEXT,description TEXT,purchasedBy TEXT,price INTEGER,quantity INTEGER)');

} catch (e) {
  console.log('ERROR initializing databas: ', e)
}
console.log('Backend Database initialized');

type AdvanceRequestData = components["schemas"]["Advance"];
type InspectRequestData = components["schemas"]["Inspect"];
type RequestHandlerResult = components["schemas"]["Finish"]["status"];
type RollupsRequest = components["schemas"]["RollupRequest"];
type InspectRequestHandler = (data: InspectRequestData) => Promise<string>;
type AdvanceRequestHandler = (
  data: AdvanceRequestData
) => Promise<RequestHandlerResult>;

const rollupServer = process.env.ROLLUP_HTTP_SERVER_URL;
console.log("HTTP rollup_server url is " + rollupServer);

const handleAdvance: AdvanceRequestHandler = async (data) => {
  console.log("Received advance request data " + JSON.stringify(data));
  const payload = data.payload;
  const productOwner = data.metadata.msg_sender?.toString()

  try {
    const productPayload = JSON.parse(fromHex(payload, 'string')) as ProductPayload;
    console.log(`Managing user ${productPayload.id}/${productPayload.name} - ${productPayload.action}`);
    if (!productPayload.action) throw new Error('No action provided');

    if (productPayload.action === 'add')
      db.run('INSERT INTO products VALUES (?, ?,?,?,?,?)', [productPayload.id, productPayload.name, productPayload.description, productOwner, productPayload.price, productPayload.instock]);
    if (productPayload.action === 'delete')
      db.run('DELETE FROM products WHERE id = ?', [productPayload.id]);

    if (productPayload.action === 'buy') {
      db.run('INSERT INTO purchases VALUES (?, ?,?,?,?,?)', [productPayload.id, productPayload.name, productPayload.description, productOwner, productPayload.price, 1]);
    }
    const advance_req = await fetch(rollup_server + '/notice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ payload })
    });
    console.log("Received notice status ", await advance_req.text())
    return "accept";
  } catch (e) {
    console.log(`Error executing parameters: "${payload}"`);
    return "reject";
  }
};

const handleInspect: InspectRequestHandler = async (data) => {
 try {
  
 
  console.log("Received inspect request data " + JSON.stringify(data));

  let payload = data.payload
  const route = hexToString(payload)

  let listOfProducts;
  const splitRoute = route.split("/")
  if (splitRoute[1] === "owner") {
    listOfProducts = ["owner"]
    // listOfProducts = await db.run('SELECT FROM products WHERE owner = ?', [splitRoute[2]]);
  } else if (splitRoute[1] === "id") {
    listOfProducts = ["specific id"]
    // listOfProducts = await db.run('SELECT FROM products WHERE id = ?', [Number(splitRoute[2])]);
  } else if (splitRoute[1] === "all") {
    listOfProducts = ["all"]
    //listOfProducts = await db.all(`SELECT * FROM products`);
  } else if (splitRoute[1] === "purchases") {
    listOfProducts = ["purchases"]
    //listOfProducts = await db.all(`SELECT * FROM purchases WHERE owner =?`,[splitRoute[2]]);
  }

 
    const finalPayload = toHex(JSON.stringify(listOfProducts));
    const inspect_req = await fetch(rollup_server + '/report', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ finalPayload })
    });
    console.log("Received report status " + inspect_req.status);
    return "accept";
  } catch (e) {
    console.log(`Error generating report with binary value "${data.payload}"`);
    return "reject";
  }
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
