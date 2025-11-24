import mime from 'mime-types';

/**
 * Kunjungi: https://www.cloudsky.biz.id/
 */
 
export async function uploadFile(buffer, mimetype) {
    try {
        const fileKey = `kurumi-bot/${Date.now()}.${mime.extension(mimetype)}`;
        const fileSize = buffer.length;

        const presignResponse = await fetch('https://api.cloudsky.biz.id/get-upload-url', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileKey: fileKey,
                contentType: mimetype,
                fileSize: fileSize
            })
        });

        if (!presignResponse.ok) {
            throw new Error(`Failed to get presigned URL: ${await presignResponse.text()}`);
        }
        const { uploadUrl } = await presignResponse.json();
        if (!uploadUrl) {
            throw new Error('No uploadUrl received from API.');
        }

        const uploadResponse = await fetch(uploadUrl, {
            method: 'PUT',
            headers: {
                'Content-Type': mimetype,
                'x-amz-server-side-encryption': 'AES256'
            },
            body: buffer
        });
        
        if (!uploadResponse.ok) {
            throw new Error(`File upload failed: ${await uploadResponse.text()}`);
        }

        return `https://api.cloudsky.biz.id/file?key=${fileKey}`

    } catch (error) {
        console.error('CloudSky Upload Error:', error);
        throw new Error(`Gagal upload ke CloudSky: ${error.message}`);
    }
}