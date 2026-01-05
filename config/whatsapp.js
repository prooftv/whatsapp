import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const WHATSAPP_API_URL = `https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_ID}`;

export const whatsappAPI = axios.create({
  baseURL: WHATSAPP_API_URL,
  headers: {
    'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
    'Content-Type': 'application/json'
  }
});

export const sendMessage = async (to, message) => {
  try {
    const response = await whatsappAPI.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      ...message
    });
    return response.data;
  } catch (error) {
    console.error('WhatsApp send error:', error.response?.data || error.message);
    throw error;
  }
};

export const getMedia = async (mediaId) => {
  try {
    const response = await axios.get(`https://graph.facebook.com/v18.0/${mediaId}`, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` }
    });
    return response.data;
  } catch (error) {
    console.error('Media fetch error:', error.response?.data || error.message);
    throw error;
  }
};

export const downloadMedia = async (mediaUrl) => {
  try {
    const response = await axios.get(mediaUrl, {
      headers: { 'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}` },
      responseType: 'stream'
    });
    return response.data;
  } catch (error) {
    console.error('Media download error:', error.response?.data || error.message);
    throw error;
  }
};

export const sendWhatsAppMessage = async (to, message, mediaUrls = []) => {
  try {
    // Send text message
    const textResponse = await whatsappAPI.post('/messages', {
      messaging_product: 'whatsapp',
      to,
      type: 'text',
      text: { body: message }
    });
    
    // Send media if provided
    for (const mediaUrl of mediaUrls) {
      try {
        const mediaType = getMediaType(mediaUrl);
        await whatsappAPI.post('/messages', {
          messaging_product: 'whatsapp',
          to,
          type: mediaType,
          [mediaType]: { link: mediaUrl }
        });
      } catch (mediaError) {
        console.error('Media send error:', mediaError.message);
        // Continue with other media files
      }
    }
    
    return textResponse.data;
  } catch (error) {
    console.error('WhatsApp broadcast error:', error.response?.data || error.message);
    throw error;
  }
};

function getMediaType(url) {
  const ext = url.split('.').pop().toLowerCase();
  if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext)) return 'image';
  if (['mp4', 'webm', '3gp'].includes(ext)) return 'video';
  if (['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(ext)) return 'audio';
  return 'document';
}