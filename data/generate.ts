import { pick, seededRandom } from '@/lib/random';
import type { Account, AttackType, Dataset, Transaction } from '@/types';

const cities = [
  'Seattle, US',
  'Portland, US',
  'Vancouver, CA',
  'Tacoma, US',
  'Spokane, US',
  'Eugene, US',
  'Victoria, CA',
  'Boise, US',
];
const first = [
  'Maya',
  'Noah',
  'Priya',
  'Elias',
  'Sofia',
  'Kenji',
  'Amara',
  'Mateo',
  'Lina',
  'Owen',
  'Inez',
  'Theo',
];
const last = [
  'Chen',
  'Reyes',
  'Patel',
  'Morgan',
  'Okafor',
  'Sato',
  'Nguyen',
  'Bennett',
  'Silva',
  'Kaur',
  'Foster',
  'Kim',
];
const channels: Transaction['channel'][] = ['ACH', 'CARD', 'P2P', 'WIRE'];
const baseTime = Date.parse('2026-05-16T08:00:00Z');

function account(id: number, random: () => number): Account {
  const location = pick(cities, random).split(', ');
  const type: Account['type'] =
    id >= 112
      ? id < 116
        ? 'CASH_OUT'
        : 'EXCHANGE'
      : id % 17 === 0
        ? 'BUSINESS'
        : id % 13 === 0
          ? 'MERCHANT'
          : 'PERSONAL';
  return {
    id: `AC-${String(id + 1).padStart(4, '0')}`,
    name:
      type === 'PERSONAL'
        ? `${pick(first, random)} ${pick(last, random)}`
        : type === 'CASH_OUT'
          ? `Cash access ${location[0]}`
          : type === 'EXCHANGE'
            ? `Digital asset venue ${id - 115}`
            : `${pick(last, random)} ${type === 'BUSINESS' ? 'Services' : 'Market'}`,
    type,
    city: location[0]!,
    country: location[1]!,
    openedAt: new Date(
      baseTime - (45 + Math.floor(random() * 1400)) * 86400000,
    ).toISOString(),
    synthetic: true,
  };
}

export function generateDataset(seed = 240516): Dataset {
  const random = seededRandom(seed);
  const accounts = Array.from({ length: 120 }, (_, i) => account(i, random));
  const transactions: Transaction[] = [];
  const add = (
    sender: number,
    recipient: number,
    amount: number,
    minutes: number,
    scenario?: string,
    channel?: Transaction['channel'],
  ) => {
    transactions.push({
      id: `TX-${String(transactions.length + 1).padStart(5, '0')}`,
      senderId: accounts[sender]!.id,
      recipientId: accounts[recipient]!.id,
      amount: Math.round(amount * 100) / 100,
      timestamp: new Date(baseTime + minutes * 60000).toISOString(),
      channel: channel ?? pick(channels, random),
      location: `${accounts[sender]!.city}, ${accounts[sender]!.country}`,
      scenario,
    });
  };

  for (let i = 0; i < 620; i++) {
    const sender = Math.floor(random() * 105);
    let recipient = Math.floor(random() * 112);
    if (recipient === sender) recipient = (recipient + 7) % 112;
    const typical = sender % 17 === 0 ? 1900 : sender % 13 === 0 ? 420 : 86;
    const amount = Math.max(6, typical * (0.35 + random() * 1.45));
    add(
      sender,
      recipient,
      amount,
      Math.floor(random() * 60 * 24 * 28),
      undefined,
      pick(channels.slice(0, 3), random),
    );
  }

  // Coordinated mule funnel: victims 18–25 fund mules 82–85, then rapid cash-out.
  for (let i = 0; i < 8; i++)
    add(
      18 + i,
      82 + (i % 4),
      4200 + i * 317,
      30240 + i * 3,
      'Mule funnel',
      'P2P',
    );
  for (let i = 0; i < 4; i++) {
    add(82 + i, 90, 8200 + i * 420, 30270 + i * 2, 'Mule funnel', 'WIRE');
    add(
      90,
      112 + (i % 3),
      7600 + i * 390,
      30284 + i * 2,
      'Mule funnel',
      'WIRE',
    );
  }
  // Layered chain and circular return.
  add(44, 96, 18400, 32600, 'Layered transfers', 'WIRE');
  add(96, 97, 17650, 32607, 'Layered transfers', 'WIRE');
  add(97, 98, 16910, 32613, 'Layered transfers', 'WIRE');
  add(98, 99, 16180, 32618, 'Layered transfers', 'WIRE');
  add(99, 44, 14950, 32625, 'Circular transfer', 'WIRE');
  // Account takeover: novel geography, recipients, and drain burst.
  for (let i = 0; i < 6; i++)
    add(31, 106 + i, 2900 + i * 880, 35100 + i, 'Account takeover', 'WIRE');

  return {
    accounts,
    transactions: transactions.sort((a, b) =>
      a.timestamp.localeCompare(b.timestamp),
    ),
  };
}

export function generateAttack(
  dataset: Dataset,
  type: AttackType,
  nonce = 1,
): Transaction[] {
  const start =
    Math.max(...dataset.transactions.map((t) => Date.parse(t.timestamp))) +
    nonce * 3600000;
  const plans: Record<AttackType, Array<[number, number, number, number]>> = {
    'Money mule network': [
      [2, 84, 7800, 0],
      [7, 85, 6200, 2],
      [84, 91, 7500, 7],
      [85, 91, 5950, 8],
      [91, 113, 12800, 13],
    ],
    'Account takeover': [
      [27, 108, 9400, 0],
      [27, 109, 7200, 1],
      [27, 110, 6100, 2],
      [27, 114, 11200, 3],
    ],
    'Rapid fund drain': [
      [52, 111, 4600, 0],
      [52, 108, 5200, 1],
      [52, 109, 5800, 2],
      [52, 115, 6900, 3],
    ],
    'Layered transfers': [
      [62, 100, 21000, 0],
      [100, 101, 20200, 4],
      [101, 102, 19500, 8],
      [102, 116, 18700, 12],
    ],
    'Circular transfer network': [
      [70, 103, 13600, 0],
      [103, 104, 12800, 5],
      [104, 105, 12100, 10],
      [105, 70, 11300, 15],
    ],
  };
  return plans[type].map(([s, r, amount, minute], index) => ({
    id: `ATK-${nonce}-${index + 1}`,
    senderId: dataset.accounts[s]!.id,
    recipientId: dataset.accounts[r]!.id,
    amount,
    timestamp: new Date(start + minute * 60000).toISOString(),
    channel: 'WIRE',
    location: `${dataset.accounts[s]!.city}, ${dataset.accounts[s]!.country}`,
    scenario: type,
  }));
}
