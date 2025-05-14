const fetch = require('node-fetch');

// CORS middleware to enable cross-origin requests
const allowCors = (fn) => async (req, res) => {
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader("Access-Control-Allow-Headers", "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Date");

  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  return await fn(req, res);
};

// Main handler function
const handler = async (req, res) => {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { fileName, mimeType, fileContent } = req.body;

    if (!fileName || !mimeType || !fileContent) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["fileName", "mimeType", "fileContent"],
      });
    }

    // Decode base64 content
    const buffer = Buffer.from(fileContent, "base64");

    const uploadResponse = await fetch(`https://transfer.sh/${fileName}`, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": mimeType,
      },
    });

    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return res.status(uploadResponse.status).json({
        error: "Upload to transfer.sh failed",
        details: errorText,
      });
    }

    const downloadUrl = await uploadResponse.text();

    return res.status(200).json({
      success: true,
      downloadUrl: downloadUrl.trim(),
    });
  } catch (error) {
    console.error("Error processing upload:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
};

module.exports.handler = allowCors(handler);
