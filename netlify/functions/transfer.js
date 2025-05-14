const fetch = require("node-fetch");

exports.handler = async function (event, context) {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET,OPTIONS,PATCH,DELETE,POST,PUT",
    "Access-Control-Allow-Headers":
      "X-CSRF-Token, X-Requested-With, Accept, Content-Type, Date",
  };

  // CORS preflight
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: "",
    };
  }

  // ✅ GET — ping check
  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify({
        message: "Transfer.sh proxy is live 🚀",
        usage: {
          PUT: "/.netlify/functions/transfer {fileName, mimeType, fileContent (base64)}",
          DELETE: "/.netlify/functions/transfer?url=<download_url> (simulated)",
        },
      }),
    };
  }

  // ✅ DELETE — Delete file from Transfer.sh using the download URL
  if (event.httpMethod === "DELETE") {
    const urlToDelete = event.queryStringParameters?.url;
    if (!urlToDelete) {
      return {
        statusCode: 400,
        headers: corsHeaders,
        body: JSON.stringify({ error: "Missing 'url' query param for deletion" }),
      };
    }

    try {
      // Send DELETE request to Transfer.sh
      const deleteResponse = await fetch(urlToDelete, {
        method: "DELETE",
      });

      if (!deleteResponse.ok) {
        const errorText = await deleteResponse.text();
        console.error('Error deleting file from Transfer.sh:', errorText);
        return {
          statusCode: deleteResponse.status,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "Delete failed on Transfer.sh",
            details: errorText,
          }),
        };
      }

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: "File deleted successfully.",
        }),
      };
    } catch (error) {
      console.error("Delete error:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
      };
    }
  }

  // ✅ PUT — upload to Transfer.sh
  if (event.httpMethod === "PUT") {
    try {
      const { fileName, mimeType, fileContent } = JSON.parse(event.body);

      if (!fileName || !mimeType || !fileContent) {
        return {
          statusCode: 400,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "Missing required fields",
            required: ["fileName", "mimeType", "fileContent"],
          }),
        };
      }

      const buffer = Buffer.from(fileContent, "base64");

      // Upload file to transfer.sh using PUT method
      console.log(`Uploading file: ${fileName} to Transfer.sh`);
      const uploadResponse = await fetch(`https://transfer.sh/${fileName}`, {
        method: "PUT",
        body: buffer,
        headers: {
          "Content-Type": mimeType,
          "Max-Downloads": "1", // file will auto-delete after 1 download
          "Max-Days": "1",       // or after 1 day
        },
      });

      // If upload fails, return error response
      if (!uploadResponse.ok) {
        const errorText = await uploadResponse.text();
        console.error('Error uploading to Transfer.sh:', errorText);
        return {
          statusCode: uploadResponse.status,
          headers: corsHeaders,
          body: JSON.stringify({
            error: "Upload to transfer.sh failed",
            details: errorText,
          }),
        };
      }

      // Extract the download URL from the response
      const downloadUrl = await uploadResponse.text();

      console.log(`Upload successful: ${downloadUrl}`);

      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          downloadUrl: downloadUrl.trim(),
        }),
      };
    } catch (error) {
      console.error("Upload error:", error);
      return {
        statusCode: 500,
        headers: corsHeaders,
        body: JSON.stringify({
          error: "Internal server error",
          message: error.message,
        }),
      };
    }
  }

  // ❌ Fallback for unsupported methods
  return {
    statusCode: 405,
    headers: corsHeaders,
    body: JSON.stringify({ error: "Method not allowed" }),
  };
};
