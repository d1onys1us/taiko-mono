const { ethers } = require("ethers");
const { Defender } = require("@openzeppelin/defender-sdk");

const ABI = [
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: "bool",
        name: "enabled",
        type: "bool",
      },
    ],
    name: "ProvingAutoPauseEnabled",
    type: "event",
  },
];

function alertOrg(notificationClient, message) {
  notificationClient.send({
    channelAlias: "discord_bridging",
    subject: "⚠️ GuardianProver: ProvingAutoPauseEnabled Alert",
    message,
  });
  notificationClient.send({
    channelAlias: "tg_taiko_guardians",
    subject: "⚠️ GuardianProver: ProvingAutoPauseEnabled Alert",
    message,
  });
}

async function getLatestBlockNumber(provider) {
  const currentBlock = await provider.getBlock("latest");
  return currentBlock.number;
}

async function fetchLogsFromL1(
  eventName,
  fromBlock,
  toBlock,
  address,
  abi,
  provider,
) {
  const iface = new ethers.utils.Interface(abi);
  const eventTopic = iface.getEventTopic(eventName);

  try {
    const logs = await provider.getLogs({
      address,
      fromBlock,
      toBlock,
      topics: [eventTopic],
    });

    return logs.map((log) =>
      iface.decodeEventLog(eventName, log.data, log.topics),
    );
  } catch (error) {
    console.error(`Error fetching logs for ${eventName}:`, error);
    return [];
  }
}

function createProvider(apiKey, apiSecret, relayerApiKey, relayerApiSecret) {
  const client = new Defender({
    apiKey,
    apiSecret,
    relayerApiKey,
    relayerApiSecret,
  });

  return client.relaySigner.getProvider();
}

async function calculateBlockTime(provider) {
  const latestBlock = await provider.getBlock("latest");
  const previousBlock = await provider.getBlock(latestBlock.number - 100);

  const timeDiff = latestBlock.timestamp - previousBlock.timestamp;
  const blockDiff = latestBlock.number - previousBlock.number;

  const blockTime = timeDiff / blockDiff;
  return blockTime;
}

exports.handler = async function (event, context) {
  const { notificationClient } = context;
  const { apiKey, apiSecret, taikoL1ApiKey, taikoL1ApiSecret } = event.secrets;

  const taikoL1Provider = createProvider(
    apiKey,
    apiSecret,
    taikoL1ApiKey,
    taikoL1ApiSecret,
  );

  const currentBlockNumber = await getLatestBlockNumber(taikoL1Provider);
  const blockTimeInSeconds = await calculateBlockTime(taikoL1Provider);
  const blocksInFiveMinutes = Math.floor((5 * 60) / blockTimeInSeconds);

  const fromBlock = currentBlockNumber - blocksInFiveMinutes;
  const toBlock = currentBlockNumber;

  const logs = await fetchLogsFromL1(
    "ProvingAutoPauseEnabled",
    fromBlock,
    toBlock,
    "0xE3D777143Ea25A6E031d1e921F396750885f43aC",
    ABI,
    taikoL1Provider,
  );

  console.log(`Logs found: ${logs.length}`);

  if (logs.length > 0) {
    logs.forEach((log) => {
      const enabled = log.enabled;
      const status = enabled ? "ENABLED" : "DISABLED";
      const message = `Proving Auto-Pause has been ${status}.\n\nDetails:\n- Enabled: ${enabled}\n- Block Number: ${log.blockNumber}`;
      alertOrg(notificationClient, message);
    });
  }

  return true;
};
