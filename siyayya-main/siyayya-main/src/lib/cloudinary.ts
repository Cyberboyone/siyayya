export interface CloudinaryResponse {
  secure_url: string;
  public_id: string;
  resource_type: string;
}

export const CLOUDINARY_CLOUD_NAME =
  import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dak8hpg0f";

export const CLOUDINARY_UPLOAD_PRESET =
  import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "siyayya.com";

export async function uploadToCloudinary(file: File): Promise<CloudinaryResponse> {
  const resourceType = file.type.startsWith('video/') ? 'video' : 'image';
  const url = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/${resourceType}/upload`;
  
  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

  try {
    const response = await fetch(url, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `Server error ${response.status}`);
      } catch {
        throw new Error(`Request failed (${response.status})`);
      }
    }

    const data = await response.json();
    return {
      secure_url: data.secure_url,
      public_id: data.public_id,
      resource_type: data.resource_type
    };
  } catch (error) {
    console.error('Cloudinary upload error:', error);
    throw error;
  }
}

/**
 * Note: Direct client-side deletion from Cloudinary requires Cloudinary API Key/Secret
 * which shouldn't be exposed on the frontend. This function calls a secure backend endpoint.
 */
export async function deleteFromCloudinary(publicId: string, resourceType: string = 'image'): Promise<boolean> {
  if (!publicId) return false;

  console.log(`Attempting to delete Cloudinary asset: ${publicId} (${resourceType})`);
  
  try {
    const response = await fetch('/api/cloudinary/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    });

    if (!response.ok) {
      return false; // Safely return false if the backend isn't there
    }

    return response.ok;
  } catch (error) {
    console.error('Error calling deletion API:', error);
    return false;
  }
}
