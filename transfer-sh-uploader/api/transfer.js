const fetch = require("node-fetch")

// CORS middleware to enable cross-origin requests
const enableCors = (req, res) => {
  // Set CORS headers
  res.setHeader("Access-Control-Allow-Credentials", true)
  res.setHeader("Access-Control-Allow-Origin", "*") 
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version",
  )

  // Handle OPTIONS method for preflight requests
  if (req.method === "OPTIONS") {
    res.status(200).end()
    return true
  }
  return false
}


// Main handler function
module.exports = async (req, res) => {
  // Handle CORS
  if (enableCors(req, res)) {
    return
  }

  try {
    // Handle POST request (file upload)
    if (req.method === "POST") {
      return await handleUpload(req, res)
    }

    // Handle DELETE request (file deletion)
    if (req.method === "DELETE") {
      return await handleDelete(req, res)
    }

    // Handle unsupported methods
    return res.status(405).json({ error: "Method not allowed" })
  } catch (error) {
    console.error("Error in transfer.sh proxy:", error)
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    })
  }
}

// Handle file upload to transfer.sh
async function handleUpload(req, res) {
  // Validate request body
  const { fileName, fileType, fileBase64 } = req.body

  if (!fileName || !fileType || !fileBase64) {
    return res.status(400).json({
      error: "Missing required fields",
      required: ["fileName", "fileType", "fileBase64"],
    })
  }

  try {
    // Decode base64 content
    const fileBuffer = Buffer.from(fileBase64, "base64")

    // Upload to transfer.sh
    const uploadResponse = await fetch(`https://transfer.sh/${encodeURIComponent(fileName)}`, {
      method: "PUT",
      body: fileBuffer,
      headers: {
        "Content-Type": fileType,
      },
    })

    // Check if upload was successful
    if (!uploadResponse.ok) {
      const errorText = await uploadResponse.text()
      return res.status(uploadResponse.status).json({
        error: "Upload to transfer.sh failed",
        details: errorText,
      })
    }

    // Get the download URL from response
    const downloadUrl = (await uploadResponse.text()).trim()

    // Parse response to extract deletion URL if available
    // Note: transfer.sh may not always return a deletion URL in the response
    let deletionUrl = null

    // Some versions of transfer.sh return a deletion URL in headers
    const transferDeleteHeader = uploadResponse.headers.get("x-url-delete")
    if (transferDeleteHeader) {
      deletionUrl = transferDeleteHeader
    }

    // Return success response with download URL and deletion URL if available
    return res.status(200).json({
      downloadUrl,
      deletionUrl,
    })
  } catch (error) {
    console.error("Error uploading file:", error)
    return res.status(500).json({
      error: "File upload failed",
      message: error.message,
    })
  }
}

// Handle file deletion from transfer.sh
async function handleDelete(req, res) {
  // Validate request body
  const { deletionUrl } = req.body

  if (!deletionUrl) {
    return res.status(400).json({
      error: "Missing required field",
      required: ["deletionUrl"],
    })
  }

  try {
    // Send delete request to transfer.sh
    const deleteResponse = await fetch(deletionUrl, {
      method: "DELETE",
    })

    // Check if deletion was successful
    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text()
      return res.status(deleteResponse.status).json({
        error: "Deletion from transfer.sh failed",
        details: errorText,
      })
    }

    // Return success response
    return res.status(200).json({
      success: true,
      message: "File deleted successfully",
    })
  } catch (error) {
    console.error("Error deleting file:", error)
    return res.status(500).json({
      error: "File deletion failed",
      message: error.message,
    })
  }
}
