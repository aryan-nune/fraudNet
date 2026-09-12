# FraudNet

**Follow the money. Find the network.**

FraudNet is a functional financial-crime investigation workspace for exploring transaction behavior and account relationships. It scores each transfer, explains the contributing signals, traces downstream money movement, and simulates the projected effect of blocking a suspicious destination. The bundled environment is entirely synthetic and opens without authentication or external configuration.

## The problem

Transaction-level rules can catch an unusually large payment while missing the structure around it: many victims funneling into a small set of mule accounts, funds moving through several layers in minutes, or money circling back to an originator. Investigators need both the event and the network.

FraudNet combines deterministic behavioral scoring with graph analysis. The dashboard surfaces the strongest computed cases, the investigation view explains the score, and **Follow the money** builds a trace from the same ledger used everywhere else in the product.

## Architecture

```text
Seeded generator → transaction ledger → risk engine → graph analysis → derived UI
                                             ↘ intervention simulation
                                             ↘ attack laboratory
```

- `data/` creates the canonical synthetic ledger.
- `lib/fraud-engine.ts` calculates per-transaction risk and suspicious accounts.
- `lib/network.ts` traces downstream paths, detects risky components, and models intervention impact.
- `hooks/` owns the in-browser demo state and injected attack transactions.
- `components/` contains the dashboard, graph, investigation, and attack-lab surfaces.
- `types/` defines the shared domain model.

There is one source of truth: accounts and transactions. Counts, totals, scores, explanations, chart series, graph edges, and simulations are derived from that source at runtime.

## Detection methodology

Each transaction receives a 0–100 score built from detected evidence. Signals include amount deviation from the sender’s history, one-hour velocity, first-time recipients, shifts in recent activity, rapid pass-through of recently received funds, circular directed paths, and contact with previously elevated transfers. Thresholds map the numeric score to low, medium, high, or critical risk. Explanations contain the observed values and are generated from the factors present on that transaction.

This is an explainable heuristic system designed for demonstration and education. It is not a trained model and is not suitable for autonomous production decisions.

## Network analysis

React Flow renders accounts as nodes and real ledger transactions as directed edges. A trace begins at the selected transaction and explores downstream transfers within a bounded time window. Connected-account count, flow value, suspicious nodes, suspicious transfers, hop depth, and network risk are calculated from the returned subgraph. Risky connected components provide the dashboard’s network count.

## Synthetic data

The generator uses a seeded pseudo-random sequence, so every clean run produces the same 120 accounts and more than 500 transactions. Normal consumer, merchant, business, ACH, card, and P2P behavior is mixed with transaction-backed mule funnels, rapid cash-out, layered transfers, circular flows, and account-takeover bursts. Names, dates, locations, and amounts are synthetic; no real banking data is collected.

The attack laboratory adds a selected scenario to the same data model. **Run FraudNet** then analyzes those created transactions with the normal engine—there are no predetermined attack results.

## Security practices

- No login, credentials, bank connection, database, or API key is needed.
- No secrets are bundled in client code or example configuration.
- Inputs are constrained to predefined attack types and TypeScript runs in strict mode.
- The app uses no `eval`, arbitrary code execution, unsafe HTML insertion, or user-supplied SQL.
- The UI labels all intervention results as synthetic projections.
- Only synthetic financial information is generated or displayed.

## Technology

Next.js-compatible Vinext, React 19, TypeScript, Tailwind CSS, React Flow (`@xyflow/react`), Recharts, Lucide, Vitest, and Cloudflare-compatible Sites tooling.

## Run locally

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Open the local URL printed by the development server. Additional verification commands:

```bash
npm test
npm run lint
npm run build
```

## Limitations

FraudNet uses heuristic thresholds and a compact in-memory dataset. It does not ingest live banking records, establish identity, retain cases between sessions, produce regulatory filings, or make claims that funds were saved. The graph trace is deliberately time- and depth-bounded for an interactive demo.

## Future improvements

Potential production work includes analyst feedback loops, temporal graph features, configurable policy rules, audited case persistence, role-based access controls, model calibration against consented labeled data, streaming ingestion, entity resolution, and human-approved intervention workflows.

## AI tools used

OpenAI Codex assisted development. See [AI_USAGE.md](./AI_USAGE.md) for the precise scope and disclosure.
