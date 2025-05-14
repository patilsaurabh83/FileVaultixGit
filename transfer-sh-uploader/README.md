# Transfer.sh Proxy API

A serverless API that acts as a CORS-enabled proxy for uploading and deleting files on [transfer.sh](https://transfer.sh).

## API Endpoints

### Upload a File

`POST /api/transfer`

#### Request Body

\`\`\`json
{
  "fileName": "example.pdf",
  "fileType": "application/pdf",
  "fileBase64": "JVBERi0xLjMKJcTl8uXrp/Og0MTGCjQgMCBvY..." // Base64 encoded file content
}
\`\`\`

#### Response

\`\`\`json
{
  "downloadUrl": "https://transfer.sh/abc123/example.pdf",
  "deletionUrl": "https://transfer.sh/abc123/example.pdf/abc123" // May not always be available
}
\`\`\`

### Delete a File

`DELETE /api/transfer`

#### Request Body

\`\`\`json
{
  "deletionUrl": "https://transfer.sh/abc123/example.pdf/abc123"
}
\`\`\`

#### Response

\`\`\`json
{
  "success": true,
  "message": "File deleted successfully"
}
\`\`\`

## CORS Support

This API supports CORS for any domain, making it suitable for use in browser-based applications.

## Deployment

This project is ready to be deployed on Vercel without any additional configuration.

## Usage Example

\`\`\`javascript
// Upload example
async function uploadFile(file) {
  const reader = new FileReader();
  
  reader.onload = async function(e) {
    const base64Content = e.target.result.split(',')[1];
    
    const response = await fetch('https://your-project.vercel.app/api/transfer', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        fileName: file.name,
        fileType: file.type,
        fileBase64: base64Content
      }),
    });
    
    const data = await response.json();
    console.log('Download URL:', data.downloadUrl);
    console.log('Deletion URL:', data.deletionUrl);
  };
  
  reader.readAsDataURL(file);
}

// Delete example
async function deleteFile(deletionUrl) {
  const response = await fetch('https://your-project.vercel.app/api/transfer', {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deletionUrl: deletionUrl
    }),
  });
  
  const data = await response.json();
  console.log('Deletion result:', data);
}
