import assert from "node:assert/strict";
import { createServer } from "node:http";
import type { IncomingMessage, Server, ServerResponse } from "node:http";
import type { AddressInfo } from "node:net";
import { after, before, beforeEach, describe, it } from "node:test";
import express from "express";
import { extractionRouter } from "./extraction.js";

type Handler = (req: IncomingMessage, body: Buffer, res: ServerResponse) => void;

function listen(server: Server): Promise<string> {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => resolve(`http://127.0.0.1:${(server.address() as AddressInfo).port}`));
  });
}

function reply(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { "content-type": "application/json" }).end(JSON.stringify(body));
}

function upload(fileName = "invoice_0042.pdf"): FormData {
  const form = new FormData();
  form.append("file", new Blob(["%PDF-1.3 fictional invoice"], { type: "application/pdf" }), fileName);
  return form;
}

describe("POST /extract/invoice", () => {
  let handle: Handler;
  let received: { contentType?: string; body: string } | null;
  let extraction: Server;
  let api: Server;
  let apiUrl: string;

  before(async () => {
    extraction = createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => handle(req, Buffer.concat(chunks), res));
    });
    const extractionUrl = await listen(extraction);

    const app = express();
    app.use(express.json());
    app.use(extractionRouter(extractionUrl));
    api = createServer(app);
    apiUrl = await listen(api);
  });

  after(() => {
    api.close();
    extraction.close();
  });

  beforeEach(() => {
    received = null;
    handle = (req, body, res) => {
      received = { contentType: req.headers["content-type"], body: body.toString() };
      reply(res, 200, { extractor_version: "test", fields: { invoice_number: { value: "INV-2026-0042" } } });
    };
  });

  it("forwards the supplier's file unchanged and returns the extraction result", async () => {
    const response = await fetch(`${apiUrl}/extract/invoice?role=supplier`, { method: "POST", body: upload() });

    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      extractor_version: "test", fields: { invoice_number: { value: "INV-2026-0042" } },
    });
    assert.match(received?.contentType ?? "", /^multipart\/form-data; boundary=/);
    assert.match(received?.body ?? "", /filename="invoice_0042.pdf"/);
    assert.match(received?.body ?? "", /%PDF-1.3 fictional invoice/);
  });

  it("lets only the supplier upload an invoice", async () => {
    const buyer = await fetch(`${apiUrl}/extract/invoice?role=buyer`, { method: "POST", body: upload() });
    assert.equal(buyer.status, 403);
    const nobody = await fetch(`${apiUrl}/extract/invoice?role=nobody`, { method: "POST", body: upload() });
    assert.equal(nobody.status, 400);
    assert.equal(received, null);
  });

  it("rejects uploads that are not multipart or are too large before calling the service", async () => {
    const json = await fetch(`${apiUrl}/extract/invoice?role=supplier`, {
      method: "POST", headers: { "content-type": "application/json" }, body: "{}",
    });
    assert.equal(json.status, 415);

    const big = new FormData();
    big.append("file", new Blob([new Uint8Array(11 * 1024 * 1024)]), "huge.pdf");
    const tooLarge = await fetch(`${apiUrl}/extract/invoice?role=supplier`, { method: "POST", body: big });
    assert.equal(tooLarge.status, 413);
    assert.deepEqual(await tooLarge.json(), { error: "File is larger than 10 MB." });
    assert.equal(received, null);
  });

  it("passes on the service's reason when it cannot read the document", async () => {
    handle = (_req, _body, res) => reply(res, 422, { detail: "No readable text found." });
    const response = await fetch(`${apiUrl}/extract/invoice?role=supplier`, { method: "POST", body: upload() });
    assert.equal(response.status, 422);
    assert.deepEqual(await response.json(), { error: "No readable text found." });
  });

  it("answers 502 without internal details when the service fails", async () => {
    handle = (_req, _body, res) => reply(res, 500, { detail: "Traceback: secret internals" });
    const response = await fetch(`${apiUrl}/extract/invoice?role=supplier`, { method: "POST", body: upload() });
    assert.equal(response.status, 502);
    assert.doesNotMatch(JSON.stringify(await response.json()), /Traceback/);
  });
});

describe("POST /extract/invoice with the service down", () => {
  it("answers 502", async () => {
    const app = express();
    app.use(extractionRouter("http://127.0.0.1:9"));
    const api = createServer(app);
    const apiUrl = await listen(api);
    try {
      const response = await fetch(`${apiUrl}/extract/invoice?role=supplier`, { method: "POST", body: upload() });
      assert.equal(response.status, 502);
      assert.match((await response.json()).error, /unavailable/);
    } finally {
      api.close();
    }
  });
});
