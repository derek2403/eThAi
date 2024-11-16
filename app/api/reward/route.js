import { Coinbase, Wallet } from "@coinbase/coinbase-sdk";

// Helper function to create and fund a new wallet
async function createAndFundWallet(coinbase) {
  const userWallet = await Wallet.create();
  
  try {
    const faucetTx = await userWallet.faucet();
    await faucetTx.wait();
  } catch (e) {
    console.log("Faucet error or already funded:", e);
  }
  
  return userWallet;
}

export default async function handler(req, res) {
  const { NEXT_PUBLIC_CDP_API_NAME, NEXT_PUBLIC_CDP_PRIVATE_KEY } = process.env;

  // Check if the environment variables are set
  if (!NEXT_PUBLIC_CDP_API_NAME || !NEXT_PUBLIC_CDP_PRIVATE_KEY) {
    return res.status(500).json({ error: "Environment variables are not set" });
  }

  if (req.method === 'GET') {
    try {
      const coinbase = new Coinbase({
        apiKeyName: NEXT_PUBLIC_CDP_API_NAME,
        privateKey: NEXT_PUBLIC_CDP_PRIVATE_KEY.replaceAll("\\n", "\n"),
      });

      const userWallet = await createAndFundWallet(coinbase);
      const balances = await userWallet.balances();
      const address = await userWallet.getDefaultAddress();

      return res.status(200).json({
        success: true,
        balance: balances?.eth || '0',
        address: address.getId()
      });

    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  if (req.method === 'POST') {
    const body = req.body;

    if (!body?.address) {
      return res.status(400).json({ error: "Address is required" });
    }

    try {
      const coinbase = new Coinbase({
        apiKeyName: NEXT_PUBLIC_CDP_API_NAME,
        privateKey: NEXT_PUBLIC_CDP_PRIVATE_KEY.replaceAll("\\n", "\n"),
      });

      const userWallet = await createAndFundWallet(coinbase);

      const baseReward = 0.00000001;
      const finalReward = baseReward * (body.contributionScore || 100) / 100;

      const transfer = await userWallet.createTransfer({
        amount: finalReward,
        assetId: "eth",
        destination: body.address,
      });

      await transfer.wait();

      return res.status(200).json({
        success: true,
        transactionHash: transfer?.getTransactionHash()?.substring(0, 10),
        transactionLink: transfer?.getTransactionLink(),
      });

    } catch (error) {
      console.error("API Error:", error);
      return res.status(500).json({ error: error.message || "Internal server error" });
    }
  }

  return res.status(405).json({ error: "Method not allowed" });
}