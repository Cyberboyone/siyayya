import { VercelRequest, VercelResponse } from '@vercel/node';
import { v2 as cloudinary } from 'cloudinary';

// Initialize Cloudinary
const configureCloudinary = () => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME || 'dak8hpg0f';
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!apiKey || !apiSecret || apiKey === 'your-cloudinary-api-key') {
    console.warn('Cloudinary API credentials are not properly configured.');
    return null;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret,
    secure: true
  });
  
  return cloudinary;
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { public_id, resource_type = 'image' } = req.body;

  if (!public_id) {
    return res.status(400).json({ error: 'Missing public_id' });
  }

  const configuredCloudinary = configureCloudinary();
  if (!configuredCloudinary) {
    return res.status(503).json({ 
      error: 'Cloudinary not configured', 
      message: 'Server-side Cloudinary credentials are missing or invalid.' 
    });
  }

  try {
    console.log(`Deleting from Cloudinary: ${public_id} (${resource_type})`);
    
    const result = await configuredCloudinary.uploader.destroy(public_id, {
      resource_type: resource_type,
      invalidate: true
    });

    if (result.result === 'ok' || result.result === 'not_found') {
      return res.status(200).json({ success: true, result: result.result });
    } else {
      console.error('Cloudinary deletion failed:', result);
      return res.status(500).json({ error: 'Cloudinary deletion failed', details: result });
    }
  } catch (error: any) {
    console.error('Cloudinary deletion error:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
}
