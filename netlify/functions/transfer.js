const fetch = require('node-fetch');

// CORS middleware to enable cross-origin requests
const allowCors = (fn) => async (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true);
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS,PATCH,DELETE,POST,PUT");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version"
  );

  // Handle OPTIONS request
  if (req.method === "OPTIONS") {
    res.status(200).end();
    return;
  }

  // Call the actual handler function
  return await fn(req, res);
};

// Main handler function
const handler = async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    // Extract data from request body
    const { fileName, mimeType, fileContent } = req.body;

    // Validate required fields
    if (!fileName || !mimeType || !fileContent) {
      return res.status(400).json({
        error: "Missing required fields",
        required: ["fileName", "mimeType", "fileContent"],
      });
    }

    // Decode base64 content
    const buffer = Buffer.from(fileContent, "base64");

    // Upload to transfer.sh
    const uploadResponse = await fetch(`https://transfer.sh/${fileName}`, {
      method: "PUT",
      body: buffer,
      headers: {
        "Content-Type": mimeType,
      },
    });

    // Check if upload was successful
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text();
      return res.status(uploadResponse.status).json({
        error: "Upload to transfer.sh failed",
        details: errorText,
      });
    }

    // Get the download URL from response
    const downloadUrl = await uploadResponse.text();

    // Return success response with download URL
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

// Export the handler with CORS middleware
export default allowCors(handler);
